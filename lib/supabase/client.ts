import { createBrowserClient } from "@supabase/ssr";

// Client Supabase côté navigateur (composants "use client") : chat temps réel, envoi de photos.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
