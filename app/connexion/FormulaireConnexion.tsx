"use client";

import { useActionState } from "react";
import { connexion, type EtatConnexion } from "@/actions/auth";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { Erreur } from "@/components/ui";

export function FormulaireConnexion({ suite }: { suite: string }) {
  const [etat, action] = useActionState<EtatConnexion, FormData>(connexion, { etape: "telephone" });

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="suite" value={suite} />

      {etat.etape === "telephone" ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">Votre numéro de téléphone</span>
          <span className="flex items-center gap-2">
            <span className="flex min-h-12 items-center rounded-xl border border-trait bg-carte px-3 font-semibold">+221</span>
            <input
              name="telephone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="77 123 45 67"
              required
              className="champ"
            />
          </span>
        </label>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">Code reçu par SMS</span>
          <span className="text-[13px] text-gris">Envoyé au {etat.telephone}</span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            required
            autoFocus
            className="champ text-center text-xl tracking-[0.4em]"
          />
        </label>
      )}

      <Erreur message={etat.erreur} />
      <BoutonEnvoi enCours={etat.etape === "telephone" ? "Envoi du code…" : "Vérification…"}>
        {etat.etape === "telephone" ? "Recevoir un code" : "Se connecter"}
      </BoutonEnvoi>
    </form>
  );
}
