// Icônes SVG au trait. Taille et couleur via className (currentColor).
type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export const IconeRetour = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M15 18l-6-6 6-6" /></svg>
);
export const IconeSuite = ({ className = "size-4" }: P) => (
  <svg {...base} className={className}><path d="M9 6l6 6-6 6" /></svg>
);
export const IconeRecherche = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
);
export const IconeLieu = ({ className = "size-4" }: P) => (
  <svg {...base} className={className}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const IconeAccueil = ({ className = "size-[22px]" }: P) => (
  <svg {...base} className={className}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>
);
export const IconeMessage = ({ className = "size-[22px]" }: P) => (
  <svg {...base} className={className}><path d="M4 5h16v11H8l-4 4z" /></svg>
);
export const IconeCompte = ({ className = "size-[22px]" }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
);
export const IconeDevis = ({ className = "size-[22px]" }: P) => (
  <svg {...base} className={className}><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></svg>
);
export const IconeTableau = ({ className = "size-[22px]" }: P) => (
  <svg {...base} className={className}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
);
export const IconePhoto = ({ className = "size-[22px]" }: P) => (
  <svg {...base} className={className}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="12" cy="12" r="3.5" /></svg>
);
export const IconeEnvoyer = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M4 12l16-8-6 16-2-7z" /></svg>
);
export const IconeFermer = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconeHorloge = ({ className = "size-4" }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IconeOutil = ({ className = "size-4" }: P) => (
  <svg {...base} className={className}><path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z" /></svg>
);
export const IconeVerifie = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Profil vérifié">
    <path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z" fill="#15803d" />
    <path d="M8 12.3l2.7 2.7L16 9.7" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IconeEtoile = ({ className = "size-4", pleine = true }: P & { pleine?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill={pleine ? "#f5b70f" : "none"} stroke={pleine ? "#d39a00" : "#9aa3af"} strokeWidth="1.5" strokeLinejoin="round">
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </svg>
);
export const IconeBouclier = ({ className = "size-7" }: P) => (
  <svg {...base} className={className}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-4.5" /></svg>
);

// ---- Une icône par métier -------------------------------------------------
const METIERS: Record<string, React.ReactNode> = {
  macon: (<><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M3 10h18M3 15h18M9 5v5M15 10v5M9 15v4" /></>),
  electricien: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  plombier: (<><path d="M4 8h9a4 4 0 0 1 4 4v1" /><path d="M8 5v3M5 5h6" /><path d="M17 16.5c-1 1.3-1.5 2.2-1.5 2.9a1.5 1.5 0 0 0 3 0c0-.7-.5-1.6-1.5-2.9z" /></>),
  peintre: (<><rect x="3" y="3" width="14" height="6" rx="1.5" /><path d="M17 6h3v5h-8v3" /><rect x="10" y="14" width="4" height="7" rx="1" /></>),
  menuisier: (<><path d="M3 20l9-9" /><path d="M14 4l6 6-3 3-6-6z" /><path d="M5 14l5 5" /></>),
  carreleur: (<><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></>),
  soudeur: (<><path d="M4 20l7-7" /><path d="M11 13l3-3 2 2-3 3z" /><path d="M17 4v2M20 7h-2M19.5 4.5L18 6M14 3l.5 1.5" /></>),
  frigoriste: (<><path d="M12 2v20M4.9 7l14.2 10M4.9 17L19.1 7" /><path d="M9 4l3 2 3-2M9 20l3-2 3 2" /></>),
  etancheur: (<><path d="M3 11l9-7 9 7" /><path d="M8 15c0 1.7 1.8 3 4 3s4-1.3 4-3c0-2-4-5-4-5s-4 3-4 5z" /></>),
  platrier: (<><path d="M3 21h18" /><path d="M5 21V9l7-5 7 5v12" /><path d="M9 21v-6h6v6" /></>),
};

export function IconeMetier({ slug, className = "size-7" }: { slug: string; className?: string }) {
  return (
    <svg {...base} strokeWidth={1.8} className={className}>
      {METIERS[slug] ?? <path d="M3 11l9-7 9 7M5 10v10h14V10" />}
    </svg>
  );
}

// ---- Logo -----------------------------------------------------------------
export function Logo({ clair = false }: { clair?: boolean }) {
  return (
    <span className={`flex items-center gap-2 font-titre text-[22px] font-extrabold tracking-tight ${clair ? "text-white" : "text-encre"}`}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#f5b70f" />
        <path d="M8 23V13.5L16 8l8 5.5V23" fill="none" stroke="#141a26" strokeWidth="2.8" strokeLinejoin="round" />
        <path d="M13 23v-5h6v5" fill="none" stroke="#141a26" strokeWidth="2.8" strokeLinejoin="round" />
      </svg>
      Ligeey
    </span>
  );
}
