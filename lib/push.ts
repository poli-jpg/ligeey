/** Clé publique des notifications (VAPID). Publique par nature : la clé privée reste dans Vercel. */
export const CLE_PUBLIQUE_PUSH = "BC01BWmCG3an9tO-UpMPQZaSqzJnq20exFDu9orZ7JtdURlVg-ZsJ47KaHehMswAS63le9ZN5QrE9VXpxyXBJdw";

export function base64UrlVersOctets(base64: string) {
  const rembourrage = "=".repeat((4 - (base64.length % 4)) % 4);
  const brut = atob((base64 + rembourrage).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(brut, (c) => c.charCodeAt(0));
}

export type EtatPush = "indisponible" | "ios-installer" | "refuse" | "actif" | "inactif";

/** Où en est ce téléphone avec les notifications ? */
export async function etatPush(): Promise<EtatPush> {
  if (typeof window === "undefined") return "indisponible";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installee = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    // Sur iPhone, les notifications n'existent que pour l'appli ajoutée à l'écran d'accueil
    return ios && !installee ? "ios-installer" : "indisponible";
  }
  if (Notification.permission === "denied") return "refuse";
  const reg = await navigator.serviceWorker.getRegistration();
  const abo = await reg?.pushManager.getSubscription();
  return abo && Notification.permission === "granted" ? "actif" : "inactif";
}

/** Demande l'autorisation, abonne le téléphone et renvoie l'abonnement (ou null). */
export async function activerPush() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  return (
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlVersOctets(CLE_PUBLIQUE_PUSH) }))
  );
}

export function cleAbonnement(abo: PushSubscription) {
  const j = abo.toJSON();
  return { p_endpoint: abo.endpoint, p_p256dh: j.keys?.p256dh ?? "", p_auth: j.keys?.auth ?? "" };
}
