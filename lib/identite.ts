// Vérification d'identité des artisans : constantes partagées (client, serveur, admin)

export const TYPES_PIECE = [
  { v: "cni", label: "Carte d'identité CEDEAO", verso: true },
  { v: "passeport", label: "Passeport", verso: false },
  { v: "permis", label: "Permis de conduire", verso: true },
] as const;

export type TypePiece = (typeof TYPES_PIECE)[number]["v"];

export const estTypePiece = (v: unknown): v is TypePiece => TYPES_PIECE.some((t) => t.v === v);
export const libellePiece = (v: string | null) => TYPES_PIECE.find((t) => t.v === v)?.label ?? "Pièce d'identité";
export const besoinVerso = (v: string | null) => TYPES_PIECE.find((t) => t.v === v)?.verso ?? true;

/** Motifs de refus proposés à l'admin (affichés tels quels à l'artisan). */
export const MOTIFS_REFUS = [
  "Photo floue ou illisible",
  "Il manque le recto ou le verso de la pièce",
  "Le nom ne correspond pas à celui du profil",
  "Pièce expirée",
  "Document non valable (photocopie, capture d'écran, photo d'un écran)",
] as const;

/** Une photo de pièce doit être assez grande pour que le texte soit lisible. */
export const COTE_MIN_PX = 700;

/** Photo prise depuis moins de… (filtre les images anciennes ou récupérées ailleurs). */
export const FRAICHEUR_MAX_MS = 20 * 60 * 1000;

/** Numéro de pièce → forme comparable (majuscules, lettres et chiffres seulement). */
export function normaliserNumero(numero: string) {
  return numero.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Nom → mots comparables, sans accents ni casse ni ordre. */
function motsNom(nom: string) {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((m) => m.length > 1);
}

/** Le nom écrit sur la pièce contient-il tous les mots du nom du profil ? */
export function nomsConcordent(nomProfil: string, nomPiece: string | null) {
  if (!nomPiece) return false;
  const piece = new Set(motsNom(nomPiece));
  const profil = motsNom(nomProfil);
  return profil.length > 0 && profil.every((m) => piece.has(m));
}
