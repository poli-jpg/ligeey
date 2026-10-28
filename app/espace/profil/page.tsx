import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { chargerReferentiels } from "@/lib/referentiels";
import { ajouterRealisation, envoyerVerification, supprimerRealisation } from "@/actions/artisan";
import { deconnexion } from "@/actions/auth";
import { BarreNav } from "@/components/BarreNav";
import { EnvoiFichier } from "@/components/EnvoiFichier";
import { IconeBouclier } from "@/components/Icones";
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
      .select("metier, quartier_base, bio, annees_experience, tarif_base, competences, zones, jours_dispo, verification")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("realisations").select("id, image_path, legende").eq("artisan_id", user.id).order("created_at", { ascending: false }),
    supabase.from("verifications").select("statut, motif_refus").eq("artisan_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const url = (p: string) => supabase.storage.from("realisations").getPublicUrl(p).data.publicUrl;

  return (
    <>
      <Entete titre={fiche ? "Mon profil" : "Créer mon profil artisan"}  />
      <main className="flex flex-col gap-8 px-4 pt-5 pb-4">
        {nouveau && !fiche ? (
          <p className="text-[15px] text-gris">Ces informations apparaissent sur votre profil public. Vous pourrez les modifier à tout moment.</p>
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

            <section id="verification" className="flex flex-col gap-3 rounded-2xl border border-[#bfe3cc] bg-vert-clair p-4">
              <div className="flex items-center gap-3">
                <IconeBouclier className="size-7 shrink-0 text-vert" />
                <div className="flex flex-col">
                  <span className="font-bold text-green-900">Badge Vérifié</span>
                  <span className="text-xs text-green-800">Photo de votre carte d&apos;identité. Elle reste privée : seule l&apos;équipe Ligeey la voit.</span>
                </div>
              </div>
              {fiche.verification === "verifie" ? <Pastille>Votre profil est vérifié</Pastille> : null}
              {fiche.verification === "en_attente" ? <Pastille ton="ambre">En cours de vérification</Pastille> : null}
              {fiche.verification === "refuse" ? (
                <Pastille ton="ambre">Refusée{verif?.motif_refus ? ` : ${verif.motif_refus}` : ""}. Vous pouvez renvoyer une pièce.</Pastille>
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
            </section>
          </>
        ) : null}

        <form action={deconnexion}>
          <button className="bouton-secondaire w-full">Se déconnecter</button>
        </form>
      </main>
      {fiche ? <BarreNav role="artisan" /> : null}
    </>
  );
}
