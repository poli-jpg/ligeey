import type { MetadataRoute } from "next";

// Manifest PWA : permet d'installer Ligeey sur l'écran d'accueil Android.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ligeey — artisans du bâtiment",
    short_name: "Ligeey",
    description: "Mise en relation entre artisans du bâtiment et clients.",
    start_url: "/",
    display: "standalone",
    background_color: "#eceff1",
    theme_color: "#16213a",
    lang: "fr",
    icons: [
      { src: "/icone.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
