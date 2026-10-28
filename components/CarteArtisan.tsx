import Link from "next/link";
import type { ArtisanRecherche } from "@/lib/types";
import { fcfa } from "@/lib/format";
import { Avatar, BadgeVerifie, Note, Pastille } from "./ui";

export function CarteArtisan({ a }: { a: ArtisanRecherche }) {
  const details = [
    a.metier_nom,
    a.annees_experience ? `${a.annees_experience} ans` : null,
    a.distance_km != null ? `${a.distance_km.toLocaleString("fr-FR")} km` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={`/artisans/${a.id}`} className="flex flex-col gap-3 rounded-[18px] border border-trait bg-carte p-3.5">
      <span className="flex items-center gap-3">
        <Avatar nom={a.nom_complet} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 truncate text-[15px] font-bold">
            {a.nom_complet}
            {a.verifie ? <BadgeVerifie /> : null}
          </span>
          <span className="truncate text-[13px] text-gris">{details}</span>
        </span>
        <Note valeur={a.note_moyenne} nbAvis={a.nb_avis} />
      </span>
      <span className="flex items-center justify-between border-t border-[#efece6] pt-2.5">
        <span className="text-[13px] text-gris">
          À partir de <strong className="text-encre">{fcfa(a.tarif_base)}</strong>
        </span>
        {a.disponible ? <Pastille>Disponible</Pastille> : <Pastille ton="ambre">Occupé</Pastille>}
      </span>
    </Link>
  );
}
