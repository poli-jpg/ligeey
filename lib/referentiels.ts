import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

export type Metier = { slug: string; nom: string };
export type Quartier = { slug: string; nom: string; commune: string };

// Métiers et quartiers changent rarement et sont publics : on les garde en cache
// côté serveur (1 h) au lieu de les relire dans la base à chaque page.
// Client sans cookies : la lecture ne dépend pas de l'utilisateur.
const lireReferentiels = unstable_cache(
  async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const [{ data: metiers, error: e1 }, { data: quartiers, error: e2 }] = await Promise.all([
      supabase.from("metiers").select("slug, nom").order("ordre"),
      supabase.from("quartiers").select("slug, nom, commune").order("nom"),
    ]);
    // Ne pas mettre en cache une réponse en erreur
    if (e1 || e2) throw new Error(`Référentiels : ${(e1 ?? e2)!.message}`);
    return { metiers: (metiers ?? []) as Metier[], quartiers: (quartiers ?? []) as Quartier[] };
  },
  ["referentiels-v1"],
  { revalidate: 3600, tags: ["referentiels"] },
);

export async function chargerReferentiels() {
  try {
    return await lireReferentiels();
  } catch (e) {
    console.error(e);
    return { metiers: [] as Metier[], quartiers: [] as Quartier[] };
  }
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
