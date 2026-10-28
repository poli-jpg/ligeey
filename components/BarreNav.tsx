"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";
import { IconeAccueil, IconeCompte, IconeMessage, IconeRecherche, IconeTableau } from "./Icones";

const NAV_CLIENT = [
  { href: "/", label: "Accueil", Icone: IconeAccueil },
  { href: "/recherche", label: "Chercher", Icone: IconeRecherche },
  { href: "/messages", label: "Messages", Icone: IconeMessage },
  { href: "/devis", label: "Mes demandes", Icone: IconeCompte },
];

const NAV_ARTISAN = [
  { href: "/espace", label: "Tableau", Icone: IconeTableau },
  { href: "/messages", label: "Messages", Icone: IconeMessage },
  { href: "/recherche", label: "Chercher", Icone: IconeRecherche },
  { href: "/espace/profil", label: "Mon profil", Icone: IconeCompte },
];

export function BarreNav({ role }: { role?: Role | null }) {
  const chemin = usePathname();
  const liens = role === "artisan" ? NAV_ARTISAN : NAV_CLIENT;

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-md grid-cols-4 border-t border-trait bg-carte pb-[max(env(safe-area-inset-bottom),8px)]"
    >
      {liens.map(({ href, label, Icone }) => {
        const actif = href === "/" ? chemin === "/" : chemin === href || chemin.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={actif ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 pt-3 text-[11px] ${actif ? "font-bold text-brique" : "font-semibold text-gris"}`}
          >
            <Icone />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
