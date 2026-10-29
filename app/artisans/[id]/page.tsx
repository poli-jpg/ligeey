import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { fcfa, note } from "@/lib/format";
import { JOURS } from "@/lib/referentiels";
import { contacterArtisan } from "@/actions/mise-en-relation";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { IconeDrapeau, IconeEtoile, IconeLieu, IconeMessage, IconeMetier, IconeRetour } from "@/components/Icones";
import { estRecommande } from "@/lib/types";
import { Avatar, BadgeNom, BadgesConfiance, Pastille, Titre2, Vide } from "@/components/ui";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ merci?: string; erreur?: string }> };

async function chargerArtisan(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artisans")
    .select(
      `id, slug_metier:metier, competences, bio, annees_experience, tarif_base, zones, jours_dispo, disponible,
       verification, note_moyenne, nb_avis, nb_missions,
       profil:profiles!artisans_id_fkey(nom_complet, telephone_verifie),
       metier:metiers(nom),
       quartier:quartiers(nom)`,
    )
    .eq("id", id)
    .maybeSingle();
  return { supabase, artisan: data };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { artisan } = await chargerArtisan(id);
  if (!artisan) return { title: "Artisan introuvable" };
  const nom = (artisan.profil as unknown as { nom_complet: string }).nom_complet;
  const metier = (artisan.metier as unknown as { nom: string }).nom;
  return { title: `${nom}, ${metier.toLowerCase()}`, description: artisan.bio ?? undefined };
}

