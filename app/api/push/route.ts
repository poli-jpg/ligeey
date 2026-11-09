import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { CLE_PUBLIQUE_PUSH } from "@/lib/push";

/**
 * Envoi des notifications sur les téléphones.
 * Appelée UNIQUEMENT par la base Supabase (triggers), avec la clé secrète
 * partagée PUSH_SECRET. La base fournit déjà les destinataires et le texte :
 * cette route ne lit aucune donnée, elle signe et transmet.
 */
export const runtime = "nodejs";

type Envoi = { endpoint: string; p256dh: string; auth: string };
type Corps = { envois: Envoi[]; titre: string; corps: string; url: string; tag?: string };

function cleValide(recue: string | null) {
  const attendue = process.env.PUSH_SECRET;
  if (!attendue || !recue) return false;
  const a = Buffer.from(recue), b = Buffer.from(attendue);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!cleValide(req.headers.get("x-ligeey-cle"))) return new Response("Refusé", { status: 401 });

  const prive = process.env.VAPID_PRIVATE_KEY;
  if (!prive) return new Response("Notifications non configurées", { status: 503 });
  webpush.setVapidDetails("https://ligeey-nu.vercel.app", CLE_PUBLIQUE_PUSH, prive);

  let d: Corps;
  try {
    d = await req.json();
  } catch {
    return new Response("Requête invalide", { status: 400 });
  }
  if (!Array.isArray(d.envois) || !d.titre) return new Response("Requête invalide", { status: 400 });

  // Lien interne seulement
  const url = typeof d.url === "string" && d.url.startsWith("/") && !d.url.startsWith("//") ? d.url : "/";
  const charge = JSON.stringify({ titre: d.titre, corps: d.corps ?? "", url, tag: d.tag });

  const expires: string[] = [];
  await Promise.all(
    d.envois.slice(0, 500).map(async (e) => {
      try {
        await webpush.sendNotification(
          { endpoint: e.endpoint, keys: { p256dh: e.p256dh, auth: e.auth } },
          charge,
          { TTL: 24 * 3600, urgency: "high", topic: d.tag?.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || undefined },
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        // 404 / 410 : le téléphone n'est plus abonné (appli désinstallée, navigateur réinitialisé…)
        if (code === 404 || code === 410) expires.push(e.endpoint);
        else console.error("push", code, (err as Error).message);
      }
    }),
  );

  if (expires.length) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await Promise.all(expires.map((endpoint) => supabase.rpc("abonnement_expire", { p_endpoint: endpoint, p_secret: process.env.PUSH_SECRET })));
  }

  return Response.json({ envoyes: d.envois.length - expires.length, expires: expires.length });
}
