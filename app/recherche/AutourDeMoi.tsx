"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconeLieu } from "@/components/Icones";

/**
 * Recherche à partir de la vraie position du téléphone (GPS).
 * La position est arrondie à ~100 m avant d'être envoyée et n'est jamais enregistrée.
 */
export function AutourDeMoi({ actif }: { actif: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [etat, setEtat] = useState<"repos" | "recherche" | "refus" | "indispo">("repos");

  function localiser() {
    if (!("geolocation" in navigator)) return setEtat("indispo");
    setEtat("recherche");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const q = new URLSearchParams(params.toString());
        q.delete("quartier");
        q.set("lat", pos.coords.latitude.toFixed(3));
        q.set("lng", pos.coords.longitude.toFixed(3));
        setEtat("repos");
        router.push(`/recherche?${q.toString()}`);
      },
      (err) => setEtat(err.code === err.PERMISSION_DENIED ? "refus" : "indispo"),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5 * 60 * 1000 },
    );
  }

  const message = {
    refus: "Position refusée. Autorisez la localisation pour Ligeey dans les réglages du navigateur, ou choisissez un quartier.",
    indispo: "Position introuvable pour le moment. Réessayez dehors ou choisissez un quartier.",
  } as const;

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={localiser}
        disabled={etat === "recherche"}
        aria-pressed={actif}
        className={`flex h-9 items-center gap-1.5 self-start rounded-full px-3.5 text-[13px] font-bold transition-colors ${
          actif ? "bg-chantier text-encre" : "bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        <IconeLieu className="size-4" />
        {etat === "recherche" ? "Localisation…" : actif ? "Autour de moi ✓" : "Autour de moi"}
      </button>
      {etat === "refus" || etat === "indispo" ? <p className="text-[12px] leading-snug text-slate-300">{message[etat]}</p> : null}
    </div>
  );
}
