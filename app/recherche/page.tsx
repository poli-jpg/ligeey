import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/supabase/server";
import { chargerReferentiels } from "@/lib/referentiels";
import type { ArtisanRecherche } from "@/lib/types";
import { BarreNav } from "@/components/BarreNav";
import { CarteArtisan } from "@/components/CarteArtisan";
import { IconeRetour } from "@/components/Icones";
import { Vide } from "@/components/ui";

export const metadata: Metadata = { title: "Rechercher un artisan" };

type Params = { metier?: string; quartier?: string; note?: string; dispo?: string; verifie?: string };

export default async function Recherche({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const { supabase, profil } = await getSession();
  const { metiers, quartiers } = await chargerReferentiels(supabase);

  const quartier = p.quartier ?? profil?.quartier ?? "";
  const metier = metiers.find((m) => m.slug === p.metier);
  const nomQuartier = quartiers.find((q) => q.slug === quartier)?.nom;

  const { data, error } = await supabase.rpc("rechercher_artisans", {
    p_metier: metier?.slug ?? null,
    p_quartier: quartier || null,
    p_note_min: p.note === "4" ? 4 : 0,
    p_dispo_seulement: p.dispo === "1",
    p_verifies_seulement: p.verifie === "1",
  });
  const resultats = (data ?? []) as ArtisanRecherche[];

  // Construit le lien d'un filtre en conservant les autres
  const lien = (cle: keyof Params, valeur: string | null) => {
    const q = new URLSearchParams();
    const tous = { ...p, quartier: quartier || undefined, [cle]: valeur ?? undefined };
    Object.entries(tous).forEach(([k, v]) => v && q.set(k, v));
    return `/recherche?${q.toString()}`;
  };

  const filtres = [
    { cle: "dispo" as const, label: "Disponible", actif: p.dispo === "1" },
    { cle: "note" as const, label: "Note 4+", actif: p.note === "4", valeur: "4" },
    { cle: "verifie" as const, label: "Vérifié", actif: p.verifie === "1" },
  ];

  return (
    <>
      <header className="flex flex-col gap-3.5 border-b border-trait bg-carte px-5 pt-8 pb-3.5">
        <div className="flex items-center gap-2.5">
          <Link href="/" aria-label="Retour" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-trait">
            <IconeRetour />
          </Link>
          {/* Formulaire GET : fonctionne même sans JavaScript */}
          <form action="/recherche" className="flex flex-1 gap-2">
            <label className="sr-only" htmlFor="metier">Métier</label>
            <select id="metier" name="metier" defaultValue={metier?.slug ?? ""} className="champ min-h-11 flex-1 bg-fond">
              <option value="">Tous les métiers</option>
              {metiers.map((m) => (
                <option key={m.slug} value={m.slug}>{m.nom}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="quartier">Quartier</label>
            <select id="quartier" name="quartier" defaultValue={quartier} className="champ min-h-11 w-36 bg-fond">
              <option value="">Partout</option>
              {quartiers.map((q) => (
                <option key={q.slug} value={q.slug}>{q.nom}</option>
              ))}
            </select>
            <button className="bouton min-h-11 px-3 text-sm">OK</button>
          </form>
        </div>
        <div className="flex flex-wrap gap-2">
          {filtres.map((f) => (
            <Link
              key={f.cle}
              href={lien(f.cle, f.actif ? null : (f.valeur ?? "1"))}
              aria-pressed={f.actif}
              className={`flex h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold ${
                f.actif ? "border-brique bg-brique text-white" : "border-trait bg-carte"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </header>

      <main className="flex flex-col gap-3 px-5 pt-3.5 pb-28">
        <p className="text-sm text-gris">
          <strong className="text-encre">
            {resultats.length} {metier ? metier.nom.toLowerCase() : "artisan"}
            {resultats.length > 1 ? "s" : ""}
          </strong>
          {nomQuartier ? ` autour de ${nomQuartier}` : ""}
        </p>
        {error ? <Vide>La recherche est indisponible pour le moment.</Vide> : null}
        {!error && resultats.length === 0 ? (
          <Vide>
            Personne ne correspond pour l&apos;instant.{" "}
            <Link href="/devis/nouvelle" className="font-semibold text-brique">Publiez une demande</Link> : les
            artisans du métier seront prévenus.
          </Vide>
        ) : null}
        {resultats.map((a) => (
          <CarteArtisan key={a.id} a={a} />
        ))}
      </main>
      <BarreNav role={profil?.role} />
    </>
  );
}
