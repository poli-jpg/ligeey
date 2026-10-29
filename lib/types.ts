// Types de l'application, alignés sur supabase/migrations.
// Pour des types générés automatiquement : npx supabase gen types typescript --linked > lib/database.types.ts

export type Role = "client" | "artisan" | "admin";
export type StatutOffre = "envoyee" | "acceptee" | "refusee" | "terminee" | "annulee";
export type Urgence = "urgent" | "semaine" | "flexible";
export type StatutVerification = "non_soumis" | "en_attente" | "verifie" | "refuse";
export type TypeMessage = "texte" | "image" | "vocal" | "offre";

export type Profil = {
  id: string;
  role: Role;
  nom_complet: string;
  quartier: string | null;
  avatar_url: string | null;
  telephone_verifie?: boolean;
};

export type ArtisanRecherche = {
  id: string;
  nom_complet: string;
  avatar_url: string | null;
  metier: string;
  metier_nom: string;
  annees_experience: number | null;
  tarif_base: number | null;
  quartier_base: string | null;
  note_moyenne: number;
  nb_avis: number;
  disponible: boolean;
  verifie: boolean;
  telephone_verifie: boolean;
  distance_km: number | null;
};

export type Offre = {
  id: string;
  conversation_id: string;
  artisan_id: string;
  client_id: string;
  titre: string;
  prix: number;
  date_prevue: string | null;
  duree: string | null;
  statut: StatutOffre;
  created_at: string;
};

export type Message = {
  id: number;
  conversation_id: string;
  auteur_id: string;
  type: TypeMessage;
  contenu: string | null;
  media_path: string | null;
  offre_id: string | null;
  created_at: string;
};

/** Badge « Recommandé » : calculé à partir des avis, jamais attribué à la main. */
export const SEUIL_RECOMMANDE = { note: 4.5, avis: 10 };
export function estRecommande(note: number, nbAvis: number) {
  return nbAvis >= SEUIL_RECOMMANDE.avis && note >= SEUIL_RECOMMANDE.note;
}

export const RAISONS_SIGNALEMENT = [
  { v: "faux_profil", label: "Faux profil ou fausse identité" },
  { v: "arnaque", label: "Arnaque ou demande d'argent suspecte" },
  { v: "comportement", label: "Comportement irrespectueux ou menaçant" },
  { v: "travail_bacle", label: "Travail bâclé ou abandonné" },
  { v: "autre", label: "Autre raison" },
] as const;
