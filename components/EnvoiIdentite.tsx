"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compresserImage } from "@/lib/images";
import { COTE_MIN_PX, FRAICHEUR_MAX_MS, TYPES_PIECE, besoinVerso, type TypePiece } from "@/lib/identite";
import { envoyerVerification } from "@/actions/artisan";
import { IconePhoto } from "./Icones";
import { Erreur } from "./ui";

type Cle = "recto" | "verso";
type Photo = { fichier: Blob; apercu: string };

const ETAPES: { cle: Cle; titre: string; aide: string }[] = [
  { cle: "recto", titre: "Recto de la pièce", aide: "Face avec votre photo. Posez la pièce à plat, bien éclairée, les 4 coins visibles." },
  { cle: "verso", titre: "Verso de la pièce", aide: "L'autre face, avec les lignes de chiffres et de lettres en bas." },
];

/** Contrôles faits sur le téléphone avant l'envoi : vraie photo, récente, assez nette. */
async function controler(fichier: File): Promise<string | null> {
  if (!fichier.type.startsWith("image/")) return "Envoyez une photo (pas de PDF ni de document scanné).";
  // Photo prise à l'instant : les images anciennes de la galerie ou récupérées sur internet sont refusées.
  // lastModified vaut 0 sur certains téléphones : on ne bloque pas dans ce cas.
  if (fichier.lastModified > 0 && Date.now() - fichier.lastModified > FRAICHEUR_MAX_MS) {
    return "Prenez la photo maintenant avec l'appareil photo, pas une image déjà enregistrée.";
  }
  try {
    const image = await createImageBitmap(fichier);
    const petitCote = Math.min(image.width, image.height);
    image.close();
    if (petitCote < COTE_MIN_PX) return "Photo trop petite pour être lisible. Reprenez-la de plus près.";
  } catch {
    return "Photo illisible. Reprenez-la.";
  }
  return null;
}

export function EnvoiIdentite({ userId, nomProfil }: { userId: string; nomProfil: string }) {
  const [type, setType] = useState<TypePiece>("cni");
  const [nom, setNom] = useState(nomProfil);
  const [numero, setNumero] = useState("");
  const [photos, setPhotos] = useState<Partial<Record<Cle, Photo>>>({});
  const [erreurs, setErreurs] = useState<Partial<Record<Cle, string>>>({});
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const router = useRouter();

  const etapes = ETAPES.filter((e) => e.cle !== "verso" || besoinVerso(type));
  const complet = etapes.every((e) => photos[e.cle]) && nom.trim().length > 2 && numero.trim().length >= 5;

  async function choisir(cle: Cle, fichier: File | undefined) {
    if (!fichier) return;
    const probleme = await controler(fichier);
    setErreurs((e) => ({ ...e, [cle]: probleme ?? undefined }));
    if (probleme) return;
    // Plus grand que pour les autres photos : le texte de la pièce doit rester lisible
    const compresse = await compresserImage(fichier, 2000, 0.85);
    setPhotos((p) => {
      if (p[cle]) URL.revokeObjectURL(p[cle]!.apercu);
      return { ...p, [cle]: { fichier: compresse, apercu: URL.createObjectURL(compresse) } };
    });
  }

  async function envoyer() {
    if (!complet) return;
    setOccupe(true);
    setErreur(null);
    try {
      const supabase = createClient();
      const lot = crypto.randomUUID();
      const chemins: Partial<Record<Cle, string>> = {};
      for (const e of etapes) {
        const chemin = `${userId}/${lot}-${e.cle}.jpg`;
        const { error } = await supabase.storage
          .from("pieces-identite")
          .upload(chemin, photos[e.cle]!.fichier, { contentType: "image/jpeg" });
        if (error) throw new Error("Envoi des photos impossible. Vérifiez votre connexion et réessayez.");
        chemins[e.cle] = chemin;
      }
      const res = await envoyerVerification({
        type,
        nom: nom.trim(),
        numero: numero.trim(),
        recto: chemins.recto!,
        verso: chemins.verso ?? null,
      });
      if (res?.erreur) throw new Error(res.erreur);
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible. Réessayez.");
    } finally {
      setOccupe(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-bold">Quelle pièce ?</legend>
        <div className="flex flex-wrap gap-2">
          {TYPES_PIECE.map((t) => (
            <label key={t.v} className="flex h-10 cursor-pointer items-center rounded-full border border-trait bg-carte px-3.5 text-[13px] font-semibold has-checked:border-nuit has-checked:bg-chantier-clair">
              <input type="radio" name="type_piece" value={t.v} checked={type === t.v} onChange={() => setType(t.v)} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Nom complet, comme écrit sur la pièce</span>
        <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={120} autoComplete="name" className="champ" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Numéro de la pièce</span>
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          maxLength={40}
          inputMode="text"
          autoCapitalize="characters"
          placeholder="Tel qu'écrit sur la pièce"
          className="champ font-mono tracking-wide"
        />
        <span className="text-xs text-gris">Sert seulement à vérifier qu&apos;une même pièce n&apos;est pas utilisée par deux comptes.</span>
      </label>

      <div className="flex flex-col gap-3">
        {etapes.map((e, i) => {
          const photo = photos[e.cle];
          return (
            <div key={e.cle} className="flex flex-col gap-2 rounded-2xl bg-fond p-3">
              <div className="flex items-start gap-3">
                <span className={`grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-extrabold ${photo ? "bg-vert text-white" : "bg-carte text-encre"}`}>
                  {photo ? "✓" : i + 1}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-bold">{e.titre}</span>
                  <span className="text-[13px] leading-snug text-gris">{e.aide}</span>
                </span>
              </div>
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:)
                <img src={photo.apercu} alt={e.titre} className="max-h-48 w-full rounded-xl bg-photo object-contain" />
              ) : null}
              <label className="bouton-secondaire cursor-pointer gap-2 border-dashed">
                <IconePhoto className="size-5" />
                {photo ? "Reprendre la photo" : "Prendre la photo"}
                {/* capture : ouvre directement l'appareil photo sur téléphone */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(ev) => {
                    choisir(e.cle, ev.target.files?.[0]);
                    ev.target.value = "";
                  }}
                />
              </label>
              <Erreur message={erreurs[e.cle]} />
            </div>
          );
        })}
      </div>

      <button type="button" disabled={!complet || occupe} onClick={envoyer} className="bouton min-h-[52px] disabled:opacity-50">
        {occupe ? "Envoi en cours…" : "Envoyer pour vérification"}
      </button>
      <Erreur message={erreur} />
      <p className="text-xs leading-relaxed text-gris">
        Vos photos restent privées : seule l&apos;équipe Ligeey les voit, uniquement pour vérifier votre identité.
      </p>
    </div>
  );
}
