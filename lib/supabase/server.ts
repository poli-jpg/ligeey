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

/** Renvoie l'utilisateur connecté (ou null) et son profil. */
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profil: null };

  const { data: profil } = await supabase
    .from("profiles")
    .select("id, role, nom_complet, quartier, avatar_url, telephone_verifie")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profil };
}
