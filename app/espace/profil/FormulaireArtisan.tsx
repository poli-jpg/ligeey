"use client";

import { useActionState } from "react";
import { enregistrerProfilArtisan, type EtatProfil } from "@/actions/artisan";
import { JOURS, type Metier, type Quartier } from "@/lib/referentiels";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { Erreur } from "@/components/ui";

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

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Métier principal</span>
        <select name="metier" required defaultValue={fiche?.metier ?? ""} className="champ">
          <option value="" disabled>Choisir…</option>
          {metiers.map((m) => (
            <option key={m.slug} value={m.slug}>{m.nom}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">Expérience (ans)</span>
          <input name="annees_experience" inputMode="numeric" defaultValue={fiche?.annees_experience ?? ""} className="champ" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">Tarif de base (FCFA)</span>
          <input name="tarif_base" inputMode="numeric" defaultValue={fiche?.tarif_base ?? ""} placeholder="Déplacement" className="champ" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Compétences</span>
        <input
          name="competences"
          defaultValue={fiche?.competences.join(", ") ?? ""}
          placeholder="Fuites, sanitaires, chauffe-eau…"
          className="champ"
        />
        <span className="text-xs text-gris">Séparées par des virgules.</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Présentation</span>
        <textarea name="bio" rows={3} maxLength={1000} defaultValue={fiche?.bio ?? ""} placeholder="Votre expérience, vos chantiers, votre façon de travailler" className="champ py-3" />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Quartier de base</span>
        <select name="quartier_base" required defaultValue={fiche?.quartier_base ?? quartierProfil ?? ""} className="champ">
          <option value="" disabled>Choisir…</option>
          {quartiers.map((q) => (
            <option key={q.slug} value={q.slug}>{q.nom}</option>
          ))}
        </select>
        <span className="text-xs text-gris">Sert à calculer la distance avec les clients.</span>
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">Autres zones où vous travaillez</legend>
        <div className="flex flex-wrap gap-2">
          {quartiers.map((q) => (
            <label key={q.slug} className="flex h-9 cursor-pointer items-center rounded-full border border-trait bg-carte px-3 text-[13px] font-semibold has-checked:border-brique has-checked:bg-brique-clair has-checked:text-brique-fonce">
              <input type="checkbox" name="zones" value={q.slug} defaultChecked={fiche?.zones.includes(q.slug)} className="sr-only" />
              {q.nom}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">Jours disponibles</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {JOURS.map((j) => (
            <label key={j.n} className="flex h-10 cursor-pointer items-center justify-center rounded-xl border border-trait bg-carte text-[13px] font-bold has-checked:border-nuit has-checked:bg-nuit has-checked:text-white">
              <input type="checkbox" name="jours" value={j.n} defaultChecked={jours.includes(j.n)} className="sr-only" aria-label={j.nom} />
              <span aria-hidden>{j.court}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Erreur message={etat.erreur} />
      {etat.ok ? <p className="text-sm font-semibold text-vert">Profil enregistré.</p> : null}
      <BoutonEnvoi enCours="Enregistrement…">{fiche ? "Enregistrer" : "Créer mon profil"}</BoutonEnvoi>
    </form>
  );
}
