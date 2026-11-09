/* Service worker de Ligeey
 * - Fichiers statiques (JS, CSS, polices, icônes) : servis depuis le cache, très rapide sur réseau lent.
 * - Pages : toujours depuis le réseau (données à jour) ; sans connexion → page "hors ligne".
 * - Supabase et tout autre domaine : jamais interceptés.
 * Changer VERSION à chaque modification de ce fichier.
 */
const VERSION = "ligeey-v3";
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

// ---------------------------------------------------------------------
// Notifications (envoyées par Ligeey, même appli fermée)
// ---------------------------------------------------------------------
self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { titre: "Ligeey", corps: event.data ? event.data.text() : "" };
  }
  const url = typeof d.url === "string" && d.url.startsWith("/") ? d.url : "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      // Déjà en train de lire cette conversation, appli au premier plan : pas besoin de sonner
      const dejaLa = fenetres.some((f) => f.focused && new URL(f.url).pathname === url);
      if (dejaLa) return;
      return self.registration.showNotification(d.titre || "Ligeey", {
        body: d.corps || "",
        icon: "/icones/icone-192.png",
        badge: "/icones/icone-192.png",
        tag: d.tag || undefined,
        renotify: Boolean(d.tag),
        data: { url },
        lang: "fr",
      });
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      // Réutilise l'appli déjà ouverte si possible
      const ouverte = fenetres.find((f) => new URL(f.url).origin === self.location.origin);
      if (ouverte) return ouverte.navigate(url).then((f) => (f || ouverte).focus());
      return self.clients.openWindow(url);
    }),
  );
});
