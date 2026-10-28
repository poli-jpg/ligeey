import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { note } from "@/lib/format";
import { repondreDemande } from "@/actions/mise-en-relation";
import { BarreNav } from "@/components/BarreNav";
import { InstallerApp } from "@/components/InstallerApp";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { Avatar, Pastille, Titre2, Vide } from "@/components/ui";
import { Disponibilite } from "./Disponibilite";

export const metadata: Metadata = { title: "Mon activité" };

const URGENCE = {
  urgent: { texte: "Urgent", ton: "chantier" },
  semaine: { texte: "Cette semaine", ton: "gris" },
  flexible: { texte: "Flexible", ton: "gris" },
} as const;

export default async function EspaceArtisan({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  const { supabase, user, profil } = await getSession();
  if (!user) redirect("/connexion?suite=/espace");

  const { data: artisan } = await supabase
    .from("artisans")
    .select("id, metier, disponible, verification, note_moyenne, nb_avis, nb_missions")
    .eq("id", user.id)
    .maybeSingle();
  if (!artisan) redirect("/espace/profil?nouveau=1");

  // La RLS ne renvoie que les demandes ouvertes du métier de l'artisan
  const [{ data: demandes }, { data: dejaRepondu }, { count: enCours }] = await Promise.all([
    supabase
      .from("demandes")
      .select("id, client_id, description, budget, urgence, photos, created_at, quartier:quartiers(nom)")
      .eq("statut", "ouverte")
      .eq("metier", artisan.metier)
      .neq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("conversations").select("demande_id").eq("artisan_id", user.id).not("demande_id", "is", null),
    supabase.from("offres").select("id", { count: "exact", head: true }).eq("artisan_id", user.id).eq("statut", "acceptee"),
  ]);
  const repondues = new Set((dejaRepondu ?? []).map((c) => c.demande_id));
  const prenom = profil?.nom_complet.split(" ")[0];

  return (
    <>
      <header className="flex flex-col gap-4 bg-nuit px-5 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-slate-300">Bonjour {prenom},</span>
            <h1 className="font-titre text-[22px] font-bold text-white">Votre activité</h1>
          </div>
          <Link href={`/artisans/${user.id}`} aria-label="Voir mon profil public">
            <Avatar nom={profil?.nom_complet ?? ""} />
          </Link>
        </div>
        <Disponibilite disponible={artisan.disponible} />
      </header>

      <main className="flex flex-col gap-4 px-5 pt-4 pb-28">
        {artisan.verification !== "verifie" ? (
          <Link href="/espace/profil#verification" className="flex items-center justify-between gap-3 rounded-2xl border border-[#bfe3cc] bg-vert-clair p-3.5">
            <span className="text-sm font-bold text-green-900">
              {artisan.verification === "en_attente" ? "Vérification en cours…" : "Obtenez le badge Vérifié"}
            </span>
            <span className="text-[13px] font-semibold text-vert">{artisan.verification === "en_attente" ? "" : "Commencer"}</span>
          </Link>
        ) : null}

        <InstallerApp />

        <div className="grid grid-cols-3 gap-2">
          {[
            [artisan.nb_avis ? note(artisan.note_moyenne) : "—", "Note"],
            [String(enCours ?? 0), "En cours"],
            [String(artisan.nb_missions), "Terminées"],
          ].map(([v, l]) => (
            <div key={l} className="flex flex-col gap-0.5 rounded-2xl border border-trait bg-carte p-3">
              <span className="font-titre text-xl font-bold">{v}</span>
              <span className="text-xs text-gris">{l}</span>
            </div>
          ))}
        </div>

        <Titre2>Demandes près de vous</Titre2>
        {erreur ? <Pastille ton="ambre">Cette demande n&apos;est plus disponible.</Pastille> : null}
        {!demandes?.length ? <Vide>Aucune demande ouverte pour votre métier en ce moment.</Vide> : null}
        {demandes?.map((d) => {
          const u = URGENCE[d.urgence as keyof typeof URGENCE];
          const deja = repondues.has(d.id);
          return (
            <article key={d.id} className="flex flex-col gap-2.5 rounded-2xl border border-trait bg-carte p-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[15px] leading-snug font-bold">{d.description}</p>
                <Pastille ton={u.ton}>{u.texte}</Pastille>
              </div>
              <p className="text-[13px] text-gris">
                {(d.quartier as unknown as { nom: string }).nom}
                {d.budget ? ` · budget ${d.budget.toLocaleString("fr-FR")} FCFA` : " · budget non précisé"}
              </p>
              <form action={repondreDemande}>
                <input type="hidden" name="demande_id" value={d.id} />
                <input type="hidden" name="client_id" value={d.client_id} />
                <BoutonEnvoi className={deja ? "bouton-secondaire w-full" : "bouton min-h-11 w-full text-sm"} enCours="Ouverture…">
                  {deja ? "Voir la conversation" : "Faire une offre"}
                </BoutonEnvoi>
              </form>
            </article>
          );
        })}
      </main>
      <BarreNav role="artisan" />
    </>
  );
}
