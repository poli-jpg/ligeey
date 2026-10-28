import type { Metadata } from "next";
import { getSession } from "@/lib/supabase/server";
import { chargerReferentiels } from "@/lib/referentiels";
import { Entete } from "@/components/ui";
import { FormulaireDemande } from "./FormulaireDemande";

export const metadata: Metadata = { title: "Nouvelle demande de devis" };

export default async function NouvelleDemande({ searchParams }: { searchParams: Promise<{ metier?: string }> }) {
  const { metier } = await searchParams;
  const { supabase, profil } = await getSession();
  const { metiers, quartiers } = await chargerReferentiels(supabase);

  return (
    <>
      <Entete titre="Nouvelle demande" retour="/devis" />
      <main className="px-4 pt-5 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <FormulaireDemande metiers={metiers} quartiers={quartiers} metierInitial={metier} quartierInitial={profil?.quartier} />
      </main>
    </>
  );
}
