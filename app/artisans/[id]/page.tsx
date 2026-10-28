import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { fcfa } from "@/lib/format";
import { JOURS } from "@/lib/referentiels";
import { contacterArtisan } from "@/actions/mise-en-relation";
import { BoutonEnvoi } from "@/components/BoutonEnvoi";
import { IconeEtoile, IconeMessage, IconeRetour } from "@/components/Icones";
import { Avatar, BadgeVerifie, Pastille, Titre2, Vide } from "@/components/ui";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ merci?: string; erreur?: string }> };

async function chargerArtisan(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artisans")
    .select(
      `id, competences, bio, annees_experience, tarif_base, zones, jours_dispo, disponible,
       verification, note_moyenne, nb_avis, nb_missions,
       profil:profiles!artisans_id_fkey(nom_complet),
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

  return (
    <>
      <div className="flex h-36 items-start justify-between bg-nuit px-5 pt-6">
        <Link href="/recherche" aria-label="Retour" className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white">
          <IconeRetour />
        </Link>
      </div>

      <main className="-mt-10 flex flex-col gap-4 px-5 pb-32">
        <div className="flex flex-col gap-2.5">
          <span className="rounded-full border-4 border-fond self-start">
            <Avatar nom={nom} taille="lg" />
          </span>
          <div>
            <h1 className="flex items-center gap-2 font-titre text-2xl font-bold">
              {nom} {artisan.verification === "verifie" ? <BadgeVerifie /> : null}
            </h1>
            <p className="text-sm text-gris">{metier}{zones ? ` · ${zones}` : ""}</p>
          </div>
          {merci ? <Pastille>Merci, votre avis est publié.</Pastille> : null}
          {erreur ? <Pastille ton="ambre">Impossible d&apos;ouvrir la conversation. Réessayez.</Pastille> : null}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            [artisan.nb_avis ? String(artisan.note_moyenne).replace(".", ",") : "—", "Note"],
            [String(artisan.nb_missions), "Chantiers"],
            [artisan.annees_experience != null ? `${artisan.annees_experience} ans` : "—", "Expérience"],
          ].map(([valeur, label]) => (
            <div key={label} className="flex flex-col items-center gap-0.5 rounded-2xl border border-trait bg-carte p-2.5">
              <span className="font-titre text-lg font-bold">{valeur}</span>
              <span className="text-xs text-gris">{label}</span>
            </div>
          ))}
        </div>

        {artisan.bio ? <p className="text-[15px] leading-relaxed">{artisan.bio}</p> : null}

        {artisan.competences.length ? (
          <section className="flex flex-col gap-2">
            <Titre2>Compétences</Titre2>
            <div className="flex flex-wrap gap-1.5">
              {artisan.competences.map((c: string) => (
                <span key={c} className="rounded-xl border border-trait bg-carte px-2.5 py-1.5 text-[13px] font-semibold">{c}</span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-2">
          <Titre2>Disponibilité</Titre2>
          <div className="grid grid-cols-7 gap-1.5">
            {JOURS.map((j) => {
              const ok = artisan.jours_dispo.includes(j.n);
              return (
                <span key={j.n} title={j.nom} className={`flex h-10 items-center justify-center rounded-xl text-[13px] font-bold ${ok ? "bg-nuit text-white" : "border border-trait bg-carte text-gris"}`}>
                  <span aria-hidden>{j.court}</span>
                  <span className="sr-only">{j.nom} : {ok ? "disponible" : "non disponible"}</span>
                </span>
              );
            })}
          </div>
          {!artisan.disponible ? <Pastille ton="ambre">Occupé en ce moment</Pastille> : null}
        </section>

        <section className="flex flex-col gap-2">
          <Titre2>Réalisations</Titre2>
          {realisations?.length ? (
            <div className="grid grid-cols-3 gap-2">
              {realisations.map((r) => (
                <figure key={r.id} className="relative aspect-square overflow-hidden rounded-xl bg-photo">
                  <Image src={urlPhoto(r.image_path)} alt={r.legende ?? `Réalisation de ${nom}`} fill sizes="33vw" className="object-cover" />
                </figure>
              ))}
            </div>
          ) : (
            <Vide>Pas encore de photos.</Vide>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <Titre2>Avis ({artisan.nb_avis})</Titre2>
          {avis?.length ? (
            avis.map((a) => (
              <article key={a.id} className="flex flex-col gap-1.5 rounded-2xl border border-trait bg-carte p-3.5">
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  {(a.client as unknown as { nom_complet: string } | null)?.nom_complet.split(" ")[0] ?? "Client"}
                  <span className="flex" role="img" aria-label={`${a.note} étoiles sur 5`}>
                    {[1, 2, 3, 4, 5].map((n) => <IconeEtoile key={n} className="size-3.5" pleine={n <= a.note} />)}
                  </span>
                </span>
                {a.commentaire ? <p className="text-[13px] leading-relaxed text-gris">{a.commentaire}</p> : null}
              </article>
            ))
          ) : (
            <Vide>Aucun avis pour l&apos;instant. Les avis viennent uniquement de clients ayant terminé une mission.</Vide>
          )}
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-center gap-2.5 border-t border-trait bg-carte px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="mr-auto flex flex-col">
          <span className="text-xs text-gris">Déplacement dès</span>
          <span className="font-titre text-base font-bold">{fcfa(artisan.tarif_base)}</span>
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
