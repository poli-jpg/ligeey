"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function utilisateur() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  return { supabase, user };
}

function entier(v: FormDataEntryValue | null) {
  const n = parseInt(String(v ?? "").replace(/\s/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export type EtatProfil = { erreur?: string; ok?: boolean };

// Crée ou met à jour la fiche artisan
export async function enregistrerProfilArtisan(_: EtatProfil, formData: FormData): Promise<EtatProfil> {
  const { supabase, user } = await utilisateur();

  const fiche = {
    metier: String(formData.get("metier") ?? ""),
    quartier_base: String(formData.get("quartier_base") ?? ""),
    bio: String(formData.get("bio") ?? "").trim() || null,
    annees_experience: entier(formData.get("annees_experience")),
    tarif_base: entier(formData.get("tarif_base")),
    competences: String(formData.get("competences") ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 12),
    zones: formData.getAll("zones").map(String),
    jours_dispo: formData.getAll("jours").map((j) => Number(j)).filter((j) => j >= 1 && j <= 7),
  };

  if (!fiche.metier) return { erreur: "Choisissez votre métier." };
  if (!fiche.quartier_base) return { erreur: "Choisissez votre quartier de base." };

  const { data: existe } = await supabase.from("artisans").select("id").eq("id", user.id).maybeSingle();

  // Pas d'upsert : les droits par colonne interdisent de réécrire "id".
  const { error } = existe
    ? await supabase.from("artisans").update(fiche).eq("id", user.id)
    : await supabase.from("artisans").insert({ id: user.id, ...fiche });

  if (error) {
    console.error("enregistrerProfilArtisan", error.message);
    return { erreur: "Enregistrement impossible. Vérifiez les champs." };
  }

  revalidatePath("/espace");
  revalidatePath(`/artisans/${user.id}`);
  if (!existe) redirect("/espace");
  return { ok: true };
}

export async function basculerDisponibilite(disponible: boolean) {
  const { supabase, user } = await utilisateur();
  await supabase.from("artisans").update({ disponible }).eq("id", user.id);
  revalidatePath("/espace");
}

// Appelée après l'envoi de la photo dans le bucket "realisations"
export async function ajouterRealisation(imagePath: string, legende: string) {
  const { supabase, user } = await utilisateur();
  if (!imagePath.startsWith(`${user.id}/`)) throw new Error("Chemin invalide");

  const { error } = await supabase
    .from("realisations")
    .insert({ artisan_id: user.id, image_path: imagePath, legende: legende.slice(0, 140) || null });
  if (error) throw new Error("Ajout impossible");

  revalidatePath("/espace/profil");
  revalidatePath(`/artisans/${user.id}`);
}

export async function supprimerRealisation(formData: FormData) {
  const { supabase, user } = await utilisateur();
  const id = String(formData.get("id"));
  const { data } = await supabase
    .from("realisations")
    .delete()
    .eq("id", id)
    .eq("artisan_id", user.id)
    .select("image_path")
    .maybeSingle();
  if (data) await supabase.storage.from("realisations").remove([data.image_path]);
  revalidatePath("/espace/profil");
}

// Appelée après l'envoi de la pièce d'identité dans le bucket privé
export async function envoyerVerification(documentPath: string) {
  const { supabase, user } = await utilisateur();
  if (!documentPath.startsWith(`${user.id}/`)) throw new Error("Chemin invalide");

  const { error } = await supabase
    .from("verifications")
    .insert({ artisan_id: user.id, document_path: documentPath });
  if (error) throw new Error("Envoi impossible");
  revalidatePath("/espace/profil");
}
