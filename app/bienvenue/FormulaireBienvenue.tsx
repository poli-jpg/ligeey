"use client";

import { useActionState } from "react";
import { terminerInscription, type EtatSimple } from "@/actions/auth";
import type { Quartier } from "@/lib/referentiels";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { Erreur } from "@/components/ui";

export function FormulaireBienvenue({ quartiers, suite }: { quartiers: Quartier[]; suite: string }) {
  const [etat, action] = useActionState<EtatSimple, FormData>(terminerInscription, {});

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="suite" value={suite} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Prénom et nom</span>
        <input name="nom" required minLength={2} maxLength={60} autoComplete="name" className="champ" />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Votre quartier</span>
        <select name="quartier" required defaultValue="" className="champ">
          <option value="" disabled>Choisir…</option>
          {quartiers.map((q) => (
            <option key={q.slug} value={q.slug}>{q.nom} ({q.commune})</option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-bold">Vous êtes…</legend>
        {[
          { v: "client", titre: "Je cherche un artisan", texte: "Trouver, contacter et noter des professionnels." },
          { v: "artisan", titre: "Je suis artisan", texte: "Créer mon profil et recevoir des demandes de clients." },
        ].map((o) => (
          <label key={o.v} className="flex cursor-pointer gap-3 rounded-2xl border border-trait bg-carte p-4 has-checked:border-brique has-checked:bg-brique-clair">
            <input type="radio" name="type" value={o.v} defaultChecked={o.v === "client"} className="mt-1 accent-brique" />
            <span className="flex flex-col gap-0.5">
              <span className="font-bold">{o.titre}</span>
              <span className="text-[13px] text-gris">{o.texte}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <Erreur message={etat.erreur} />
      <BoutonEnvoi enCours="Enregistrement…">Continuer</BoutonEnvoi>
    </form>
  );
}
