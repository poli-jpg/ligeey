import Link from "next/link";
import { initiales, note } from "@/lib/format";
import { IconeEtoile, IconeRetour, IconeVerifie } from "./Icones";

export function Avatar({ nom, taille = "md" }: { nom: string; taille?: "sm" | "md" | "lg" }) {
  const t = { sm: "size-10 text-sm", md: "size-12", lg: "size-20 text-2xl" }[taille];
  return (
    <span className={`${t} flex shrink-0 items-center justify-center rounded-full bg-brique-clair font-bold text-brique-fonce`}>
      {initiales(nom)}
    </span>
  );
}

export function Note({ valeur, nbAvis }: { valeur: number; nbAvis?: number }) {
  return (
    <span className="flex items-center gap-1 text-sm font-bold">
      <IconeEtoile />
      {nbAvis === 0 ? "Nouveau" : note(valeur)}
      {nbAvis ? <span className="font-medium text-gris">({nbAvis})</span> : null}
    </span>
  );
}

export function BadgeVerifie() {
  return <IconeVerifie />;
}

export function Pastille({ ton = "vert", children }: { ton?: "vert" | "ambre" | "brique" | "gris"; children: React.ReactNode }) {
  const tons = {
    vert: "bg-vert-clair text-vert",
    ambre: "bg-ambre-clair text-ambre",
    brique: "bg-brique-clair text-brique-fonce",
    gris: "bg-slate-200 text-slate-700",
  };
  return <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${tons[ton]}`}>{children}</span>;
}

export function Entete({ titre, retour }: { titre?: string; retour?: string }) {
  return (
    <header className="flex items-center gap-2 px-4 pt-6 pb-3">
      {retour ? (
        <Link href={retour} aria-label="Retour" className="flex size-11 items-center justify-center rounded-full border border-trait bg-carte">
          <IconeRetour />
        </Link>
      ) : null}
      {titre ? <h1 className="font-titre text-xl font-bold">{titre}</h1> : null}
    </header>
  );
}

export function Titre2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-titre text-[17px] font-bold">{children}</h2>;
}

export function Erreur({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
      {message}
    </p>
  );
}

export function Vide({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-trait bg-carte p-5 text-center text-sm text-gris">{children}</p>;
}
