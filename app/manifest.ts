import type { MetadataRoute } from "next";

// Manifest PWA : nom, icônes, couleurs et raccourcis de l'appli installée.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ligeey — artisans du bâtiment",
    short_name: "Ligeey",
    description:
      "Trouvez un maçon, un électricien, un plombier ou un peintre près de chez vous, et recevez des devis.",
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#16213a",
    theme_color: "#16213a",
    categories: ["business", "lifestyle", "productivity"],
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Appui long sur l'icône (Android)
    shortcuts: [
      {
        name: "Chercher un artisan",
        short_name: "Chercher",
        url: "/recherche",
        icons: [{ src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Publier une demande de devis",
        short_name: "Demande",
        url: "/devis/nouvelle",
        icons: [{ src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Mes messages",
        short_name: "Messages",
        url: "/messages",
        icons: [{ src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
