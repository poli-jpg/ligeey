"use client";

import { useOptimistic, useTransition } from "react";
import { basculerDisponibilite } from "@/actions/artisan";

export function Disponibilite({ disponible }: { disponible: boolean }) {
  const [etat, setEtat] = useOptimistic(disponible);
  const [, demarrer] = useTransition();

  return (
    <button
      type="button"
      aria-pressed={etat}
      onClick={() =>
        demarrer(async () => {
          setEtat(!etat);
          await basculerDisponibilite(!etat);
        })
      }
      className="flex w-full items-center gap-3 rounded-2xl bg-white/10 px-3.5 py-3 text-left"
    >
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-bold text-white">{etat ? "Disponible pour de nouveaux chantiers" : "Indisponible"}</span>
        <span className="text-xs text-slate-300">
          {etat ? "Vous apparaissez comme disponible" : "Les clients voient que vous êtes occupé"}
        </span>
      </span>
      <span className={`flex h-[30px] w-[50px] shrink-0 rounded-full p-[3px] transition ${etat ? "justify-end bg-green-500" : "justify-start bg-slate-500"}`}>
        <span className="size-6 rounded-full bg-white" />
      </span>
    </button>
  );
}
