import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { masquerArtisan, traiterSignalement, traiterVerification } from "@/actions/mise-en-relation";
import { BoutonDeconnexion } from "@/components/BoutonDeconnexion";
import { RAISONS_SIGNALEMENT } from "@/lib/types";
import { MOTIFS_REFUS, besoinVerso, libellePiece, nomsConcordent } from "@/lib/identite";
import { BarreNav } from "@/components/BarreNav";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { IconeMetier } from "@/components/Icones";
import { Avatar, Entete, Vide } from "@/components/ui";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

type Verification = {
  id: string;
  document_path: string;
  verso_path: string | null;
  selfie_path: string | null;
  type_piece: string | null;
  nom_piece: string | null;
  numero_empreinte: string | null;
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
      .select("id, document_path, verso_path, selfie_path, type_piece, nom_piece, numero_empreinte, created_at, artisan:artisans(id, metier, profil:profiles!artisans_id_fkey(nom_complet))")
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

  // Liens temporaires (10 min) vers les photos : le bucket est privé. Un seul appel pour toutes.
  const chemins = verifications.flatMap((v) => [v.document_path, v.verso_path, v.selfie_path].filter(Boolean) as string[]);
  const empreintes = verifications.map((v) => v.numero_empreinte).filter(Boolean) as string[];
  const [{ data: signes }, { data: memesPieces }] = await Promise.all([
    chemins.length
      ? supabase.storage.from("pieces-identite").createSignedUrls(chemins, 600)
      : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
    // Même pièce déjà envoyée par un autre compte (refusé ou supprimé depuis)
    empreintes.length
      ? supabase.from("verifications").select("artisan_id, numero_empreinte").in("numero_empreinte", empreintes)
      : Promise.resolve({ data: [] as { artisan_id: string; numero_empreinte: string }[] }),
  ]);
  const lien = (chemin: string | null) => (chemin ? (signes ?? []).find((x) => x.path === chemin)?.signedUrl ?? null : null);
  const pieceReutilisee = (v: Verification) =>
    !!v.numero_empreinte && (memesPieces ?? []).some((m) => m.numero_empreinte === v.numero_empreinte && m.artisan_id !== v.artisan.id);

  return (
    <>
      <Entete titre="Administration" sousTitre={`${nbVerifies ?? 0} artisan${(nbVerifies ?? 0) > 1 ? "s" : ""} vérifié${(nbVerifies ?? 0) > 1 ? "s" : ""}`} />
      <main className="flex flex-col gap-6 px-4 pt-5 pb-6">
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-[13px] font-bold text-gris">Pièces d&apos;identité à vérifier ({verifications.length})</h2>
          {verifications.length === 0 ? <Vide>Rien à vérifier pour le moment.</Vide> : null}

          {verifications.map((v) => {
            const nomProfil = v.artisan.profil.nom_complet;
            const ancienFormat = !v.type_piece; // envoyé avant la nouvelle vérification (1 photo, sans type)
            const concordance = nomsConcordent(nomProfil, v.nom_piece);
            const photos = [
              { titre: "Recto", chemin: v.document_path },
              ...(besoinVerso(v.type_piece) || v.verso_path ? [{ titre: "Verso", chemin: v.verso_path }] : []),
              // Selfie des envois faits avant son retrait
              ...(v.selfie_path ? [{ titre: "Selfie avec la pièce", chemin: v.selfie_path }] : []),
            ];
            return (
              <article key={v.id} className="carte flex flex-col gap-4 p-4">
                <Link href={`/artisans/${v.artisan.id}`} className="flex items-center gap-3">
                  <Avatar nom={nomProfil} />
                  <span className="flex flex-col">
                    <span className="text-base font-extrabold">{nomProfil}</span>
                    <span className="flex items-center gap-1.5 text-[13px] text-gris">
                      <IconeMetier slug={v.artisan.metier} className="size-4" />
                      Envoyée le {new Date(v.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                    </span>
                  </span>
                </Link>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-2xl bg-fond p-3 text-[13px]">
                  <dt className="font-bold text-gris">Pièce</dt>
                  <dd className="font-semibold">{ancienFormat ? "Ancien envoi (1 photo)" : libellePiece(v.type_piece)}</dd>
                  <dt className="font-bold text-gris">Nom déclaré</dt>
                  <dd className="font-semibold">
                    {v.nom_piece ?? "—"}{" "}
                    {v.nom_piece ? (
                      <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${concordance ? "bg-vert-clair text-vert" : "bg-ambre-clair text-ambre"}`}>
                        {concordance ? "= profil" : "≠ profil"}
                      </span>
                    ) : null}
                  </dd>
                </dl>

                {pieceReutilisee(v) ? (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] font-bold text-red-800">
                    Attention : ce numéro de pièce a déjà été envoyé par un autre compte.
                  </p>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  {photos.map((ph) => {
                    const url = lien(ph.chemin);
                    const pdf = ph.chemin?.endsWith(".pdf");
                    return (
                      <figure key={ph.titre} className={`flex flex-col gap-1 ${ph.titre.startsWith("Selfie") ? "col-span-2" : ""}`}>
                        <figcaption className="px-1 text-xs font-bold text-gris">{ph.titre}</figcaption>
                        {url && !pdf ? (
                          <a href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl bg-photo">
                            {/* eslint-disable-next-line @next/next/no-img-element -- lien signé temporaire vers un bucket privé */}
                            <img src={url} alt={`${ph.titre} — ${nomProfil}`} className="max-h-64 w-full object-contain" />
                          </a>
                        ) : url ? (
                          <a href={url} target="_blank" rel="noreferrer" className="bouton-secondaire">Ouvrir le PDF</a>
                        ) : (
                          <p className="grid h-24 place-items-center rounded-xl bg-fond text-xs font-semibold text-gris">Absent</p>
                        )}
                      </figure>
                    );
                  })}
                </div>

                <form action={traiterVerification} className="flex flex-col gap-2 rounded-2xl border border-trait p-3">
                  <input type="hidden" name="id" value={v.id} />
                  <p className="text-[13px] font-bold">Avant de valider, cochez :</p>
                  {[
                    "C'est une vraie pièce (pas une photocopie ni une photo d'écran)",
                    "Le nom sur la pièce est celui du profil",
                    "La photo de la pièce ressemble à celle du profil, s'il en a une",
                    "La pièce est lisible et pas expirée",
                  ].map((c) => (
                    <label key={c} className="flex items-start gap-2.5 text-[13px] font-semibold">
                      <input type="checkbox" required className="mt-0.5 size-[18px] shrink-0 accent-nuit" />
                      {c}
                    </label>
                  ))}
                  <BoutonEnvoi className="bouton mt-1" name="decision" value="valider" enCours="Validation…" disabled={ancienFormat}>
                    Valider le badge
                  </BoutonEnvoi>
                  {ancienFormat ? (
                    <p className="text-xs text-gris">Ancien envoi (1 photo) : refusez-le pour que l&apos;artisan recommence avec la nouvelle procédure.</p>
                  ) : null}
                </form>

                <form action={traiterVerification} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="decision" value="refuser" />
                  <label className="sr-only" htmlFor={`motif-${v.id}`}>Motif du refus</label>
                  <select id={`motif-${v.id}`} name="motif" required defaultValue={ancienFormat ? "Il manque le recto ou le verso de la pièce" : ""} className="champ font-semibold">
                    <option value="" disabled>Motif du refus…</option>
                    {MOTIFS_REFUS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <input name="motif_autre" maxLength={200} placeholder="Ou précisez un autre motif" aria-label="Autre motif" className="champ" />
                  <BoutonEnvoi className="bouton-secondaire min-h-[52px]" enCours="Refus…">Refuser</BoutonEnvoi>
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
        <div className="pt-2">
          <BoutonDeconnexion />
        </div>
      </main>
      <BarreNav role={profil.role} />
    </>
  );
}
