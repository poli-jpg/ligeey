"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";
import { IconeAccueil, IconeCompte, IconeDevis, IconeMessage, IconeRecherche, IconeTableau } from "./Icones";

const NAV_CLIENT = [
  { href: "/", label: "Accueil", Icone: IconeAccueil },
  { href: "/recherche", label: "Chercher", Icone: IconeRecherche },
  { href: "/messages", label: "Messages", Icone: IconeMessage },
  { href: "/devis", label: "Demandes", Icone: IconeDevis },
];

const NAV_ARTISAN = [
  { href: "/espace", label: "Tableau", Icone: IconeTableau },
  { href: "/messages", label: "Messages", Icone: IconeMessage },
  { href: "/recherche", label: "Chercher", Icone: IconeRecherche },
  { href: "/espace/profil", label: "Profil", Icone: IconeCompte },
];

export function BarreNav({ role }: { role?: Role | null }) {
  const chemin = usePathname();
  const liens = role === "artisan" ? NAV_ARTISAN : NAV_CLIENT;
  const actifs = liens.filter(({ href }) => (href === "/" ? chemin === "/" : chemin === href || chemin.startsWith(href + "/")));
  // Le lien le plus précis gagne (/espace/profil plutôt que /espace)
  const actif = actifs.sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md px-3 pb-[max(env(safe-area-inset-bottom),10px)]"
    >
      <div className="grid grid-cols-4 rounded-[22px] bg-nuit p-1.5 shadow-[0_12px_30px_-12px_rgb(22_33_58/0.6)]">
        {liens.map(({ href, label, Icone }) => {
          const estActif = href === actif;
          return (
            <Link
              key={href}
              href={href}
              aria-current={estActif ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[11px] font-bold transition-colors ${
                estActif ? "bg-chantier text-encre" : "text-slate-300 hover:text-white"
              }`}
            >
              <Icone className="size-[21px]" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
