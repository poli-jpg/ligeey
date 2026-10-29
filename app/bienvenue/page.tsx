import type { Metadata } from "next";
import { getSession } from "@/lib/supabase/server";
import { chargerReferentiels } from "@/lib/referentiels";
import { Logo } from "@/components/Icones";
import { FormulaireBienvenue } from "./FormulaireBienvenue";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function Bienvenue({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  const { supabase, profil } = await getSession();
  const { quartiers } = await chargerReferentiels(supabase);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-col gap-8 rounded-b-[32px] bg-nuit px-5 pt-[calc(env(safe-area-inset-top)+24px)] pb-9">
        <Logo clair />
        <div className="flex flex-col gap-2">
          <h1 className="font-titre text-[32px] leading-[1.05] font-extrabold tracking-tight text-white">Bienvenue</h1>
          <p className="text-[15px] text-slate-300">Votre numéro est confirmé. Plus qu&apos;une étape.</p>
        </div>
      </header>
      <main className="px-5 pt-7 pb-10">
        <FormulaireBienvenue quartiers={quartiers} suite={suite ?? "/"} nomInitial={profil?.nom_complet || undefined} />
      </main>
    </div>
  );
}
