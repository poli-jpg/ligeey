import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Ligeey — artisans du bâtiment", template: "%s · Ligeey" },
  description:
    "Trouvez un maçon, un électricien, un plombier ou un peintre près de chez vous, au Sénégal.",
  appleWebApp: { capable: true, title: "Ligeey", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#16213a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <div className="mx-auto min-h-dvh max-w-md bg-fond">{children}</div>
      </body>
    </html>
  );
}
