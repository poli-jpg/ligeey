// Réduit une photo avant l'envoi (2-5 Mo → ~200-400 Ko) : important pour les
// connexions mobiles lentes et pour l'espace de stockage Supabase.
export async function compresserImage(fichier: File, tailleMax = 1600, qualite = 0.8): Promise<Blob> {
  if (!fichier.type.startsWith("image/")) return fichier;

  const image = await createImageBitmap(fichier);
  const ratio = Math.min(1, tailleMax / Math.max(image.width, image.height));
  const largeur = Math.round(image.width * ratio);
  const hauteur = Math.round(image.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = largeur;
  canvas.height = hauteur;
  canvas.getContext("2d")!.drawImage(image, 0, 0, largeur, hauteur);
  image.close();

  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob ?? fichier), "image/jpeg", qualite),
  );
}
