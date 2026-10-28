// Icônes SVG au trait (même style que la maquette). Taille et couleur via className.
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
export const IconeTableau = ({ className = "size-[22px]" }: P) => (
  <svg {...base} className={className}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
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
export const IconeVerifie = ({ className = "size-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Profil vérifié">
    <circle cx="12" cy="12" r="10" fill="#15803d" />
    <path d="M7.5 12.5l3 3 6-6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IconeEtoile = ({ className = "size-4", pleine = true }: P & { pleine?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill={pleine ? "#c2410c" : "none"} stroke="#c2410c" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </svg>
);
export const IconeBouclier = ({ className = "size-7" }: P) => (
  <svg {...base} className={className}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-4.5" /></svg>
);
export const IconeTelephone = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>
);
