"use client";

import { useActionState } from "react";
import { signalerArtisan, type EtatSignalement } from "@/actions/mise-en-relation";
import { RAISONS_SIGNALEMENT } from "@/lib/types";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { Erreur, Groupe } from "@/components/ui";

export function FormulaireSignalement({ artisanId }: { artisanId: string }) {
  const [etat, action] = useActionState<EtatSignalement, FormData>(signalerArtisan, {});

  if (etat.ok) {
    return (
      <p role="status" className="rounded-2xl bg-vert-clair p-4 text-[15px] leading-relaxed font-semibold text-vert">
        Merci, votre signalement a été envoyé. L&apos;équipe Ligeey va l&apos;examiner. Le profil peut être masqué si le problème est confirmé.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="artisan_id" value={artisanId} />

      <fieldset>
        <legend className="mb-2 px-1 text-[13px] font-bold text-gris">Quel est le problème ?</legend>
        <div className="divide-y divide-trait overflow-hidden rounded-2xl bg-carte shadow-carte">
          {RAISONS_SIGNALEMENT.map((r) => (
            <label key={r.v} className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 has-checked:bg-chantier-clair">
              <input type="radio" name="raison" value={r.v} required className="size-5 accent-nuit" />
              <span className="text-base">{r.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Groupe titre="Détails (facultatif)" aide="Ce que vous écrivez n'est visible que par l'équipe Ligeey.">
        <textarea
          name="motif"
          rows={4}
          maxLength={1000}
          placeholder="Que s'est-il passé ? Date, montant demandé…"
          aria-label="Détails du signalement"
          className="champ-ligne resize-none px-4 py-3"
        />
      </Groupe>

      <Erreur message={etat.erreur} />
      <BoutonEnvoi enCours="Envoi…">Envoyer le signalement</BoutonEnvoi>
    </form>
  );
}
