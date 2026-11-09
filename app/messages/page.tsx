import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { quand } from "@/lib/format";
import { PastilleNonLus } from "@/components/NonLus";
import { ActiverNotifications } from "@/components/ActiverNotifications";
import { BarreNav } from "@/components/BarreNav";
import { Avatar, Entete, Vide } from "@/components/ui";

export const metadata: Metadata = { title: "Messages" };

type Ligne = {
  id: string;
  client_id: string;
  artisan_id: string;
  dernier_message_at: string;
  client: { nom_complet: string } | null;
  artisan: { profil: { nom_complet: string } | null } | null;
  demande: { description: string } | null;
};

export default async function Messages() {
  const { supabase, user, profil } = await getSession();
  if (!user) redirect("/connexion?suite=/messages");

  const [{ data }, { data: nonLus }] = await Promise.all([
    supabase
    .from("conversations")
    .select(
      `id, client_id, artisan_id, dernier_message_at,
       client:profiles!conversations_client_id_fkey(nom_complet),
       artisan:artisans!conversations_artisan_id_fkey(profil:profiles!artisans_id_fkey(nom_complet)),
       demande:demandes(description)`,
    )
    .order("dernier_message_at", { ascending: false })
    .limit(50),
    supabase.rpc("mes_non_lus"),
  ]);
  const aLire = Object.fromEntries(((nonLus ?? []) as { conversation_id: string; nb: number }[]).map((l) => [l.conversation_id, l.nb]));

  const conversations = (data ?? []) as unknown as Ligne[];

  return (
    <>
      <Entete titre="Messages" />
      <div className="px-4 pt-4 empty:hidden">
        <ActiverNotifications pourArtisan={profil?.role === "artisan"} />
      </div>
      <main className={conversations.length ? "mt-3 flex flex-col bg-carte" : "px-4 pt-5"}>
        {conversations.length === 0 ? (
          <Vide>Aucune conversation. Contactez un artisan depuis son profil pour commencer.</Vide>
        ) : null}
        {conversations.map((c) => {
          const jeSuisClient = c.client_id === user.id;
          const nom = (jeSuisClient ? c.artisan?.profil?.nom_complet : c.client?.nom_complet) ?? "Utilisateur";
          const n = aLire[c.id] ?? 0;
          return (
            <Link key={c.id} href={`/messages/${c.id}`} className="flex items-center gap-3 pl-4 active:bg-fond">
              <Avatar nom={nom} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 border-b border-trait py-3.5 pr-4">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate text-[16px] ${n ? "font-extrabold" : "font-bold"}`}>{nom}</span>
                  <span className={`shrink-0 text-xs ${n ? "font-bold text-red-600" : "text-gris"}`}>{quand(c.dernier_message_at)}</span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate text-sm ${n ? "font-semibold text-encre" : "text-gris"}`}>
                    {n ? `${n} nouveau${n > 1 ? "x" : ""} message${n > 1 ? "s" : ""}` : c.demande ? `Devis : ${c.demande.description}` : jeSuisClient ? "Artisan" : "Client"}
                  </span>
                  <PastilleNonLus n={n} />
                </span>
              </span>
            </Link>
          );
        })}
      </main>
      <BarreNav role={profil?.role} />
    </>
  );
}
