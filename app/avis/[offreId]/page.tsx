import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Entete, Vide } from "@/components/ui";
import { FormulaireAvis } from "./FormulaireAvis";

export const metadata: Metadata = { title: "Noter l'artisan" };

export default async function NoterArtisan({ params }: { params: Promise<{ offreId: string }> }) {
  const { offreId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?suite=/avis/${offreId}`);

  const { data: offre } = await supabase
    .from("offres")
    .select("id, titre, statut, client_id, artisan_id, conversation_id, artisan:artisans(profil:profiles!artisans_id_fkey(nom_complet))")
    .eq("id", offreId)
    .maybeSingle();
  if (!offre || offre.client_id !== user.id) notFound();

  const { data: dejaNote } = await supabase.from("avis").select("id").eq("offre_id", offreId).maybeSingle();
  const nom = (offre.artisan as unknown as { profil: { nom_complet: string } }).profil.nom_complet;

  return (
    <>
      <Entete retour={`/messages/${offre.conversation_id}`} />
      <main className="flex flex-col items-center gap-5 px-6 pb-10">
        <Avatar nom={nom} taille="lg" />
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-titre text-[22px] font-bold">Comment s&apos;est passé le travail ?</h1>
          <p className="text-sm text-gris">{nom} · {offre.titre}</p>
        </div>
        {dejaNote ? (
          <Vide>Vous avez déjà noté cette mission. Merci !</Vide>
        ) : offre.statut !== "terminee" ? (
          <Vide>Vous pourrez noter l&apos;artisan une fois le travail marqué comme terminé dans la discussion.</Vide>
        ) : (
          <FormulaireAvis offreId={offre.id} artisanId={offre.artisan_id} />
        )}
      </main>
    </>
  );
}
