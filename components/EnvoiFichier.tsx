"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compresserImage } from "@/lib/images";
import { Erreur } from "./ui";

/**
 * Envoie un fichier dans un bucket Supabase sous "{userId}/…",
 * puis appelle une Server Action pour l'enregistrer en base.
 */
export function EnvoiFichier({
  bucket,
  userId,
  libelle,
  accept = "image/*",
  avecLegende = false,
  enregistrer,
}: {
  bucket: "realisations" | "pieces-identite";
  userId: string;
  libelle: string;
  accept?: string;
  avecLegende?: boolean;
  enregistrer: (chemin: string, legende: string) => Promise<void>;
}) {
  const champ = useRef<HTMLInputElement>(null);
  const [legende, setLegende] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const router = useRouter();

  async function envoyer(fichier: File) {
    setOccupe(true);
    setErreur(null);
    try {
      const estPdf = fichier.type === "application/pdf";
      const contenu = estPdf ? fichier : await compresserImage(fichier);
      const chemin = `${userId}/${crypto.randomUUID()}.${estPdf ? "pdf" : "jpg"}`;
      const { error } = await createClient()
        .storage.from(bucket)
        .upload(chemin, contenu, { contentType: estPdf ? "application/pdf" : "image/jpeg" });
      if (error) throw error;
      await enregistrer(chemin, legende);
      setLegende("");
      router.refresh();
    } catch {
      setErreur("Envoi impossible. Vérifiez le fichier (5 Mo maximum) et réessayez.");
    } finally {
      setOccupe(false);
      if (champ.current) champ.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {avecLegende ? (
        <input
          value={legende}
          onChange={(e) => setLegende(e.target.value)}
          maxLength={140}
          placeholder="Légende (facultatif) : salle de bain refaite…"
          aria-label="Légende de la photo"
          className="champ"
        />
      ) : null}
      <input
        ref={champ}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && envoyer(e.target.files[0])}
      />
      <button type="button" disabled={occupe} onClick={() => champ.current?.click()} className="bouton-secondaire border-dashed">
        {occupe ? "Envoi en cours…" : libelle}
      </button>
      <Erreur message={erreur} />
    </div>
  );
}
