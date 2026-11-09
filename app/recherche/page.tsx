import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/supabase/server";
import { chargerReferentiels } from "@/lib/referentiels";
import type { ArtisanRecherche } from "@/lib/types";
import { BarreNav } from "@/components/BarreNav";
import { CarteArtisan } from "@/components/CarteArtisan";
import { IconeRetour } from "@/components/Icones";
import { Vide } from "@/components/ui";
import { AutourDeMoi } from "./AutourDeMoi";

export const metadata: Metadata = { title: "Rechercher un artisan" };

type Params = { metier?: string; quartier?: string; note?: string; dispo?: string; verifie?: string; lat?: string; lng?: string };

export default async function Recherche({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const [{ supabase, profil }, { metiers, quartiers }] = await Promise.all([getSession(), chargerReferentiels()]);

  // Position GPS du téléphone (bouton « Autour de moi »), si elle est plausible pour le Sénégal
  const lat = Number(p.lat), lng = Number(p.lng);
  // Un quartier choisi dans la liste l'emporte sur la position
  const gps = !p.quartier && p.lat && p.lng && lat >= 12 && lat <= 17 && lng >= -18 && lng <= -11 ? { lat, lng } : null;

  // « partout » = choix explicite de ne filtrer sur aucun quartier (sinon on retombe sur celui du profil)
  const quartier = gps || p.quartier === "partout" ? "" : (p.quartier ?? profil?.quartier ?? "");
  const metier = metiers.find((m) => m.slug === p.metier);
  const nomQuartier = quartiers.find((q) => q.slug === quartier)?.nom;

  const filtresBase = {
    p_metier: metier?.slug ?? null,
    p_note_min: p.note === "4" ? 4 : 0,
    p_dispo_seulement: p.dispo === "1",
    p_verifies_seulement: p.verifie === "1",
  };
  let { data, error } = await supabase.rpc(
    "rechercher_artisans",
    gps ? { ...filtresBase, p_quartier: null, p_lat: gps.lat, p_lng: gps.lng } : { ...filtresBase, p_quartier: quartier || null },
  );
  // Base pas encore à jour pour le GPS : on retombe sur le quartier du profil
  if (error && gps) ({ data, error } = await supabase.rpc("rechercher_artisans", { ...filtresBase, p_quartier: profil?.quartier ?? null }));
  const resultats = (data ?? []) as ArtisanRecherche[];
  const { data: proche } = gps ? await supabase.rpc("quartier_proche", { p_lat: gps.lat, p_lng: gps.lng }) : { data: null };
  const quartierGps = (proche as { nom: string; distance_km: number }[] | null)?.[0];

  // Construit le lien d'un filtre en conservant les autres
  const lien = (cle: keyof Params, valeur: string | null) => {
    const q = new URLSearchParams();
    const tous = { ...p, quartier: gps ? undefined : quartier || "partout", [cle]: valeur ?? undefined };
    Object.entries(tous).forEach(([k, v]) => v && q.set(k, v));
    return `/recherche?${q.toString()}`;
  };

  const filtres = [
    { cle: "dispo" as const, label: "Disponible", actif: p.dispo === "1" },
    { cle: "note" as const, label: "Note 4+", actif: p.note === "4", valeur: "4" },
    { cle: "verifie" as const, label: "Identité vérifiée", actif: p.verifie === "1" },
  ];

  return (
    <>
      <header className="flex flex-col gap-4 rounded-b-[28px] bg-nuit px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-5">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Retour" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
            <IconeRetour />
          </Link>
          <h1 className="font-titre text-2xl font-extrabold tracking-tight text-white">Trouver un artisan</h1>
        </div>
        {/* Formulaire GET : fonctionne même sans JavaScript */}
        <form action="/recherche" className="flex flex-col gap-2 rounded-2xl bg-white p-2">
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="metier">Métier</label>
            <select id="metier" name="metier" defaultValue={metier?.slug ?? ""} className="champ min-h-12 flex-1 border-0 bg-fond font-semibold">
              <option value="">Tous les métiers</option>
              {metiers.map((m) => (
                <option key={m.slug} value={m.slug}>{m.nom}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="quartier">Quartier</label>
            <select id="quartier" name="quartier" defaultValue={gps ? "" : quartier || "partout"} className="champ min-h-12 w-[42%] border-0 bg-fond font-semibold">
              {gps ? <option value="">📍 Ma position</option> : null}
              <option value="partout">Partout</option>
              {quartiers.map((q) => (
                <option key={q.slug} value={q.slug}>{q.nom}</option>
              ))}
            </select>
          </div>
          {gps ? (
            <>
              <input type="hidden" name="lat" value={p.lat} />
              <input type="hidden" name="lng" value={p.lng} />
            </>
          ) : null}
          <button className="bouton min-h-12">Rechercher</button>
        </form>
        <div className="flex flex-wrap gap-2">
          <Suspense>
            <AutourDeMoi actif={Boolean(gps)} />
          </Suspense>
          {filtres.map((f) => (
            <Link
              key={f.cle}
              href={lien(f.cle, f.actif ? null : (f.valeur ?? "1"))}
              aria-pressed={f.actif}
              className={`flex h-9 items-center rounded-full px-3.5 text-[13px] font-bold transition-colors ${
                f.actif ? "bg-chantier text-encre" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </header>

      <main className="flex flex-col gap-3 px-4 pt-5 pb-6">
        <p className="text-sm text-gris">
          <strong className="text-encre">
            {resultats.length} {metier ? metier.nom.toLowerCase() : "artisan"}
            {resultats.length > 1 ? "s" : ""}
          </strong>
          {gps
            ? `, les plus proches de vous d'abord${quartierGps && quartierGps.distance_km < 4 ? ` (vers ${quartierGps.nom})` : ""}`
            : nomQuartier
              ? `, les plus proches de ${nomQuartier} d'abord`
              : ""}
        </p>
        {error ? <Vide>La recherche est indisponible pour le moment.</Vide> : null}
        {!error && resultats.length === 0 ? (
          <Vide>
            Personne ne correspond pour l&apos;instant.{" "}
            <Link href="/devis/nouvelle" className="font-semibold text-nuit">Publiez une demande</Link> : elle
            apparaîtra dans le tableau des artisans du métier.
          </Vide>
        ) : null}
        {resultats.map((a) => (
          <CarteArtisan key={a.id} a={a} depuisGps={Boolean(gps)} />
        ))}
      </main>
      <BarreNav role={profil?.role} />
    </>
  );
}
