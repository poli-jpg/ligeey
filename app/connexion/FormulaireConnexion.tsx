"use client";

import Link from "next/link";
import { useActionState } from "react";
import { connexion, type EtatConnexion } from "@/actions/auth";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { ChampCode, ChampMotDePasse, ChampTelephone } from "@/components/ChampsAuth";
import { Erreur } from "@/components/ui";

export function FormulaireConnexion({ suite }: { suite: string }) {
  const [etat, action] = useActionState<EtatConnexion, FormData>(connexion, { etape: "identifiants" });
  const suiteQs = suite !== "/" ? `?suite=${encodeURIComponent(suite)}` : "";

  // Compte créé mais numéro jamais confirmé : on termine avec le code SMS
  if (etat.etape === "code") {
    return (
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="suite" value={suite} />
        <p className="rounded-2xl bg-carte p-4 text-[15px] leading-relaxed shadow-carte">
          Votre numéro n&apos;est pas encore confirmé. Entrez le code que nous venons de vous envoyer.
        </p>
        <ChampCode telephone={etat.telephone} />
        <Erreur message={etat.erreur} />
        <BoutonEnvoi enCours="Vérification…">Confirmer et me connecter</BoutonEnvoi>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="suite" value={suite} />
      <ChampTelephone defaut={etat.saisie?.telephone} />
      <ChampMotDePasse />
      <Link href={`/mot-de-passe-oublie${suiteQs}`} className="self-end py-1 text-sm font-bold text-nuit underline underline-offset-4">
        Mot de passe oublié ?
      </Link>
      <Erreur message={etat.erreur} />
      <BoutonEnvoi enCours="Connexion…">Se connecter</BoutonEnvoi>
    </form>
  );
}
