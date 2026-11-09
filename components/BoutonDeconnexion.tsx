"use client";

import { useTransition } from "react";
import { deconnexion } from "@/actions/auth";
import { createClient } from "@/lib/supabase/client";

/**
 * Déconnexion qui désabonne aussi ce téléphone des notifications :
 * sur un téléphone partagé, le compte suivant ne reçoit pas les messages du précédent.
 */
export function BoutonDeconnexion({ className = "bouton-secondaire w-full" }: { className?: string }) {
  const [enCours, demarrer] = useTransition();

  return (
    <button
      type="button"
      disabled={enCours}
      className={className}
      onClick={() =>
        demarrer(async () => {
          try {
            const reg = await navigator.serviceWorker?.getRegistration();
            const abo = await reg?.pushManager?.getSubscription();
            if (abo) {
              await createClient().rpc("retirer_abonnement", { p_endpoint: abo.endpoint });
              await abo.unsubscribe();
            }
          } catch {
            // La déconnexion passe avant tout
          }
          await deconnexion();
        })
      }
    >
      {enCours ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}
