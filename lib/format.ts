export function initiales(nom: string) {
  const parties = nom.trim().split(/\s+/).filter(Boolean);
  if (parties.length === 0) return "?";
  return (parties[0][0] + (parties[1]?.[0] ?? "")).toUpperCase();
}

export function fcfa(montant: number | null | undefined) {
  if (montant == null) return "Sur devis";
  return new Intl.NumberFormat("fr-FR").format(montant) + " FCFA";
}

export function note(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function dateCourte(iso: string | null) {
  if (!iso) return "À convenir";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Dakar",
  }).format(new Date(iso));
}

export function heure(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Dakar",
  }).format(new Date(iso));
}

/** Numéro sénégalais saisi ("78 465 32 51") → format international "+221784653251" */
export function normaliserTelephone(saisie: string) {
  const chiffres = saisie.replace(/\D/g, "");
  if (chiffres.startsWith("221") && chiffres.length === 12) return "+" + chiffres;
  if (chiffres.length === 9) return "+221" + chiffres;
  return null;
}

/** Longueur minimale du mot de passe (à régler aussi dans Supabase › Authentication › Policies). */
export const LONGUEUR_MIN_MOT_DE_PASSE = 8;

/**
 * Les routes de Dakar font des détours (presqu'île, autoroute, Patte d'Oie…) :
 * on estime la distance par la route à partir de la ligne droite entre les
 * centres des quartiers, avec un ratio de détour courant en ville (≈ 1,3 à 1,4).
 * À ajuster si les retours des clients montrent un écart.
 */
export const DETOUR_ROUTE = 1.35;

/**
 * Distance telle qu'on l'affiche au client.
 * depuisGps : le point de départ est la position du téléphone (et non le centre d'un quartier).
 */
export function distance(km: number | string | null | undefined, depuisGps = false) {
  if (km == null) return null;
  const ligneDroite = Number(km);
  if (!Number.isFinite(ligneDroite)) return null;
  // Même quartier : positions identiques (centre du quartier)
  if (ligneDroite < 0.5) return depuisGps ? "À moins de 1 km" : "Même quartier";
  const route = ligneDroite * DETOUR_ROUTE;
  // Moins de 10 km : à 0,5 km près ; au-delà, au km près
  const arrondi = route < 10 ? Math.max(1, Math.round(route * 2) / 2) : Math.round(route);
  return `≈ ${arrondi.toLocaleString("fr-FR")} km`;
}

/** Heure si c'est aujourd'hui, « Hier », sinon la date courte (comme WhatsApp). */
export function quand(iso: string) {
  const d = new Date(iso);
  const jour = (x: Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Dakar", dateStyle: "short" }).format(x);
  const maintenant = new Date();
  if (jour(d) === jour(maintenant)) return heure(iso);
  if (jour(d) === jour(new Date(maintenant.getTime() - 86400000))) return "Hier";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Dakar" }).format(d);
}
