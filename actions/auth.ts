"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { LONGUEUR_MIN_MOT_DE_PASSE, normaliserTelephone } from "@/lib/format";

/*
 * Authentification Ligeey : numéro de téléphone + mot de passe.
 * - Un SMS seulement à l'inscription (confirmer le numéro) et pour « mot de passe oublié ».
 * - La connexion se fait avec le mot de passe, sans SMS.
 */

/** N'accepte que les chemins internes ("/messages"), jamais une URL externe. */
function cheminSur(valeur: FormDataEntryValue | null) {
  const s = String(valeur ?? "/");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

function lireTelephone(formData: FormData) {
  return normaliserTelephone(String(formData.get("telephone") ?? ""));
}

function lireCode(formData: FormData) {
  return String(formData.get("code") ?? "").replace(/\D/g, "");
}

function verifierMotDePasse(mdp: string) {
  if (mdp.length < LONGUEUR_MIN_MOT_DE_PASSE) return `Le mot de passe doit faire au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`;
  if (/^(\d)\1+$/.test(mdp) || mdp === "12345678" || mdp === "azertyui") return "Ce mot de passe est trop facile à deviner.";
  return null;
}

/** Après connexion : profil incomplet → page Bienvenue, sinon la page demandée. */
async function allerApresConnexion(supabase: SupabaseClient, userId: string, suite: string): Promise<never> {
  const { data: profil } = await supabase.from("profiles").select("nom_complet, quartier").eq("id", userId).single();
  const complet = Boolean(profil?.nom_complet && profil?.quartier);
  redirect(complet ? suite : `/bienvenue?suite=${encodeURIComponent(suite)}`);
}

/** Le fournisseur SMS (Twilio…) a refusé l'envoi : identifiants faux, crédit épuisé, numéro non autorisé. */
function smsNonEnvoye(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === "sms_send_failed" || /sms|provider|twilio/i.test(error.message ?? "")));
}
const SMS_NON_ENVOYE = "Le SMS de confirmation n'a pas pu être envoyé. Vérifiez le numéro ou réessayez plus tard.";

const NUMERO_INVALIDE = "Numéro invalide. Exemple : 77 123 45 67";
const CODE_INVALIDE = "Le code contient 6 chiffres.";

// ---------------------------------------------------------------------
// Créer un compte
// ---------------------------------------------------------------------
type Saisie = { telephone?: string; nom?: string };

export type EtatInscription = { etape: "infos" | "code"; telephone?: string; erreur?: string; renvoye?: boolean; saisie?: Saisie };

export async function inscription(etat: EtatInscription, formData: FormData): Promise<EtatInscription> {
  const supabase = await createClient();

  if (etat.etape === "infos") {
    const telephone = lireTelephone(formData);
    const nom = String(formData.get("nom") ?? "").trim();
    const motDePasse = String(formData.get("mot_de_passe") ?? "");
    // Renvoyée en cas d'erreur pour re-remplir le formulaire (React le vide après envoi)
    const saisie = { telephone: String(formData.get("telephone") ?? ""), nom };

    if (nom.length < 2 || nom.length > 60) return { etape: "infos", saisie, erreur: "Indiquez votre prénom et nom." };
    if (!telephone) return { etape: "infos", saisie, erreur: NUMERO_INVALIDE };
    const probleme = verifierMotDePasse(motDePasse);
    if (probleme) return { etape: "infos", saisie, erreur: probleme };

    const { data, error } = await supabase.auth.signUp({
      phone: telephone,
      password: motDePasse,
      options: { data: { nom_complet: nom } },
    });

    // Numéro déjà inscrit (Supabase renvoie soit une erreur, soit un compte sans identité)
    const dejaInscrit =
      error?.code === "phone_exists" ||
      error?.code === "user_already_exists" ||
      /already/i.test(error?.message ?? "") ||
      (data.user && data.user.identities?.length === 0);
    if (dejaInscrit) return { etape: "infos", saisie, erreur: "Ce numéro a déjà un compte. Connectez-vous ou utilisez « Mot de passe oublié »." };
    if (smsNonEnvoye(error)) {
      console.error("signUp (SMS)", error?.code, error?.message);
      return { etape: "infos", saisie, erreur: SMS_NON_ENVOYE };
    }
    if (error) {
      console.error("signUp", error.code, error.message);
      return { etape: "infos", saisie, erreur: "Inscription impossible pour le moment. Réessayez dans un instant." };
    }

    // Confirmation désactivée côté Supabase : la session existe déjà
    if (data.session && data.user) await allerApresConnexion(supabase, data.user.id, cheminSur(formData.get("suite")));

    return { etape: "code", telephone };
  }

  // Étape 2 : code SMS de confirmation du numéro
  if (formData.get("renvoyer") === "1" && etat.telephone) {
    const { error } = await supabase.auth.resend({ type: "sms", phone: etat.telephone });
    return { ...etat, erreur: error ? "Renvoi impossible, attendez une minute." : undefined, renvoye: !error };
  }

  const code = lireCode(formData);
  if (!etat.telephone || code.length !== 6) return { ...etat, erreur: CODE_INVALIDE, renvoye: false };

  const { data, error } = await supabase.auth.verifyOtp({ phone: etat.telephone, token: code, type: "sms" });
  if (error || !data.user) return { ...etat, erreur: "Code incorrect ou expiré.", renvoye: false };

  await allerApresConnexion(supabase, data.user.id, cheminSur(formData.get("suite")));
  return etat; // jamais atteint (redirection)
}

