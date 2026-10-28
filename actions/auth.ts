"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normaliserTelephone } from "@/lib/format";

/** N'accepte que les chemins internes ("/messages"), jamais une URL externe. */
function cheminSur(valeur: FormDataEntryValue | null) {
  const s = String(valeur ?? "/");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export type EtatConnexion = {
  etape: "telephone" | "code";
  telephone?: string;
  erreur?: string;
};

// Étape 1 : envoi du code SMS. Étape 2 : vérification du code.
export async function connexion(etat: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  const supabase = await createClient();

  if (etat.etape === "telephone") {
    const telephone = normaliserTelephone(String(formData.get("telephone") ?? ""));
    if (!telephone) {
      return { etape: "telephone", erreur: "Numéro invalide. Exemple : 77 123 45 67" };
    }
    const { error } = await supabase.auth.signInWithOtp({ phone: telephone });
    if (error) {
      console.error("signInWithOtp", error.message);
      return { etape: "telephone", erreur: "Impossible d'envoyer le code pour le moment. Réessayez." };
    }
    return { etape: "code", telephone };
  }

  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!etat.telephone || code.length !== 6) {
    return { ...etat, erreur: "Le code contient 6 chiffres." };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: etat.telephone,
    token: code,
    type: "sms",
  });
  if (error || !data.user) {
    return { ...etat, erreur: "Code incorrect ou expiré." };
  }

  const suite = cheminSur(formData.get("suite"));
  const { data: profil } = await supabase
    .from("profiles")
    .select("nom_complet")
    .eq("id", data.user.id)
    .single();

  redirect(profil?.nom_complet ? suite : `/bienvenue?suite=${encodeURIComponent(suite)}`);
}

export type EtatSimple = { erreur?: string };

// Après la première connexion : nom, quartier et type de compte
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

  const { error } = await supabase
    .from("profiles")
    .update({ nom_complet: nom, quartier })
    .eq("id", user.id);
  if (error) return { erreur: "Enregistrement impossible. Réessayez." };

  // Le rôle "artisan" est attribué automatiquement quand la fiche artisan est créée.
  redirect(type === "artisan" ? "/espace/profil?nouveau=1" : cheminSur(formData.get("suite")));
}

export async function deconnexion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
