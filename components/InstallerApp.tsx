"use client";

import { useEffect, useState } from "react";
import { IconeFermer } from "./Icones";

// Événement Chrome/Android (pas encore dans les types TypeScript standards)
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const CLE = "ligeey:installation-masquee";
const DUREE_MASQUAGE = 14 * 24 * 3600 * 1000; // on repropose après 14 jours

function masqueeRecemment() {
  try {
    const t = Number(localStorage.getItem(CLE));
    return t > 0 && Date.now() - t < DUREE_MASQUAGE;
  } catch {
    return false;
  }
}

/** Carte "Installer l'application" : bouton natif sur Android, mode d'emploi sur iPhone. */
export function InstallerApp() {
  const [invite, setInvite] = useState<InstallPrompt | null>(null);
  const [iphone, setIphone] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const installee =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (installee || masqueeRecemment()) return;

    const surInvite = (e: Event) => {
      e.preventDefault(); // on garde l'invitation pour notre propre bouton
      setInvite(e as InstallPrompt);
      setVisible(true);
    };
    const surInstallee = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", surInvite);
    window.addEventListener("appinstalled", surInstallee);

    // iPhone / iPad (Safari) : pas d'invitation automatique, on explique la marche à suivre
    const ua = navigator.userAgent;
    const estIos = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    if (estIos) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- détection unique au montage, côté navigateur uniquement
      setIphone(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", surInvite);
      window.removeEventListener("appinstalled", surInstallee);
    };
  }, []);

  function masquer() {
    setVisible(false);
    try {
      localStorage.setItem(CLE, String(Date.now()));
    } catch {
      /* navigation privée : on masque juste pour cette visite */
    }
  }

  async function installer() {
    if (!invite) return;
    await invite.prompt();
    const { outcome } = await invite.userChoice;
    setInvite(null);
    if (outcome === "accepted") setVisible(false);
  }

  if (!visible) return null;

  return (
    <section aria-label="Installer l'application" className="carte relative flex gap-4 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- petite icône statique déjà en cache */}
      <img src="/icones/icone-192.png" alt="" width={56} height={56} className="size-14 shrink-0 rounded-2xl" />
      <div className="flex flex-1 flex-col gap-2 pr-6">
        <h2 className="font-titre text-[17px] leading-tight font-extrabold">Installer Ligeey sur votre téléphone</h2>
        {iphone ? (
          <p className="text-[13px] leading-relaxed text-gris">
            Dans Safari, touchez <strong className="text-encre">Partager</strong> (le carré avec une flèche), puis{" "}
            <strong className="text-encre">Sur l&apos;écran d&apos;accueil</strong>.
          </p>
        ) : (
          <>
            <p className="text-[13px] leading-relaxed text-gris">Une icône sur l&apos;écran d&apos;accueil, sans passer par le Play Store. Léger et rapide.</p>
            <button type="button" onClick={installer} className="bouton min-h-11 self-start px-5 text-sm">
              Installer
            </button>
          </>
        )}
      </div>
      <button type="button" onClick={masquer} aria-label="Ne plus afficher" className="absolute top-2 right-2 flex size-10 items-center justify-center rounded-full text-gris">
        <IconeFermer className="size-4" />
      </button>
    </section>
  );
}
