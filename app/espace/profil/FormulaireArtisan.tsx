"use client";

import { useActionState, useState } from "react";
import { enregistrerProfilArtisan, type EtatProfil } from "@/actions/artisan";
import { JOURS, type Metier, type Quartier } from "@/lib/referentiels";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { IconeSuite } from "@/components/Icones";
import { Erreur, Groupe, Ligne } from "@/components/ui";

export type FicheArtisan = {
  metier: string;
  quartier_base: string;
  bio: string | null;
  annees_experience: number | null;
  tarif_base: number | null;
  competences: string[];
  zones: string[];
  jours_dispo: number[];
};

export function FormulaireArtisan({
  metiers,
  quartiers,
  fiche,
  quartierProfil,
}: {
  metiers: Metier[];
  quartiers: Quartier[];
  fiche: FicheArtisan | null;
  quartierProfil: string | null;
}) {
  const [etat, action] = useActionState<EtatProfil, FormData>(enregistrerProfilArtisan, {});
  const jours = fiche?.jours_dispo ?? [1, 2, 3, 4, 5, 6];
  const [nbZones, setNbZones] = useState(fiche?.zones.length ?? 0);

  return (
    <form action={action} className="flex flex-col gap-6">
      <Groupe titre="Votre métier">
        <Ligne label="Métier principal">
          <select name="metier" required defaultValue={fiche?.metier ?? ""} className="champ-ligne">
            <option value="" disabled>Choisir…</option>
            {metiers.map((m) => (
              <option key={m.slug} value={m.slug}>{m.nom}</option>
            ))}
          </select>
        </Ligne>
        <div className="grid grid-cols-2 divide-x divide-trait">
          <Ligne label="Expérience (ans)">
            <input name="annees_experience" inputMode="numeric" defaultValue={fiche?.annees_experience ?? ""} placeholder="0" className="champ-ligne" />
          </Ligne>
          <Ligne label="Tarif de base (FCFA)">
            <input name="tarif_base" inputMode="numeric" defaultValue={fiche?.tarif_base ?? ""} placeholder="Déplacement" className="champ-ligne" />
          </Ligne>
        </div>
        <Ligne label="Compétences" aide="Séparées par des virgules">
          <input name="competences" defaultValue={fiche?.competences.join(", ") ?? ""} placeholder="Fuites, sanitaires, chauffe-eau…" className="champ-ligne" />
        </Ligne>
        <Ligne label="Présentation">
          <textarea name="bio" rows={3} maxLength={1000} defaultValue={fiche?.bio ?? ""} placeholder="Votre expérience, vos chantiers, votre façon de travailler" className="champ-ligne resize-none py-1" />
        </Ligne>
      </Groupe>

      <Groupe titre="Où vous travaillez" aide="Le quartier de base sert à calculer la distance avec les clients.">
        <Ligne label="Quartier de base">
          <select name="quartier_base" required defaultValue={fiche?.quartier_base ?? quartierProfil ?? ""} className="champ-ligne">
            <option value="" disabled>Choisir…</option>
            {quartiers.map((q) => (
              <option key={q.slug} value={q.slug}>{q.nom}</option>
            ))}
          </select>
        </Ligne>
        <details className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="flex flex-col">
              <span className="text-[13px] font-semibold text-gris">Autres zones</span>
              <span className="text-base">{nbZones ? `${nbZones} quartier${nbZones > 1 ? "s" : ""} choisi${nbZones > 1 ? "s" : ""}` : "Aucune"}</span>
            </span>
            <IconeSuite className="size-5 text-gris transition-transform group-open:rotate-90" />
          </summary>
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            {quartiers.map((q) => (
              <label key={q.slug} className="flex h-10 cursor-pointer items-center rounded-full border-[1.5px] border-trait px-3.5 text-sm font-semibold has-checked:border-nuit has-checked:bg-chantier-clair">
                <input
                  type="checkbox"
                  name="zones"
                  value={q.slug}
                  defaultChecked={fiche?.zones.includes(q.slug)}
                  onChange={(e) => setNbZones((n) => n + (e.target.checked ? 1 : -1))}
                  className="sr-only"
                />
                {q.nom}
              </label>
            ))}
          </div>
        </details>
      </Groupe>

      <Groupe titre="Jours de travail">
        <div className="grid grid-cols-7 gap-1.5 p-3">
          {JOURS.map((j) => (
            <label key={j.n} className="flex h-11 cursor-pointer items-center justify-center rounded-xl bg-fond text-sm font-extrabold text-gris has-checked:bg-nuit has-checked:text-white">
              <input type="checkbox" name="jours" value={j.n} defaultChecked={jours.includes(j.n)} className="sr-only" aria-label={j.nom} />
              <span aria-hidden>{j.court}</span>
            </label>
          ))}
        </div>
      </Groupe>

      <Erreur message={etat.erreur} />
      {etat.ok ? <p role="status" className="rounded-xl bg-vert-clair px-3.5 py-2.5 text-sm font-semibold text-vert">Profil enregistré.</p> : null}
      <BoutonEnvoi enCours="Enregistrement…">{fiche ? "Enregistrer" : "Créer mon profil"}</BoutonEnvoi>
    </form>
  );
}