export default async function ProfilArtisan({ params, searchParams }: Props) {
  const { id } = await params;
  const { merci, erreur } = await searchParams;
  const { supabase, artisan } = await chargerArtisan(id);
  if (!artisan) notFound();

  const nom = (artisan.profil as unknown as { nom_complet: string }).nom_complet;
  const telephoneVerifie = (artisan.profil as unknown as { telephone_verifie: boolean }).telephone_verifie;
  const metier = (artisan.metier as unknown as { nom: string }).nom;
  const quartier = (artisan.quartier as unknown as { nom: string } | null)?.nom;

  const [{ data: realisations }, { data: avis }, { data: quartiers }] = await Promise.all([
    supabase.from("realisations").select("id, image_path, legende").eq("artisan_id", id).order("created_at", { ascending: false }).limit(9),
    supabase
      .from("avis")
      .select("id, note, commentaire, tags, created_at, client:profiles!avis_client_id_fkey(nom_complet)")
      .eq("artisan_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    artisan.zones.length ? supabase.from("quartiers").select("nom").in("slug", artisan.zones) : Promise.resolve({ data: [] }),
  ]);

  const zones = [quartier, ...(quartiers ?? []).map((q) => q.nom)].filter(Boolean).join(", ");
  const urlPhoto = (chemin: string) => supabase.storage.from("realisations").getPublicUrl(chemin).data.publicUrl;

  const stats = [
    [artisan.nb_avis ? note(artisan.note_moyenne) : "Nouveau", artisan.nb_avis ? `${artisan.nb_avis} avis` : "Pas encore noté"],
    [String(artisan.nb_missions), artisan.nb_missions > 1 ? "chantiers" : "chantier"],
    [artisan.annees_experience != null ? `${artisan.annees_experience} ans` : "—", "d'expérience"],
  ];

  return (
    <>
      <div className="h-[calc(env(safe-area-inset-top)+160px)] rounded-b-[32px] bg-nuit px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <Link href="/recherche" aria-label="Retour" className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white">
          <IconeRetour />
        </Link>
      </div>

      <main className="-mt-16 flex flex-col gap-4 px-5 pb-36">
        <section className="carte flex flex-col items-center gap-3 px-5 pt-0 pb-5 text-center">
          <span className="-mt-11 rounded-full border-[5px] border-white">
            <Avatar nom={nom} taille="lg" />
          </span>
          <div className="flex flex-col items-center gap-1">
            <h1 className="flex items-center gap-2 font-titre text-[26px] leading-tight font-extrabold tracking-tight">
              {nom} <BadgeNom identite={artisan.verification === "verifie"} telephone={telephoneVerifie} className="size-6" />
            </h1>
            <p className="flex items-center gap-1.5 text-[15px] font-semibold text-gris">
              <IconeMetier slug={artisan.slug_metier} className="size-[18px]" />
              {metier}
            </p>
            {zones ? (
              <p className="flex items-center gap-1 text-[13px] text-gris">
                <IconeLieu className="size-3.5" />
                {zones}
              </p>
            ) : null}
          </div>
          <BadgesConfiance
            identite={artisan.verification === "verifie"}
            telephone={telephoneVerifie}
            recommande={estRecommande(artisan.note_moyenne, artisan.nb_avis)}
          />
          <Pastille ton={artisan.disponible ? "vert" : "ambre"}>
            {artisan.disponible ? "Disponible pour un chantier" : "Occupé en ce moment"}
          </Pastille>

          <dl className="mt-1 grid w-full grid-cols-3 divide-x divide-trait border-t border-trait pt-4">
            {stats.map(([valeur, label]) => (
              <div key={label} className="flex flex-col-reverse items-center gap-0.5 px-1">
                <dt className="text-xs text-gris">{label}</dt>
                <dd className="font-titre text-xl font-extrabold">{valeur}</dd>
              </div>
            ))}
          </dl>
        </section>

        {merci ? <Pastille>Merci, votre avis est publié.</Pastille> : null}
        {erreur ? <Pastille ton="ambre">Impossible d&apos;ouvrir la conversation. Réessayez.</Pastille> : null}

        {artisan.bio || artisan.competences.length ? (
          <section className="carte flex flex-col gap-3 p-5">
            <Titre2>À propos</Titre2>
            {artisan.bio ? <p className="text-[15px] leading-relaxed">{artisan.bio}</p> : null}
            {artisan.competences.length ? (
              <div className="flex flex-wrap gap-1.5">
                {artisan.competences.map((c: string) => (
                  <span key={c} className="rounded-full bg-fond px-3 py-1.5 text-[13px] font-semibold">{c}</span>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="carte flex flex-col gap-3 p-5">
          <Titre2>Jours de travail</Titre2>
          <div className="grid grid-cols-7 gap-1.5">
            {JOURS.map((j) => {
              const ok = artisan.jours_dispo.includes(j.n);
              return (
                <span key={j.n} title={j.nom} className={`flex h-11 items-center justify-center rounded-xl text-[13px] font-extrabold ${ok ? "bg-nuit text-white" : "border-[1.5px] border-dashed border-[#c3cad3] text-[#8a93a0]"}`}>
                  <span aria-hidden>{j.court}</span>
                  <span className="sr-only">{j.nom} : {ok ? "travaille" : "repos"}</span>
                </span>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <Titre2>Réalisations</Titre2>
          {realisations?.length ? (
            <div className="grid grid-cols-2 gap-2">
              {realisations.map((r, i) => (
                <figure key={r.id} className={`relative overflow-hidden rounded-2xl bg-photo ${i === 0 ? "col-span-2 aspect-[16/10]" : "aspect-square"}`}>
                  <Image src={urlPhoto(r.image_path)} alt={r.legende ?? `Réalisation de ${nom}`} fill sizes="(max-width: 448px) 100vw, 448px" className="object-cover" />
                  {r.legende ? (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-2 text-left text-xs font-semibold text-white">
                      {r.legende}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          ) : (
            <Vide>Pas encore de photos de chantier.</Vide>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <Titre2>Avis des clients</Titre2>
          {avis?.length ? (
            avis.map((a) => {
              const auteur = (a.client as unknown as { nom_complet: string } | null)?.nom_complet ?? "Client";
              return (
                <article key={a.id} className="carte flex flex-col gap-2 p-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar nom={auteur} taille="sm" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{auteur.split(" ")[0]}</span>
                      <span className="flex" role="img" aria-label={`${a.note} étoiles sur 5`}>
                        {[1, 2, 3, 4, 5].map((n) => <IconeEtoile key={n} className="size-3.5" pleine={n <= a.note} />)}
                      </span>
                    </div>
                  </div>
                  {a.commentaire ? <p className="text-sm leading-relaxed">{a.commentaire}</p> : null}
                  {a.tags?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {a.tags.map((t: string) => (
                        <span key={t} className="rounded-full bg-vert-clair px-2.5 py-1 text-xs font-bold text-vert">{t}</span>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <Vide>Aucun avis pour l&apos;instant. Seuls les clients qui ont terminé une mission peuvent noter.</Vide>
          )}
        </section>
        <Link
          href={`/artisans/${artisan.id}/signaler`}
          className="flex items-center justify-center gap-2 py-2 text-[13px] font-semibold text-gris underline underline-offset-4"
        >
          <IconeDrapeau className="size-4" />
          Signaler ce profil
        </Link>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-center gap-3 rounded-t-[24px] bg-carte px-5 pt-3.5 pb-[max(env(safe-area-inset-bottom),16px)] shadow-[0_-10px_30px_-18px_rgb(22_33_58/0.45)]">
        <div className="mr-auto flex flex-col">
          <span className="text-xs text-gris">Déplacement dès</span>
          <span className="font-titre text-lg font-extrabold">{fcfa(artisan.tarif_base)}</span>
        </div>
        <form action={contacterArtisan}>
          <input type="hidden" name="artisan_id" value={artisan.id} />
          <BoutonEnvoi className="bouton gap-2" enCours="Ouverture…">
            <IconeMessage className="size-5" />
            Contacter
          </BoutonEnvoi>
        </form>
      </div>
    </>
  );
}
