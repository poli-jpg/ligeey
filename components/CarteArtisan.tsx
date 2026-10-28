import Link from "next/link";
import type { ArtisanRecherche } from "@/lib/types";
import { fcfa } from "@/lib/format";
import { IconeLieu, IconeMetier, IconeOutil } from "./Icones";
import { Avatar, BadgeVerifie, Note } from "./ui";

export function CarteArtisan({ a }: { a: ArtisanRecherche }) {
  return (
    <Link href={`/artisans/${a.id}`} className="carte group flex flex-col gap-3.5 p-4 transition-transform active:scale-[0.99]">
      <span className="flex items-start gap-3">
        <span className="relative">
          <Avatar nom={a.nom_complet} />
          {a.disponible ? (
            <span className="absolute right-0 bottom-0 size-3.5 rounded-full border-2 border-white bg-green-500" aria-hidden />
          ) : null}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-1.5 text-base font-extrabold">
            <span className="truncate">{a.nom_complet}</span>
            {a.verifie ? <BadgeVerifie className="size-[18px] shrink-0" /> : null}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-gris">
            <IconeMetier slug={a.metier} className="size-4" />
            {a.metier_nom}
          </span>
        </span>
        <Note valeur={a.note_moyenne} nbAvis={a.nb_avis} />
      </span>

      <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gris">
        {a.distance_km != null ? (
          <span className="flex items-center gap-1"><IconeLieu className="size-3.5" />{a.distance_km.toLocaleString("fr-FR")} km</span>
        ) : null}
        {a.annees_experience ? (
          <span className="flex items-center gap-1"><IconeOutil className="size-3.5" />{a.annees_experience} ans d&apos;expérience</span>
        ) : null}
      </span>

      <span className="flex items-center justify-between rounded-2xl bg-fond px-3.5 py-2.5">
        <span className="text-[13px] text-gris">
          Dès <strong className="font-titre text-[15px] text-encre">{fcfa(a.tarif_base)}</strong>
        </span>
        <span className={`text-xs font-bold ${a.disponible ? "text-vert" : "text-ambre"}`}>
          {a.disponible ? "Disponible" : "Occupé"}
        </span>
      </span>
    </Link>
  );
}
