"use client";

import { useActionState, useState } from "react";
import { publierAvis, type EtatAvis } from "@/actions/mise-en-relation";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { IconeEtoile } from "@/components/Icones";
import { Erreur } from "@/components/ui";

const MOTS = ["", "Très déçu", "Décevant", "Correct", "Très bien", "Excellent"];
const TAGS = ["Ponctuel", "Travail propre", "Prix respecté", "Bon conseil", "Rapide"];

export function FormulaireAvis({ offreId, artisanId }: { offreId: string; artisanId: string }) {
  const [etat, action] = useActionState<EtatAvis, FormData>(publierAvis, {});
  const [noteChoisie, setNoteChoisie] = useState(0);

  return (
    <form action={action} className="flex w-full flex-col items-center gap-5">
      <input type="hidden" name="offre_id" value={offreId} />
      <input type="hidden" name="artisan_id" value={artisanId} />

      <fieldset className="flex flex-col items-center gap-2">
        <legend className="sr-only">Note sur 5</legend>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="flex size-13 cursor-pointer items-center justify-center">
              <input type="radio" name="note" value={n} required className="sr-only" onChange={() => setNoteChoisie(n)} />
              <span className="sr-only">{n} étoile{n > 1 ? "s" : ""}</span>
              <IconeEtoile className="size-10" pleine={n <= noteChoisie} />
            </label>
          ))}
        </div>
        <span className="h-5 text-[15px] font-bold text-chantier-fonce">{MOTS[noteChoisie]}</span>
      </fieldset>

      <fieldset className="w-full">
        <legend className="mb-2 text-sm font-bold">Ce qui vous a plu</legend>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <label key={t} className="flex h-10 cursor-pointer items-center rounded-full border border-trait bg-carte px-3.5 text-[13px] font-semibold has-checked:border-nuit has-checked:bg-chantier-clair has-checked:text-encre">
              <input type="checkbox" name="tags" value={t} className="sr-only" />
              {t}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex w-full flex-col gap-2">
        <span className="text-sm font-bold">Un commentaire ?</span>
        <textarea name="commentaire" rows={3} maxLength={1000} placeholder="Partagez votre expérience pour aider les autres clients" className="champ py-3" />
      </label>

      <Erreur message={etat.erreur} />
      <BoutonEnvoi enCours="Publication…">Publier mon avis</BoutonEnvoi>
    </form>
  );
}
