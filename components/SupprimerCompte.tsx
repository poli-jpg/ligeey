"use client";

import { useActionState, useState } from "react";
import { supprimerMonCompte, type EtatSimple } from "@/actions/auth";
import { BoutonEnvoi } from "./BoutonEnvoi";
import { Erreur } from "./ui";

/** Suppression définitive du compte, avec confirmation écrite. */
export function SupprimerCompte({ artisan = false }: { artisan?: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [etat, action] = useActionState<EtatSimple, FormData>(supprimerMonCompte, {});

  if (!ouvert) {
    return (
      <button type="button" onClick={() => setOuvert(true)} className="py-2 text-sm font-semibold text-red-700">
        Supprimer mon compte
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-bold text-red-900">Supprimer définitivement votre compte ?</p>
      <p className="text-[13px] leading-relaxed text-red-900">
        {artisan
          ? "Votre profil public, vos photos, vos avis, vos conversations et votre pièce d'identité seront effacés. "
          : "Vos demandes de devis, vos conversations et vos avis seront effacés. "}
        Cette action ne peut pas être annulée.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-red-900">Écrivez SUPPRIMER pour confirmer</span>
        <input value={saisie} onChange={(e) => setSaisie(e.target.value)} autoCapitalize="characters" className="champ" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setOuvert(false)} className="bouton-secondaire">Annuler</button>
        {saisie.trim().toUpperCase() === "SUPPRIMER" ? (
          <BoutonEnvoi className="bouton bg-red-700 text-white" enCours="Suppression…">Supprimer</BoutonEnvoi>
        ) : (
          <button type="button" disabled className="bouton opacity-40">Supprimer</button>
        )}
      </div>
      <Erreur message={etat.erreur} />
    </form>
  );
}