// ---------------------------------------------------------------------
// Se connecter
// ---------------------------------------------------------------------
export type EtatConnexion = { etape: "identifiants" | "code"; telephone?: string; erreur?: string; saisie?: Saisie };

export async function connexion(etat: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  const supabase = await createClient();
  const suite = cheminSur(formData.get("suite"));

  // Compte jamais confirmé : on termine la confirmation par SMS
  if (etat.etape === "code") {
    const code = lireCode(formData);
    if (!etat.telephone || code.length !== 6) return { ...etat, erreur: CODE_INVALIDE };
    const { data, error } = await supabase.auth.verifyOtp({ phone: etat.telephone, token: code, type: "sms" });
    if (error || !data.user) return { ...etat, erreur: "Code incorrect ou expiré." };
    await allerApresConnexion(supabase, data.user.id, suite);
  }

  const telephone = lireTelephone(formData);
  const motDePasse = String(formData.get("mot_de_passe") ?? "");
  const saisie = { telephone: String(formData.get("telephone") ?? "") };
  if (!telephone) return { etape: "identifiants", saisie, erreur: NUMERO_INVALIDE };
  if (!motDePasse) return { etape: "identifiants", saisie, erreur: "Entrez votre mot de passe." };

  const { data, error } = await supabase.auth.signInWithPassword({ phone: telephone, password: motDePasse });

  if (error?.code === "phone_not_confirmed") {
    await supabase.auth.resend({ type: "sms", phone: telephone });
    return { etape: "code", telephone, erreur: undefined };
  }
  if (error || !data.user) {
    // Même message que le numéro existe ou non : on ne révèle pas qui est inscrit
    return { etape: "identifiants", saisie, erreur: "Numéro ou mot de passe incorrect." };
  }

  await allerApresConnexion(supabase, data.user.id, suite);
  return etat;
}

// ---------------------------------------------------------------------
// Mot de passe oublié (et premier mot de passe des anciens comptes SMS)
// ---------------------------------------------------------------------
export type EtatReinitialisation = { etape: "telephone" | "code"; telephone?: string; erreur?: string; saisie?: Saisie };

export async function reinitialiserMotDePasse(etat: EtatReinitialisation, formData: FormData): Promise<EtatReinitialisation> {
  const supabase = await createClient();

  if (etat.etape === "telephone") {
    const telephone = lireTelephone(formData);
    if (!telephone) return { etape: "telephone", saisie: { telephone: String(formData.get("telephone") ?? "") }, erreur: NUMERO_INVALIDE };
    // shouldCreateUser: false → cette page ne crée jamais de compte
    const { error } = await supabase.auth.signInWithOtp({ phone: telephone, options: { shouldCreateUser: false } });
    if (smsNonEnvoye(error)) {
      console.error("reinitialisation (SMS)", error?.code, error?.message);
      return { etape: "telephone", erreur: SMS_NON_ENVOYE };
    }
    if (error && error.code !== "otp_disabled" && !/signups not allowed|not found/i.test(error.message)) {
      console.error("reinitialisation", error.code, error.message);
      return { etape: "telephone", erreur: "Envoi impossible pour le moment. Réessayez dans une minute." };
    }
    // On passe à l'étape code même si le numéro est inconnu : on ne révèle pas qui est inscrit
    return { etape: "code", telephone };
  }

  const code = lireCode(formData);
  const motDePasse = String(formData.get("mot_de_passe") ?? "");
  if (!etat.telephone || code.length !== 6) return { ...etat, erreur: CODE_INVALIDE };
  const probleme = verifierMotDePasse(motDePasse);
  if (probleme) return { ...etat, erreur: probleme };

  const { data, error } = await supabase.auth.verifyOtp({ phone: etat.telephone, token: code, type: "sms" });
  if (error || !data.user) return { ...etat, erreur: "Code incorrect ou expiré." };

  const { error: errMaj } = await supabase.auth.updateUser({ password: motDePasse });
  if (errMaj) {
    console.error("updateUser", errMaj.code, errMaj.message);
    return { ...etat, erreur: "Mot de passe refusé. Choisissez-en un autre." };
  }

  await allerApresConnexion(supabase, data.user.id, cheminSur(formData.get("suite")));
  return etat;
}

// ---------------------------------------------------------------------
// Après la première connexion : quartier et type de compte
// ---------------------------------------------------------------------
export type EtatSimple = { erreur?: string };

export async function terminerInscription(_: EtatSimple, formData: FormData): Promise<EtatSimple> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const nom = String(formData.get("nom") ?? "").trim();
  const quartier = String(formData.get("quartier") ?? "");
  const type = formData.get("type") === "artisan" ? "artisan" : "client";

  if (nom.length < 2 || nom.length > 60) return { erreur: "Indiquez votre nom (2 à 60 caractères)." };
  if (!quartier) return { erreur: "Choisissez votre quartier." };

  const { error } = await supabase.from("profiles").update({ nom_complet: nom, quartier }).eq("id", user.id);
  if (error) return { erreur: "Enregistrement impossible. Réessayez." };

  // Le rôle "artisan" est attribué automatiquement quand la fiche artisan est créée.
  redirect(type === "artisan" ? "/espace/profil?nouveau=1" : cheminSur(formData.get("suite")));
}

export async function deconnexion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
