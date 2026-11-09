import type { NextConfig } from "next";

// Ce que le navigateur a le droit de charger : l'appli elle-même et Supabase, rien d'autre.
// 'unsafe-inline' reste nécessaire pour les petits scripts que Next.js insère dans la page.
const SUPABASE = "https://*.supabase.co";
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE}`,
  `media-src 'self' blob: ${SUPABASE}`,
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE} wss://*.supabase.co`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Ne pas annoncer la technologie utilisée
  poweredByHeader: false,
  images: {
    // Photos des réalisations servies par Supabase Storage
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  async headers() {
    return [
      {
        // Le service worker ne doit jamais être mis en cache, sinon les mises à jour n'arrivent pas
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()" },
          // HTTPS obligatoire pendant 2 ans, même si quelqu'un tape http://
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Interdit d'afficher Ligeey dans une autre page (vol de clics, fausse page)
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
