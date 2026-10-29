import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Entete } from "@/components/ui";
import { FormulaireSignalement } from "./FormulaireSignalement";

export const metadata: Metadata = { title: "Signaler un profil", robots: { index: false } };

export default async function Signaler({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?suite=/artisans/${id}/signaler`);
  if (user.id === id) redirect(`/artisans/${id}`);

  const { data: artisan } = await supabase
    .from("artisans")
    .select("id, profil:profiles!artisans_id_fkey(nom_complet)")
    .eq("id", id)
    .maybeSingle();
  if (!artisan) notFound();
  const nom = (artisan.profil as unknown as { nom_complet: string }).nom_complet;

  return (
    <>
      <Entete titre="Signaler un profil" sousTitre={nom} retour={`/artisans/${id}`} />
      <main className="flex flex-col gap-5 px-4 pt-5 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <p className="px-1 text-[15px] leading-relaxed text-gris">
          Votre signalement reste confidentiel : {nom.split(" ")[0]} ne saura pas qui l&apos;a envoyé.
        </p>
        <FormulaireSignalement artisanId={id} />
      </main>
    </>
  );
}
