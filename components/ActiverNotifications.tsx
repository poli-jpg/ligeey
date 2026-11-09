"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { activerPush, cleAbonnement, etatPush, type EtatPush } from "@/lib/push";

/**
 * Carte « Activer les notifications ».
 * Disparaît une fois activé ; explique quoi faire si c'est bloqué ou sur iPhone.
 */
export function ActiverNotifications({ pourArtisan = false }: { pourArtisan?: boolean }) {
  const [etat, setEtat] = useState<EtatPush | "chargement" | "en-cours">("chargement");
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    etatPush().then(setEtat);
  }, []);

  async function activer() {
    setEtat("en-cours");
    setErreur(false);
    try {
      const abo = await activerPush();
      if (!abo) return setEtat(await etatPush());
      const { error } = await createClient().rpc("enregistrer_abonnement", cleAbonnement(abo));
      if (error) throw error;
      setEtat("actif");
    } catch {
      setErreur(true);
      setEtat("inactif");
    }
  }

  if (etat === "chargement" || etat === "actif" || etat === "indisponible") return null;

  const texte = pourArtisan
    ? "Soyez prévenu dès qu'un client vous écrit ou qu'une demande arrive près de chez vous, même appli fermée."
    : "Soyez prévenu dès qu'un artisan vous répond ou vous envoie un devis, même appli fermée.";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-chantier bg-chantier-clair p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>🔔</span>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-extrabold text-encre">Activez les notifications</span>
          <span className="text-[13px] leading-snug text-chantier-fonce">{texte}</span>
        </div>
      </div>
      {etat === "ios-installer" ? (
        <p className="text-[13px] leading-snug font-semibold text-chantier-fonce">
          Sur iPhone : touchez <b>Partager</b> puis <b>Sur l&apos;écran d&apos;accueil</b>, ouvrez Ligeey depuis l&apos;icône, puis revenez ici.
        </p>
      ) : etat === "refuse" ? (
        <p className="text-[13px] leading-snug font-semibold text-chantier-fonce">
          Les notifications sont bloquées. Autorisez-les pour Ligeey dans les réglages du téléphone (Notifications), puis rouvrez l&apos;appli.
        </p>
      ) : (
        <button type="button" onClick={activer} disabled={etat === "en-cours"} className="bouton min-h-11 text-sm">
          {etat === "en-cours" ? "Activation…" : "Activer les notifications"}
        </button>
      )}
      {erreur ? <p className="text-[13px] font-semibold text-red-700">Activation impossible pour le moment. Réessayez.</p> : null}
    </div>
  );
}
