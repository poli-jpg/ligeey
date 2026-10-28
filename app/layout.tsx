import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";
import { PWA } from "@/components/PWA";

export const metadata: Metadata = {
  title: { default: "Ligeey — artisans du bâtiment", template: "%s · Ligeey" },
  description:
    "Trouvez un maçon, un électricien, un plombier ou un peintre près de chez vous, au Sénégal.",
  applicationName: "Ligeey",
  appleWebApp: { capable: true, title: "Ligeey", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icones/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icone.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icones/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#16213a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <div className="mx-auto min-h-dvh max-w-md bg-fond">{children}</div>
        <PWA />
      </body>
    </html>
  );
}
