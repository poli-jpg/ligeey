import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { fermerDemande } from "@/actions/mise-en-relation";
import { deconnexion } from "@/actions/auth";
import { BarreNav } from "@/components/BarreNav";
import { Entete, Pastille, Titre2, Vide } from "@/components/ui";

export const metadata: Metadata = { title: "Mes demandes" };

const STATUT = {
  ouverte: { texte: "Ouverte", ton: "vert" },
  pourvue: { texte: "Pourvue", ton: "chantier" },
  fermee: { texte: "Fermée", ton: "gris" },
} as const;

export default async function MesDemandes({ searchParams }: { searchParams: Promise<{ envoyee?: string }> }) {
  const { envoyee } = await searchParams;
  const { supabase, user, profil } = await getSession();
  if (!user) redirect("/connexion?suite=/devis");

  const { data: demandes } = await supabase
    .from("demandes")
    .select("id, description, urgence, statut, created_at, metier:metiers(nom), quartier:quartiers(nom), conversations(count)")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <Entete titre="Mes demandes" />
      <main className="flex flex-col gap-4 px-4 pt-4 pb-4">
        {envoyee ? (
          <p className="rounded-2xl bg-vert-clair p-4 text-sm font-semibold text-vert">
            Demande publiée. Les artisans du métier peuvent maintenant vous faire une offre.
          </p>
        ) : null}
        <Link href="/devis/nouvelle" className="bouton">Publier une demande de devis</Link>

        <Titre2>Historique</Titre2>
        {!demandes?.length ? <Vide>Vous n&apos;avez pas encore publié de demande.</Vide> : null}
        {demandes?.map((d) => {
          const s = STATUT[d.statut as keyof typeof STATUT];
          const reponses = (d.conversations as unknown as { count: number }[])[0]?.count ?? 0;
          return (
            <article key={d.id} className="flex flex-col gap-2 rounded-2xl border border-trait bg-carte p-3.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold">{(d.metier as unknown as { nom: string }).nom}</h3>
                <Pastille ton={s.ton}>{s.texte}</Pastille>
              </div>
              <p className="line-clamp-2 text-sm text-gris">{d.description}</p>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-gris">
                  {(d.quartier as unknown as { nom: string }).nom} · {reponses} réponse{reponses > 1 ? "s" : ""}
                </span>
                {d.statut === "ouverte" ? (
                  <form action={fermerDemande}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="font-semibold text-nuit">Fermer</button>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}

        {profil ? (
          <form action={deconnexion} className="pt-4">
            <button className="bouton-secondaire w-full">Se déconnecter</button>
          </form>
        ) : null}
      </main>
      <BarreNav role={profil?.role} />
    </>
  );
}
