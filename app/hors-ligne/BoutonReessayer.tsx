"use client";

import { useEffect } from "react";

export function BoutonReessayer() {
  // Retour automatique dès que la connexion revient
  useEffect(() => {
    const revenir = () => window.location.reload();
    window.addEventListener("online", revenir);
    return () => window.removeEventListener("online", revenir);
  }, []);

  return (
    <button type="button" onClick={() => window.location.reload()} className="bouton w-full">
      Réessayer
    </button>
  );
}
