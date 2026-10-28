import type { Metadata } from "next";
import { Logo } from "@/components/Icones";
import { BoutonReessayer } from "./BoutonReessayer";

export const metadata: Metadata = { title: "Hors ligne" };

// Page statique mise en cache par le service worker, affichée quand il n'y a pas de réseau.
export default function HorsLigne() {
  return (
    <main className="flex min-h-dvh flex-col justify-between bg-nuit px-6 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <Logo clair />
      <div className="flex flex-col gap-4">
        <div className="ruban h-3 w-24 rounded-full" aria-hidden />
        <h1 className="font-titre text-[34px] leading-[1.05] font-extrabold tracking-tight text-white">
          Pas de connexion internet
        </h1>
        <p className="text-[15px] leading-relaxed text-slate-300">
          Vérifiez vos données mobiles ou le Wi-Fi. Vos messages et demandes vous attendent : rien n&apos;est perdu.
        </p>
      </div>
      <BoutonReessayer />
    </main>
  );
}
