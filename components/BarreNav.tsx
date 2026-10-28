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

/** Onglets du bas façon WhatsApp : collés au bord, pastille jaune derrière l'icône active. */
export function BarreNav({ role }: { role?: Role | null }) {
  const chemin = usePathname();
  const liens = role === "artisan" ? NAV_ARTISAN : NAV_CLIENT;
  const actif = liens
    .filter(({ href }) => (href === "/" ? chemin === "/" : chemin === href || chemin.startsWith(href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <>
      {/* Réserve la place de la barre pour que rien ne passe dessous */}
      <div aria-hidden className="h-[calc(72px+env(safe-area-inset-bottom))]" />
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-trait bg-carte/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      >
        <div className="grid h-[72px] grid-cols-4">
          {liens.map(({ href, label, Icone }) => {
            const estActif = href === actif;
            return (
              <Link
                key={href}
                href={href}
                aria-current={estActif ? "page" : undefined}
                className="flex flex-col items-center justify-center gap-1"
              >
                <span
                  className={`flex h-8 w-16 items-center justify-center rounded-full transition-colors ${
                    estActif ? "bg-chantier text-encre" : "text-gris"
                  }`}
                >
                  <Icone className="size-[22px]" />
                </span>
                <span className={`text-[12px] ${estActif ? "font-extrabold text-encre" : "font-semibold text-gris"}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
