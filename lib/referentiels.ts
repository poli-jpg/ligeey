import type { SupabaseClient } from "@supabase/supabase-js";

export type Metier = { slug: string; nom: string };
export type Quartier = { slug: string; nom: string; commune: string };

export async function chargerReferentiels(supabase: SupabaseClient) {
  const [{ data: metiers }, { data: quartiers }] = await Promise.all([
    supabase.from("metiers").select("slug, nom").order("ordre"),
    supabase.from("quartiers").select("slug, nom, commune").order("nom"),
  ]);
  return { metiers: (metiers ?? []) as Metier[], quartiers: (quartiers ?? []) as Quartier[] };
}

export const JOURS = [
  { n: 1, court: "L", nom: "Lundi" },
  { n: 2, court: "M", nom: "Mardi" },
  { n: 3, court: "M", nom: "Mercredi" },
  { n: 4, court: "J", nom: "Jeudi" },
  { n: 5, court: "V", nom: "Vendredi" },
  { n: 6, court: "S", nom: "Samedi" },
  { n: 7, court: "D", nom: "Dimanche" },
];
