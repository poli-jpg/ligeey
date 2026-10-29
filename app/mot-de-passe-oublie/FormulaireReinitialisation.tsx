"use client";

import { useActionState } from "react";
import { reinitialiserMotDePasse, type EtatReinitialisation } from "@/actions/auth";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { ChampCode, ChampMotDePasse, ChampTelephone } from "@/components/ChampsAuth";
import { Erreur } from "@/components/ui";

export function FormulaireReinitialisation({ suite }: { suite: string }) {
  const [etat, action] = useActionState<EtatReinitialisation, FormData>(reinitialiserMotDePasse, { etape: "telephone" });

  if (etat.etape === "code") {
    return (
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="suite" value={suite} />
        <p className="rounded-2xl bg-carte p-4 text-[15px] leading-relaxed shadow-carte">
          Si ce numéro a un compte Ligeey, un code vient de lui être envoyé par SMS.
        </p>
        <ChampCode telephone={etat.telephone} />
        <ChampMotDePasse label="Nouveau mot de passe" nouveau aide="8 caractères minimum." />
        <Erreur message={etat.erreur} />
        <BoutonEnvoi enCours="Enregistrement…">Enregistrer et me connecter</BoutonEnvoi>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="suite" value={suite} />
      <ChampTelephone defaut={etat.saisie?.telephone} />
      <Erreur message={etat.erreur} />
      <BoutonEnvoi enCours="Envoi du code…">Recevoir un code</BoutonEnvoi>
    </form>
  );
}
