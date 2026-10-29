import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { chargerReferentiels } from "@/lib/referentiels";
import { ajouterRealisation, envoyerVerification, supprimerRealisation } from "@/actions/artisan";
import { deconnexion } from "@/actions/auth";
import { BarreNav } from "@/components/BarreNav";
import { EnvoiFichier } from "@/components/EnvoiFichier";
import { IconeEtoile, IconeTelephoneVerifie, IconeVerifie } from "@/components/Icones";
import { estRecommande, SEUIL_RECOMMANDE } from "@/lib/types";
import { Entete, Pastille, Titre2 } from "@/components/ui";
import { FormulaireArtisan, type FicheArtisan } from "./FormulaireArtisan";

export const metadata: Metadata = { title: "Mon profil artisan" };

export default async function ProfilArtisanEdition({ searchParams }: { searchParams: Promise<{ nouveau?: string }> }) {
  const { nouveau } = await searchParams;
  const { supabase, user, profil } = await getSession();
  if (!user) redirect("/connexion?suite=/espace/profil");

  const [{ metiers, quartiers }, { data: fiche }, { data: realisations }, { data: verif }] = await Promise.all([
    chargerReferentiels(supabase),
    supabase
      .from("artisans")
      .select("metier, quartier_base, bio, annees_experience, tarif_base, competences, zones, jours_dispo, verification, note_moyenne, nb_avis")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("realisations").select("id, image_path, legende").eq("artisan_id", user.id).order("created_at", { ascending: false }),
    supabase.from("verifications").select("statut, motif_refus").eq("artisan_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const recommande = fiche ? estRecommande(fiche.note_moyenne, fiche.nb_avis) : false;
  const url = (p: string) => supabase.storage.from("realisations").getPublicUrl(p).data.publicUrl;

  return (
    <>
      <Entete titre={fiche ? "Mon profil" : "Créer mon profil artisan"}  />
      <main className="flex flex-col gap-8 px-4 pt-5 pb-4">
        {nouveau && !fiche ? (
          <p className="text-[15px] text-gris">Ces informations apparaissent sur votre profil public. Vous pourrez les modifier à tout moment.</p>
        ) : null}

        {fiche ? (
          <section id="verification" className="flex flex-col gap-2">
            <h2 className="px-1 text-[13px] font-bold text-gris">Vos badges de confiance</h2>
            <div className="divide-y divide-trait overflow-hidden rounded-2xl bg-carte shadow-carte">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <IconeTelephoneVerifie className="size-7 shrink-0" />
                <div className="flex flex-1 flex-col">
                  <span className="font-bold">Téléphone vérifié</span>
                  <span className="text-[13px] text-gris">Obtenu automatiquement avec le code SMS.</span>
                </div>
                {profil?.telephone_verifie ? <Pastille>Obtenu</Pastille> : <Pastille ton="gris">—</Pastille>}
              </div>

              <div className="flex flex-col gap-3 px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <IconeVerifie className="size-7 shrink-0" />
                  <div className="flex flex-1 flex-col">
                    <span className="font-bold">Identité vérifiée</span>
                    <span className="text-[13px] text-gris">Envoyez votre carte d&apos;identité. Elle reste privée : seule l&apos;équipe Ligeey la voit.</span>
                  </div>
                  {fiche.verification === "verifie" ? <Pastille>Obtenu</Pastille> : null}
                  {fiche.verification === "en_attente" ? <Pastille ton="ambre">En cours</Pastille> : null}
                </div>
                {fiche.verification === "refuse" ? (
                  <p className="rounded-xl bg-ambre-clair px-3 py-2 text-[13px] font-semibold text-ambre">
                    Refusée{verif?.motif_refus ? ` : ${verif.motif_refus}` : ""}. Vous pouvez envoyer une nouvelle photo.
                  </p>
                ) : null}
                {fiche.verification === "non_soumis" || fiche.verification === "refuse" ? (
                  <EnvoiFichier
                    bucket="pieces-identite"
                    userId={user.id}
                    libelle="Envoyer ma pièce d'identité"
                    accept="image/*,application/pdf"
                    enregistrer={envoyerVerification}
                  />
                ) : null}
              </div>

              <div className="flex items-center gap-3 px-4 py-3.5">
                <IconeEtoile className="size-7 shrink-0" pleine={recommande} />
                <div className="flex flex-1 flex-col">
                  <span className="font-bold">Recommandé</span>
                  <span className="text-[13px] text-gris">
                    {recommande
                      ? "Vos clients vous notent très bien. Bravo !"
                      : `Automatique dès ${SEUIL_RECOMMANDE.avis} avis avec une note de ${String(SEUIL_RECOMMANDE.note).replace(".", ",")} ou plus. Vous avez ${fiche.nb_avis} avis.`}
                  </span>
                </div>
                {recommande ? <Pastille ton="chantier">Obtenu</Pastille> : null}
              </div>
            </div>
          </section>
        ) : null}

        <FormulaireArtisan metiers={metiers} quartiers={quartiers} fiche={fiche as FicheArtisan | null} quartierProfil={profil?.quartier ?? null} />

        {fiche ? (
          <>
            <section className="flex flex-col gap-3">
              <Titre2>Mes réalisations</Titre2>
              <p className="text-[13px] text-gris">Les photos de vos chantiers rassurent les clients. Ajoutez vos plus beaux travaux.</p>
              {realisations?.length ? (
                <div className="grid grid-cols-3 gap-2">
                  {realisations.map((r) => (
                    <figure key={r.id} className="relative aspect-square overflow-hidden rounded-xl bg-photo">
                      <Image src={url(r.image_path)} alt={r.legende ?? "Réalisation"} fill sizes="33vw" className="object-cover" />
                      <form action={supprimerRealisation} className="absolute top-1 right-1">
                        <input type="hidden" name="id" value={r.id} />
                        <button aria-label="Supprimer la photo" className="rounded-lg bg-black/60 px-2 py-1 text-xs font-bold text-white">✕</button>
                      </form>
                    </figure>
                  ))}
                </div>
              ) : null}
              <EnvoiFichier bucket="realisations" userId={user.id} libelle="+ Ajouter une photo" avecLegende enregistrer={ajouterRealisation} />
            </section>

          </>
        ) : null}

        <form action={deconnexion}>
          <button className="bouton-secondaire w-full">Se déconnecter</button>
        </form>
      </main>
      {fiche ? <BarreNav role={profil?.role} /> : null}
    </>
  );
}
