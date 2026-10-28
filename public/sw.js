/* Service worker de Ligeey
 * - Fichiers statiques (JS, CSS, polices, icônes) : servis depuis le cache, très rapide sur réseau lent.
 * - Pages : toujours depuis le réseau (données à jour) ; sans connexion → page "hors ligne".
 * - Supabase et tout autre domaine : jamais interceptés.
 * Changer VERSION à chaque modification de ce fichier.
 */
const VERSION = "ligeey-v1";
const CACHE_STATIQUE = `${VERSION}-statique`;
const PAGE_HORS_LIGNE = "/hors-ligne";
const A_PRECHARGER = [
  PAGE_HORS_LIGNE,
  "/icones/icone-192.png",
  "/icones/icone-512.png",
  "/icone.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_STATIQUE).then((cache) => cache.addAll(A_PRECHARGER)));
  // Pas de skipWaiting automatique : l'appli propose "Mettre à jour" (voir PWA.tsx)
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => !c.startsWith(VERSION)).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "MISE_A_JOUR") self.skipWaiting();
});

function estStatique(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icones/") ||
    /\.(?:woff2?|svg|png|jpg|jpeg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, images distantes…

  // Navigation (ouverture d'une page) : réseau d'abord, page hors ligne en secours
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(PAGE_HORS_LIGNE)));
    return;
  }

  // Fichiers statiques versionnés : cache d'abord, puis réseau (et mise en cache)
  if (estStatique(url)) {
    event.respondWith(
      caches.match(request).then(
        (enCache) =>
          enCache ||
          fetch(request).then((reponse) => {
            if (reponse.ok) {
              const copie = reponse.clone();
              caches.open(CACHE_STATIQUE).then((cache) => cache.put(request, copie));
            }
            return reponse;
          }),
      ),
    );
  }
  // Le reste (données React Server Components, actions…) passe directement par le réseau
});
