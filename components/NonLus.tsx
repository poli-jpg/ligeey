"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Etat = { total: number; parConversation: Record<string, number> };

/**
 * Messages non lus de l'utilisateur, tenus à jour en temps réel :
 * - pastille rouge sur l'onglet « Messages » ;
 * - pastille sur l'icône de l'appli installée (Android / ordinateur) ;
 * - bandeau « Nouveau message » quand un message arrive pendant qu'on est ailleurs dans l'appli.
 */
export function useNonLus() {
  const [etat, setEtat] = useState<Etat>({ total: 0, parConversation: {} });
  const [alerte, setAlerte] = useState<{ conversation: string; texte: string } | null>(null);
  const chemin = usePathname();
  const cheminRef = useRef(chemin);
  useEffect(() => {
    cheminRef.current = chemin;
  }, [chemin]);

  useEffect(() => {
    const supabase = createClient();
    let moi: string | null = null;
    let actif = true;

    async function charger() {
      const { data, error } = await supabase.rpc("mes_non_lus");
      if (error || !actif) return;
      const parConversation = Object.fromEntries((data ?? []).map((l: { conversation_id: string; nb: number }) => [l.conversation_id, l.nb]));
      const total = Object.values(parConversation).reduce((a: number, b) => a + (b as number), 0);
      setEtat({ total, parConversation });
      // Pastille sur l'icône de l'appli installée (si le téléphone le permet)
      const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
      if (total > 0) nav.setAppBadge?.(total).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    }

    const canal = supabase.channel("non-lus");
    supabase.auth.getSession().then(({ data }) => {
      moi = data.session?.user.id ?? null;
      if (!moi || !actif) return;
      charger();
      // Notifications déjà autorisées sur ce téléphone : on le rattache au compte connecté
      if ("Notification" in window && Notification.permission === "granted") {
        navigator.serviceWorker?.getRegistration().then((reg) => reg?.pushManager.getSubscription()).then((abo) => {
          if (!abo) return;
          const j = abo.toJSON();
          supabase.rpc("enregistrer_abonnement", { p_endpoint: abo.endpoint, p_p256dh: j.keys?.p256dh ?? "", p_auth: j.keys?.auth ?? "" }).then(() => {});
        });
      }
      canal
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
          const m = p.new as { auteur_id: string; conversation_id: string; type: string; contenu: string | null };
          if (m.auteur_id === moi) return;
          charger();
          // Pas de bandeau si on lit déjà cette conversation
          if (cheminRef.current !== `/messages/${m.conversation_id}`) {
            const texte = m.type === "offre" ? "Vous avez reçu un devis" : m.type === "image" ? "📷 Photo" : m.type === "vocal" ? "🎤 Message vocal" : (m.contenu ?? "").slice(0, 80);
            setAlerte({ conversation: m.conversation_id, texte });
          }
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => charger())
        .subscribe();
    });

    // En revenant sur l'appli, on remet le compteur à jour
    const auRetour = () => document.visibilityState === "visible" && moi && charger();
    document.addEventListener("visibilitychange", auRetour);

    return () => {
      actif = false;
      document.removeEventListener("visibilitychange", auRetour);
      supabase.removeChannel(canal);
    };
  }, []);

  // Le bandeau disparaît tout seul
  useEffect(() => {
    if (!alerte) return;
    const t = setTimeout(() => setAlerte(null), 6000);
    return () => clearTimeout(t);
  }, [alerte]);

  return { ...etat, alerte, fermerAlerte: () => setAlerte(null) };
}

export function PastilleNonLus({ n, className = "" }: { n: number; className?: string }) {
  if (!n) return null;
  return (
    <span
      aria-label={`${n} non lu${n > 1 ? "s" : ""}`}
      className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-extrabold text-white ${className}`}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function AlerteMessage({ alerte, fermer }: { alerte: { conversation: string; texte: string } | null; fermer: () => void }) {
  if (!alerte) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 mx-auto max-w-md px-3 pt-[max(env(safe-area-inset-top),10px)]">
      <Link
        href={`/messages/${alerte.conversation}`}
        onClick={fermer}
        className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-trait"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-chantier text-lg">💬</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[13px] font-extrabold">Nouveau message</span>
          <span className="truncate text-sm text-gris">{alerte.texte}</span>
        </span>
        <span className="text-[13px] font-bold text-nuit">Ouvrir</span>
      </Link>
    </div>
  );
}
