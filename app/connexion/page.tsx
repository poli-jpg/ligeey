import Link from "next/link";
import type { Metadata } from "next";
import { IconeRetour, Logo } from "@/components/Icones";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const metadata: Metadata = { title: "Connexion" };

export default async function Connexion({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-col gap-10 rounded-b-[32px] bg-nuit px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Retour à l'accueil" className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white">
            <IconeRetour />
          </Link>
          <Logo clair />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-titre text-[34px] leading-[1.05] font-extrabold tracking-tight text-white">Connexion</h1>
          <p className="text-[15px] leading-relaxed text-slate-300">
            Pas de mot de passe : on vous envoie un code par SMS. Un seul compte pour chercher un artisan ou proposer vos services.
          </p>
        </div>
      </header>
      <main className="flex-1 px-5 pt-8 pb-10">
        <FormulaireConnexion suite={suite ?? "/"} />
      </main>
    </div>
  );
}
