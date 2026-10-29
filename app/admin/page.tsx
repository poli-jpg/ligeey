import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { masquerArtisan, traiterSignalement, traiterVerification } from "@/actions/mise-en-relation";
import { deconnexion } from "@/actions/auth";
import { RAISONS_SIGNALEMENT } from "@/lib/types";
import { BarreNav } from "@/components/BarreNav";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { IconeMetier } from "@/components/Icones";
import { Avatar, Entete, Vide } from "@/components/ui";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

type Verification = {
  id: string;
  document_path: string;
  created_at: string;
  artisan: { id: string; metier: string; profil: { nom_complet: string } };
};

export default async function Admin() {
  const { supabase, user, profil } = await getSession();
  if (!user) redirect("/connexion?suite=/admin");
  // Compte non admin : retour à l'accueil plutôt qu'une page « introuvable »
  if (profil?.role !== "admin") redirect("/");

  const [{ data }, { data: signalements }, { count: nbVerifies }] = await Promise.all([
    supabase
      .from("verifications")
      .select("id, document_path, created_at, artisan:artisans(id, metier, profil:profiles!artisans_id_fkey(nom_complet))")
      .eq("statut", "en_attente")
      .order("created_at"),
    supabase
      .from("signalements")
      .select("id, raison, motif, created_at, artisan:artisans(id, masque, profil:profiles!artisans_id_fkey(nom_complet))")
      .eq("traite", false)
      .order("created_at")
      .limit(50),
    supabase.from("artisans").select("id", { count: "exact", head: true }).eq("verification", "verifie"),
  ]);
  const verifications = (data ?? []) as unknown as Verification[];

  // Liens temporaires (10 min) vers les pièces : le bucket est privé
  const liens = await Promise.all(
    verifications.map((v) =>
      supabase.storage.from("pieces-identite").createSignedUrl(v.document_path, 600).then((r) => r.data?.signedUrl ?? null),
    ),
  );

  return (
    <>
      <Entete titre="Administration" sousTitre={`${nbVerifies ?? 0} artisan${(nbVerifies ?? 0) > 1 ? "s" : ""} vérifié${(nbVerifies ?? 0) > 1 ? "s" : ""}`} />
      <main className="flex flex-col gap-6 px-4 pt-5 pb-6">
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-[13px] font-bold text-gris">Pièces d&apos;identité à vérifier ({verifications.length})</h2>
          {verifications.length === 0 ? <Vide>Rien à vérifier pour le moment.</Vide> : null}

          {verifications.map((v, i) => {
            const lien = liens[i];
            const estPdf = v.document_path.endsWith(".pdf");
            return (
              <article key={v.id} className="carte flex flex-col gap-4 p-4">
                <Link href={`/artisans/${v.artisan.id}`} className="flex items-center gap-3">
                  <Avatar nom={v.artisan.profil.nom_complet} />
                  <span className="flex flex-col">
                    <span className="text-base font-extrabold">{v.artisan.profil.nom_complet}</span>
                    <span className="flex items-center gap-1.5 text-[13px] text-gris">
                      <IconeMetier slug={v.artisan.metier} className="size-4" />
                      Envoyée le {new Date(v.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                    </span>
                  </span>
                </Link>

                {lien && !estPdf ? (
                  <a href={lien} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl bg-photo">
                    {/* eslint-disable-next-line @next/next/no-img-element -- lien signé temporaire vers un bucket privé */}
                    <img src={lien} alt={`Pièce d'identité de ${v.artisan.profil.nom_complet}`} className="max-h-72 w-full object-contain" />
                  </a>
                ) : lien ? (
                  <a href={lien} target="_blank" rel="noreferrer" className="bouton-secondaire">Ouvrir le PDF</a>
                ) : (
                  <p className="text-sm font-semibold text-red-700">Fichier introuvable</p>
                )}

                <p className="text-[13px] leading-relaxed text-gris">
                  Vérifiez que le nom et la photo correspondent au profil, et que la pièce est lisible et en cours de validité.
                </p>

                <form action={traiterVerification} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={v.id} />
                  <input name="motif" placeholder="Motif si refus : photo floue, nom différent…" aria-label="Motif du refus" className="champ" />
                  <div className="grid grid-cols-2 gap-2">
                    <button name="decision" value="refuser" className="bouton-secondaire min-h-[52px]">Refuser</button>
                    <BoutonEnvoi className="bouton" name="decision" value="valider" enCours="Validation…">
                      Valider le badge
                    </BoutonEnvoi>
                  </div>
                </form>
              </article>
            );
          })}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-[13px] font-bold text-gris">Signalements à examiner ({signalements?.length ?? 0})</h2>
          {!signalements?.length ? <Vide>Aucun signalement en attente.</Vide> : null}
          {(signalements ?? []).map((sg) => {
            const a = sg.artisan as unknown as { id: string; masque: boolean; profil: { nom_complet: string } } | null;
            const raison = RAISONS_SIGNALEMENT.find((r) => r.v === sg.raison)?.label ?? "Autre raison";
            return (
              <article key={sg.id} className="carte flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  {a ? (
                    <Link href={`/artisans/${a.id}`} className="text-base font-extrabold">{a.profil.nom_complet}</Link>
                  ) : (
                    <span className="text-base font-extrabold">Profil supprimé</span>
                  )}
                  {a?.masque ? <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-800">Masqué</span> : null}
                </div>
                <p className="text-sm font-bold text-ambre">{raison}</p>
                {sg.motif ? <p className="text-sm leading-relaxed">{sg.motif}</p> : null}
                <p className="text-xs text-gris">
                  Reçu le {new Date(sg.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {a ? (
                    <form action={masquerArtisan}>
                      <input type="hidden" name="artisan_id" value={a.id} />
                      <input type="hidden" name="masquer" value={a.masque ? "0" : "1"} />
                      <BoutonEnvoi className="bouton-secondaire w-full" enCours="…">
                        {a.masque ? "Réafficher le profil" : "Masquer le profil"}
                      </BoutonEnvoi>
                    </form>
                  ) : <span />}
                  <form action={traiterSignalement}>
                    <input type="hidden" name="id" value={sg.id} />
                    <BoutonEnvoi className="bouton w-full" enCours="…">Marquer traité</BoutonEnvoi>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
        <form action={deconnexion} className="pt-2">
          <BoutonEnvoi className="bouton-secondaire w-full min-h-[52px]" enCours="Déconnexion…">Se déconnecter</BoutonEnvoi>
        </form>
      </main>
      <BarreNav role={profil.role} />
    </>
  );
}
