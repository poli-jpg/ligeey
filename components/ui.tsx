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

/**
 * Barre du haut façon appli (WhatsApp) : fixe, bleu nuit, passe sous l'heure et la batterie.
 * `actions` : boutons à droite (icônes).
 */
export function Entete({
  titre,
  retour,
  sousTitre,
  actions,
}: {
  titre?: string;
  retour?: string;
  sousTitre?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 bg-nuit pt-[env(safe-area-inset-top)] text-white">
      <div className="flex h-14 items-center gap-1 px-1.5">
        {retour ? (
          <Link href={retour} aria-label="Retour" className="flex size-11 shrink-0 items-center justify-center rounded-full active:bg-white/15">
            <IconeRetour className="size-6" />
          </Link>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {titre ? <h1 className="truncate font-titre text-[20px] leading-tight font-bold">{titre}</h1> : null}
          {sousTitre ? <p className="truncate text-xs text-slate-300">{sousTitre}</p> : null}
        </div>
        {actions}
      </div>
    </header>
  );
}

/** Bloc de réglages façon WhatsApp : petit titre gris + carte blanche avec des lignes séparées. */
export function Groupe({ titre, aide, children }: { titre?: string; aide?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      {titre ? <h2 className="px-1 text-[13px] font-bold text-gris">{titre}</h2> : null}
      <div className="divide-y divide-trait overflow-hidden rounded-2xl bg-carte shadow-carte">{children}</div>
      {aide ? <p className="px-1 text-xs leading-relaxed text-gris">{aide}</p> : null}
    </section>
  );
}

/** Une ligne de formulaire dans un Groupe : libellé au-dessus, champ sans bordure. */
export function Ligne({ label, aide, children }: { label: string; aide?: string; children: React.ReactNode }) {
  return (
    <label className="flex min-h-14 flex-col justify-center px-4 py-2.5">
      <span className="text-[13px] font-semibold text-gris">{label}</span>
      {children}
      {aide ? <span className="mt-0.5 text-xs text-gris">{aide}</span> : null}
    </label>
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
