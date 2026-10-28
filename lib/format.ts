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
