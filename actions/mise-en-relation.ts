"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function utilisateur(suite = "/") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?suite=${encodeURIComponent(suite)}`);
  return { supabase, user };
}

/** Le client ouvre (ou retrouve) la conversation avec un artisan. */
export async function contacterArtisan(formData: FormData) {
  const artisanId = String(formData.get("artisan_id"));
  const { supabase, user } = await utilisateur(`/artisans/${artisanId}`);

  const { data: existante } = await supabase
    .from("conversations")
    .select("id")
    .eq("client_id", user.id)
    .eq("artisan_id", artisanId)
    .is("demande_id", null)
    .maybeSingle();

  if (existante) redirect(`/messages/${existante.id}`);

  const { data, error } = await supabase
    .from("conversations")
    .insert({ client_id: user.id, artisan_id: artisanId })
    .select("id")
    .single();

  if (error || !data) redirect(`/artisans/${artisanId}?erreur=contact`);
  redirect(`/messages/${data.id}`);
}

/** L'artisan répond à une demande de devis : conversation avec le client + formulaire d'offre. */
export async function repondreDemande(formData: FormData) {
  const demandeId = String(formData.get("demande_id"));
  const clientId = String(formData.get("client_id"));
  const { supabase, user } = await utilisateur("/espace");

  const { data: existante } = await supabase
    .from("conversations")
    .select("id")
    .eq("artisan_id", user.id)
    .eq("demande_id", demandeId)
    .maybeSingle();

  if (existante) redirect(`/messages/${existante.id}?offre=1`);

  const { data, error } = await supabase
    .from("conversations")
    .insert({ client_id: clientId, artisan_id: user.id, demande_id: demandeId })
    .select("id")
    .single();

  if (error || !data) redirect("/espace?erreur=demande");
  redirect(`/messages/${data.id}?offre=1`);
}

export type EtatDemande = { erreur?: string };

/** Le client publie une demande de devis, visible des artisans du métier. */
export async function publierDemande(_: EtatDemande, formData: FormData): Promise<EtatDemande> {
  const { supabase, user } = await utilisateur("/devis");

  const description = String(formData.get("description") ?? "").trim();
  const budget = parseInt(String(formData.get("budget") ?? "").replace(/\s/g, ""), 10);
  const demande = {
    client_id: user.id,
    metier: String(formData.get("metier") ?? ""),
    quartier: String(formData.get("quartier") ?? ""),
    urgence: String(formData.get("urgence") ?? "semaine"),
    description,
    budget: Number.isFinite(budget) && budget >= 0 ? budget : null,
  };

  if (!demande.metier) return { erreur: "Choisissez un métier." };
  if (!demande.quartier) return { erreur: "Choisissez votre quartier." };
  if (description.length < 10) return { erreur: "Décrivez le travail en quelques mots (10 caractères minimum)." };

  const { error } = await supabase.from("demandes").insert(demande);
  if (error) {
    console.error("publierDemande", error.message);
    return { erreur: "Publication impossible. Réessayez." };
  }

  revalidatePath("/devis");
  redirect("/devis?envoyee=1");
}

export async function fermerDemande(formData: FormData) {
  const { supabase, user } = await utilisateur("/devis");
  await supabase
    .from("demandes")
    .update({ statut: "fermee" })
    .eq("id", String(formData.get("id")))
    .eq("client_id", user.id);
  revalidatePath("/devis");
}

export type EtatAvis = { erreur?: string };

/** Avis du client après une mission terminée (la base vérifie la règle). */
export async function publierAvis(_: EtatAvis, formData: FormData): Promise<EtatAvis> {
  const { supabase, user } = await utilisateur();
  const offreId = String(formData.get("offre_id"));
  const artisanId = String(formData.get("artisan_id"));
  const noteDonnee = Number(formData.get("note"));

  if (!(noteDonnee >= 1 && noteDonnee <= 5)) return { erreur: "Choisissez une note de 1 à 5 étoiles." };

  const { error } = await supabase.from("avis").insert({
    offre_id: offreId,
    artisan_id: artisanId,
    client_id: user.id,
    note: noteDonnee,
    tags: formData.getAll("tags").map(String).slice(0, 5),
    commentaire: String(formData.get("commentaire") ?? "").trim() || null,
  });

  if (error) {
    return {
      erreur: error.code === "23505" ? "Vous avez déjà noté cette mission." : "Avis impossible : la mission doit être terminée.",
    };
  }

  revalidatePath(`/artisans/${artisanId}`);
  redirect(`/artisans/${artisanId}?merci=1`);
}

/** Validation de la pièce d'identité par un administrateur. */
export async function traiterVerification(formData: FormData) {
  const { supabase } = await utilisateur("/admin");
  const { error } = await supabase.rpc("traiter_verification", {
    p_verification: String(formData.get("id")),
    p_valider: formData.get("decision") === "valider",
    p_motif: String(formData.get("motif") ?? "") || null,
  });
  if (error) console.error("traiterVerification", error.message);
  revalidatePath("/admin");
}
