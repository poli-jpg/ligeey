"use client";

import { useActionState } from "react";
import { inscription, type EtatInscription } from "@/actions/auth";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { ChampCode, ChampMotDePasse, ChampTelephone } from "@/components/ChampsAuth";
import { Erreur } from "@/components/ui";

export function FormulaireInscription({ suite }: { suite: string }) {
  const [etat, action] = useActionState<EtatInscription, FormData>(inscription, { etape: "infos" });

  if (etat.etape === "code") {
    return (
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="suite" value={suite} />
        <p className="rounded-2xl bg-carte p-4 text-[15px] leading-relaxed shadow-carte">
          Dernière étape : entrez le code reçu par SMS pour confirmer votre numéro. Vous obtiendrez le badge{" "}
          <strong>Téléphone vérifié</strong>.
        </p>
        <ChampCode telephone={etat.telephone} />
        <Erreur message={etat.erreur} />
        {etat.renvoye ? <p role="status" className="text-sm font-semibold text-vert">Nouveau code envoyé.</p> : null}
        <BoutonEnvoi enCours="Vérification…">Confirmer mon numéro</BoutonEnvoi>
        <button type="submit" name="renvoyer" value="1" formNoValidate className="py-2 text-sm font-bold text-nuit underline underline-offset-4">
          Je n&apos;ai pas reçu le code
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="suite" value={suite} />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Prénom et nom</span>
        <input name="nom" required minLength={2} maxLength={60} autoComplete="name" defaultValue={etat.saisie?.nom} className="champ" />
      </label>
      <ChampTelephone defaut={etat.saisie?.telephone} />
      <ChampMotDePasse label="Choisissez un mot de passe" nouveau aide="8 caractères minimum. Notez-le bien." />
      <Erreur message={etat.erreur} />
      <BoutonEnvoi enCours="Création du compte…">Créer mon compte</BoutonEnvoi>
      <p className="text-center text-xs leading-relaxed text-gris">Un code SMS vous sera envoyé pour confirmer votre numéro.</p>
    </form>
  );
}
