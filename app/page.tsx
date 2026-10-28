import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import { chargerReferentiels } from "@/lib/referentiels";
import type { ArtisanRecherche } from "@/lib/types";
import { BarreNav } from "@/components/BarreNav";
import { CarteArtisan } from "@/components/CarteArtisan";
import { IconeLieu, IconeRecherche } from "@/components/Icones";
import { Titre2, Vide } from "@/components/ui";

export default async function Accueil() {
  const { supabase, profil } = await getSession();
  const { metiers, quartiers } = await chargerReferentiels(supabase);
  const quartier = quartiers.find((q) => q.slug === profil?.quartier);

  const { data } = await supabase.rpc("rechercher_artisans", {
    p_quartier: profil?.quartier ?? null,
    p_limite: 3,
  });
  const proches = (data ?? []) as ArtisanRecherche[];
  const prenom = profil?.nom_complet?.split(" ")[0];

  return (
    <>
      <main className="flex flex-col gap-6 px-5 pt-10 pb-28">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-gris">{prenom ? `Bonjour ${prenom},` : "Bienvenue sur Ligeey"}</span>
            <h1 className="font-titre text-2xl leading-tight font-bold">De quoi avez-vous besoin ?</h1>
          </div>
          {profil ? (
            quartier ? (
              <span className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-trait bg-carte px-3.5 text-[13px] font-semibold">
                <IconeLieu className="size-4 text-brique" />
                {quartier.nom}
              </span>
            ) : null
          ) : (
            <Link href="/connexion" className="bouton-secondaire shrink-0">
              Connexion
            </Link>
          )}
        </div>

        <Link
          href="/recherche"
          className="flex h-[54px] items-center gap-2.5 rounded-2xl border border-trait bg-carte px-4 text-[15px] text-gris"
        >
          <IconeRecherche />
          Maçon, plombier, électricien…
        </Link>

        <section className={metiers.length ? "flex flex-col gap-3" : "hidden"}>
          <Titre2>Métiers</Titre2>
          <div className="grid grid-cols-3 gap-2.5">
            {metiers.slice(0, 9).map((m) => (
              <Link
                key={m.slug}
                href={`/recherche?metier=${m.slug}`}
                className="flex min-h-20 items-center justify-center rounded-2xl border border-trait bg-carte p-2 text-center text-[13px] font-semibold"
              >
                {m.nom}
              </Link>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-[20px] bg-nuit p-[18px]">
          <p className="font-titre text-lg leading-snug font-bold text-white">
            Décrivez votre chantier, recevez plusieurs devis
          </p>
          <Link href="/devis/nouvelle" className="bouton self-start">
            Publier une demande
          </Link>
        </section>

        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <Titre2>{quartier ? "Près de chez vous" : "Artisans les mieux notés"}</Titre2>
            <Link href="/recherche" className="text-[13px] font-semibold text-brique">
              Tout voir
            </Link>
          </div>
          {proches.length ? (
            proches.map((a) => <CarteArtisan key={a.id} a={a} />)
          ) : (
            <Vide>Aucun artisan inscrit pour l&apos;instant.</Vide>
          )}
        </section>
      </main>
      <BarreNav role={profil?.role} />
    </>
  );
}
