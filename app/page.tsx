import Link from "next/link";
import { getSession } from "@/lib/supabase/server";
import { chargerReferentiels } from "@/lib/referentiels";
import type { ArtisanRecherche } from "@/lib/types";
import { BarreNav } from "@/components/BarreNav";
import { InstallerApp } from "@/components/InstallerApp";
import { CarteArtisan } from "@/components/CarteArtisan";
import { IconeLieu, IconeMetier, IconeRecherche, Logo } from "@/components/Icones";
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
      {/* En-tête bleu nuit : salutation + recherche */}
      <header className="rounded-b-[32px] bg-nuit px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-14">
        <div className="flex items-center justify-between">
          <Logo clair />
          {profil ? (
            quartier ? (
              <span className="flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[13px] font-semibold text-white">
                <IconeLieu className="size-4 text-chantier" />
                {quartier.nom}
              </span>
            ) : null
          ) : (
            <Link href="/connexion" className="flex h-10 items-center rounded-full bg-white px-4 text-[13px] font-bold text-encre">
              Se connecter
            </Link>
          )}
        </div>

        <h1 className="mt-6 font-titre text-[28px] leading-[1.1] font-extrabold tracking-tight text-white">
          {prenom ? `${prenom}, qu'est-ce qu'on répare ?` : "Un artisan de confiance, près de chez vous."}
        </h1>

        <Link
          href="/recherche"
          className="mt-5 flex h-[52px] items-center gap-3 rounded-2xl bg-white px-4 text-base text-gris shadow-lg"
        >
          <IconeRecherche className="size-5 text-encre" />
          Maçon, plombier, électricien…
        </Link>
      </header>

      <main className="-mt-9 flex flex-col gap-8 px-4 pb-6">
        {/* Métiers */}
        <section aria-labelledby="titre-metiers" className={metiers.length ? "carte p-4" : "hidden"}>
          <h2 id="titre-metiers" className="sr-only">Métiers</h2>
          <div className="grid grid-cols-4 gap-y-4">
            {metiers.slice(0, 8).map((m) => (
              <Link key={m.slug} href={`/recherche?metier=${m.slug}`} className="group flex flex-col items-center gap-2 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-fond text-nuit transition-colors group-hover:bg-chantier group-active:bg-chantier">
                  <IconeMetier slug={m.slug} className="size-7" />
                </span>
                <span className="text-[12px] leading-tight font-semibold">{m.nom.split(" ")[0]}</span>
              </Link>
            ))}
          </div>
        </section>

        <InstallerApp />

        {/* Demande de devis : le seul endroit avec le ruban de chantier */}
        <section className="overflow-hidden rounded-[24px] bg-chantier">
          <div className="ruban h-3" aria-hidden />
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <h2 className="font-titre text-[22px] leading-tight font-extrabold tracking-tight text-encre">
                Décrivez votre chantier, recevez des devis
              </h2>
              <p className="text-sm text-chantier-fonce">Les artisans du métier autour de vous vous répondent avec un prix.</p>
            </div>
            <Link
              href="/devis/nouvelle"
              className="flex h-12 items-center justify-center rounded-[14px] bg-encre px-5 text-[15px] font-extrabold text-white"
            >
              Publier une demande
            </Link>
          </div>
        </section>

        {/* Artisans */}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <Titre2>{quartier ? `Près de ${quartier.nom}` : "Artisans les mieux notés"}</Titre2>
            <Link href="/recherche" className="text-[13px] font-bold text-nuit underline decoration-chantier decoration-2 underline-offset-4">
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
