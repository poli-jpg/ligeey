import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { traiterVerification } from "@/actions/mise-en-relation";
import Link from "next/link";
import { Entete, Titre2, Vide } from "@/components/ui";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

export default async function Admin() {
  const { supabase, user, profil } = await getSession();
  if (!user) redirect("/connexion?suite=/admin");
  if (profil?.role !== "admin") notFound();

  const [{ data: verifications }, { data: signalements }] = await Promise.all([
    supabase
      .from("verifications")
      .select("id, document_path, created_at, artisan:artisans(id, metier, profil:profiles!artisans_id_fkey(nom_complet))")
      .eq("statut", "en_attente")
      .order("created_at"),
    supabase.from("signalements").select("id, motif, created_at, artisan_id").eq("traite", false).order("created_at").limit(50),
  ]);

  // Liens temporaires (10 min) vers les pièces d'identité, bucket privé
  const liens = await Promise.all(
    (verifications ?? []).map((v) =>
      supabase.storage.from("pieces-identite").createSignedUrl(v.document_path, 600).then((r) => r.data?.signedUrl ?? null),
    ),
  );

  return (
    <>
      <Entete titre="Administration" retour="/" />
      <main className="flex flex-col gap-4 px-5 pb-10">
        <Titre2>Pièces d&apos;identité à vérifier ({verifications?.length ?? 0})</Titre2>
        {!verifications?.length ? <Vide>Rien à vérifier.</Vide> : null}
        {verifications?.map((v, i) => {
          const a = v.artisan as unknown as { id: string; metier: string; profil: { nom_complet: string } };
          return (
            <article key={v.id} className="flex flex-col gap-3 rounded-2xl border border-trait bg-carte p-4">
              <div className="flex items-center justify-between">
                <Link href={`/artisans/${a.id}`} className="font-bold">{a.profil.nom_complet}</Link>
                <span className="text-xs text-gris">{a.metier}</span>
              </div>
              {liens[i] ? (
                <a href={liens[i]!} target="_blank" rel="noreferrer" className="bouton-secondaire">Ouvrir la pièce</a>
              ) : (
                <span className="text-sm text-red-700">Fichier introuvable</span>
              )}
              <form action={traiterVerification} className="flex flex-col gap-2">
                <input type="hidden" name="id" value={v.id} />
                <input name="motif" placeholder="Motif si refus (photo floue, nom différent…)" aria-label="Motif du refus" className="champ" />
                <div className="flex gap-2">
                  <button name="decision" value="refuser" className="bouton-secondaire flex-1">Refuser</button>
                  <button name="decision" value="valider" className="bouton min-h-11 flex-1 text-sm">Valider</button>
                </div>
              </form>
            </article>
          );
        })}

        <Titre2>Signalements ({signalements?.length ?? 0})</Titre2>
        {!signalements?.length ? <Vide>Aucun signalement.</Vide> : null}
        {signalements?.map((s) => (
          <article key={s.id} className="rounded-2xl border border-trait bg-carte p-4 text-sm">
            {s.motif}
          </article>
        ))}
      </main>
    </>
  );
}
