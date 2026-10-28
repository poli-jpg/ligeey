import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { chargerReferentiels } from "@/lib/referentiels";
import { FormulaireBienvenue } from "./FormulaireBienvenue";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function Bienvenue({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  const supabase = await createClient();
  const { quartiers } = await chargerReferentiels(supabase);

  return (
    <main className="flex flex-col gap-6 px-5 pt-12 pb-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-titre text-[26px] leading-tight font-bold">Bienvenue sur Ligeey</h1>
        <p className="text-[15px] text-gris">Encore deux informations et c&apos;est prêt.</p>
      </div>
      <FormulaireBienvenue quartiers={quartiers} suite={suite ?? "/"} />
    </main>
  );
}
