"use client";

import { useEffect, useState } from "react";

/**
 * Enregistre le service worker (en production) et propose la mise à jour
 * quand une nouvelle version de l'appli a été déployée.
 */
export function PWA() {
  const [enAttente, setEnAttente] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let rechargee = false;
    const surChangement = () => {
      if (rechargee) return;
      rechargee = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", surChangement);

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Une version est déjà prête (onglet resté ouvert pendant un déploiement)
      if (reg.waiting && navigator.serviceWorker.controller) setEnAttente(reg.waiting);

      reg.addEventListener("updatefound", () => {
        const nouveau = reg.installing;
        nouveau?.addEventListener("statechange", () => {
          if (nouveau.state === "installed" && navigator.serviceWorker.controller) setEnAttente(nouveau);
        });
      });

      // Vérifie les mises à jour quand on revient sur l'appli
      const verifier = () => document.visibilityState === "visible" && reg.update().catch(() => {});
      document.addEventListener("visibilitychange", verifier);
    });

    return () => navigator.serviceWorker.removeEventListener("controllerchange", surChangement);
  }, []);

  if (!enAttente) return null;

  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 mx-auto max-w-md px-3 pt-[max(env(safe-area-inset-top),10px)]">
      <div className="flex items-center gap-3 rounded-2xl bg-encre px-4 py-3 text-white shadow-xl">
        <span className="flex-1 text-sm font-semibold">Une nouvelle version de Ligeey est disponible.</span>
        <button
          type="button"
          onClick={() => enAttente.postMessage("MISE_A_JOUR")}
          className="rounded-xl bg-chantier px-3 py-2 text-[13px] font-extrabold text-encre"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  );
}
