import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages qui demandent d'être connecté
const ROUTES_PROTEGEES = ["/messages", "/espace", "/devis", "/admin", "/bienvenue", "/avis"];

// Rafraîchit la session Supabase à chaque requête et protège les pages privées.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Ne rien mettre entre createServerClient et getClaims (recommandation Supabase).
  // getClaims rafraîchit la session si besoin et vérifie le jeton sur place,
  // sans appel réseau à Supabase Auth à chaque page (contrairement à getUser).
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ?? null;

  const { pathname } = request.nextUrl;
  const protegee = ROUTES_PROTEGEES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  if (!user && protegee) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = `?suite=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return response;
}
