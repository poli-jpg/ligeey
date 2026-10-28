import Link from "next/link";
import { initiales, note } from "@/lib/format";
import { IconeEtoile, IconeRetour, IconeVerifie } from "./Icones";

// Couleur d'avatar stable selon le nom : on reconnaît les gens d'un coup d'œil
const TEINTES = [
  "bg-[#fff2c7] text-[#6e4f00]",
  "bg-[#dbe7ff] text-[#1e3a8a]",
  "bg-[#e3f4e9] text-[#14532d]",
  "bg-[#fde4d7] text-[#7c2d12]",
  "bg-[#ece4fb] text-[#4c1d95]",
];
function teinte(nom: string) {
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TEINTES[h % TEINTES.length];
}

export function Avatar({ nom, taille = "md" }: { nom: string; taille?: "sm" | "md" | "lg" }) {
  const t = { sm: "size-10 text-sm", md: "size-12 text-[15px]", lg: "size-[88px] text-3xl" }[taille];
  return (
    <span className={`${t} ${teinte(nom)} flex shrink-0 items-center justify-center rounded-full font-titre font-bold`}>
      {initiales(nom)}
    </span>
  );
}

export function Note({ valeur, nbAvis }: { valeur: number; nbAvis?: number }) {
  if (!nbAvis) {
    return <span className="rounded-full bg-fond px-2.5 py-1 text-xs font-bold text-gris">Nouveau</span>;
  }
  return (
    <span className="flex items-center gap-1 text-sm font-extrabold">
      <IconeEtoile />
      {note(valeur)}
      <span className="font-semibold text-gris">({nbAvis})</span>
    </span>
  );
}

export function BadgeVerifie({ className }: { className?: string }) {
  return <IconeVerifie className={className} />;
}

export function Pastille({
  ton = "vert",
  children,
}: {
  ton?: "vert" | "ambre" | "chantier" | "gris";
  children: React.ReactNode;
}) {
  const tons = {
    vert: "bg-vert-clair text-vert",
    ambre: "bg-ambre-clair text-ambre",
    chantier: "bg-chantier-clair text-chantier-fonce",
    gris: "bg-slate-200 text-slate-700",
  };
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-bold ${tons[ton]}`}>
      {ton === "vert" ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function Entete({ titre, retour, sousTitre }: { titre?: string; retour?: string; sousTitre?: string }) {
  return (
    <header className="flex flex-col gap-3 px-5 pt-7 pb-4">
      {retour ? (
        <Link href={retour} aria-label="Retour" className="flex size-11 items-center justify-center rounded-full bg-carte shadow-carte">
          <IconeRetour />
        </Link>
      ) : null}
      {titre ? (
        <div className="flex flex-col gap-1">
          <h1 className="font-titre text-[28px] leading-[1.1] font-extrabold tracking-tight">{titre}</h1>
          {sousTitre ? <p className="text-[15px] text-gris">{sousTitre}</p> : null}
        </div>
      ) : null}
    </header>
  );
}

export function Titre2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-titre text-lg font-bold tracking-tight">{children}</h2>;
}

export function Erreur({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-800">
      {message}
    </p>
  );
}

export function Vide({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[20px] border-[1.5px] border-dashed border-[#c3cad3] p-6 text-center text-sm leading-relaxed text-gris">
      {children}
    </p>
  );
}
