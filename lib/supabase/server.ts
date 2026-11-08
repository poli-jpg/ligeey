import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client Supabase pour les Server Components, Server Actions et Route Handlers.
// Il agit avec la session de l'utilisateur connecté : les règles RLS s'appliquent.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component : sans effet, le proxy rafraîchit la session.
          }
        },
      },
    },
  );
}

/**
 * Utilisateur connecté (ou null), lu depuis le jeton de session.
 * getClaims() vérifie la signature du jeton sur place (clés asymétriques) : pas
 * d'aller-retour vers Supabase Auth comme avec getUser(). Mis en cache pour la
 * durée de la requête : plusieurs appels dans une même page = un seul calcul.
 */
export const getUtilisateur = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  return { supabase, user: id ? { id } : null };
});

/** Renvoie l'utilisateur connecté (ou null) et son profil. */
export const getSession = cache(async () => {
  const { supabase, user } = await getUtilisateur();
  if (!user) return { supabase, user: null, profil: null };

  const { data: profil, error } = await supabase
    .from("profiles")
    .select("id, role, nom_complet, quartier, avatar_url, telephone_verifie")
    .eq("id", user.id)
    .maybeSingle();

  // Base pas encore migrée (colonne telephone_verifie absente) : on lit le profil sans elle
  if (error) {
    console.error("getSession profil", error.code, error.message);
    const { data: base } = await supabase
      .from("profiles")
      .select("id, role, nom_complet, quartier, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    return { supabase, user, profil: base ? { ...base, telephone_verifie: false } : null };
  }

  return { supabase, user, profil };
});
