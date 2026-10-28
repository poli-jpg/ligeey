"use client";

import { useActionState } from "react";
import { publierDemande, type EtatDemande } from "@/actions/mise-en-relation";
import type { Metier, Quartier } from "@/lib/referentiels";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { Erreur } from "@/components/ui";

const URGENCES = [
  { v: "urgent", label: "Urgent" },
  { v: "semaine", label: "Cette semaine" },
  { v: "flexible", label: "Flexible" },
];

export function FormulaireDemande({
  metiers,
  quartiers,
  metierInitial,
  quartierInitial,
}: {
  metiers: Metier[];
  quartiers: Quartier[];
  metierInitial?: string;
  quartierInitial?: string | null;
}) {
  const [etat, action] = useActionState<EtatDemande, FormData>(publierDemande, {});

  return (
    <form action={action} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-bold">Quel métier ?</legend>
        <div className="flex flex-wrap gap-2">
          {metiers.map((m) => (
            <label key={m.slug} className="flex h-10 cursor-pointer items-center rounded-full border border-trait bg-carte px-3.5 text-[13px] font-semibold has-checked:border-nuit has-checked:bg-chantier-clair has-checked:text-encre">
              <input type="radio" name="metier" value={m.slug} defaultChecked={m.slug === metierInitial} required className="sr-only" />
              {m.nom}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold">Décrivez le travail</span>
        <textarea
          name="description"
          rows={4}
          required
          minLength={10}
          maxLength={2000}
          placeholder="Ex. : refaire l'électricité d'une chambre, 3 prises et 2 lampes"
          className="champ py-3"
        />
      </label>

      <div className="grid grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">Quartier</span>
          <select name="quartier" required defaultValue={quartierInitial ?? ""} className="champ">
            <option value="" disabled>Choisir…</option>
            {quartiers.map((q) => (
              <option key={q.slug} value={q.slug}>{q.nom}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">Budget (FCFA)</span>
          <input name="budget" inputMode="numeric" placeholder="Optionnel" className="champ" />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">Quand ?</legend>
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-[#ede9e1] p-1">
          {URGENCES.map((u) => (
            <label key={u.v} className="flex h-10 cursor-pointer items-center justify-center rounded-xl text-[13px] font-bold text-gris has-checked:bg-carte has-checked:text-encre has-checked:shadow-sm">
              <input type="radio" name="urgence" value={u.v} defaultChecked={u.v === "semaine"} className="sr-only" />
              {u.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Erreur message={etat.erreur} />
      <div className="flex flex-col gap-2">
        <BoutonEnvoi enCours="Publication…">Envoyer aux artisans proches</BoutonEnvoi>
        <p className="text-center text-xs text-gris">Les artisans intéressés vous répondent avec une offre dans vos messages.</p>
      </div>
    </form>
  );
}
