import Link from "next/link";
import { IconeRetour, Logo } from "./Icones";

/** Mise en page commune : Créer un compte, Se connecter, Mot de passe oublié. */
export function EcranAuth({
  titre,
  texte,
  retour = "/",
  children,
  pied,
}: {
  titre: string;
  texte: string;
  retour?: string;
  children: React.ReactNode;
  pied?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-col gap-8 rounded-b-[32px] bg-nuit px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-9">
        <div className="flex items-center justify-between">
          <Link href={retour} aria-label="Retour" className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white">
            <IconeRetour />
          </Link>
          <Logo clair />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-titre text-[32px] leading-[1.05] font-extrabold tracking-tight text-white">{titre}</h1>
          <p className="text-[15px] leading-relaxed text-slate-300">{texte}</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-6 px-5 pt-7 pb-[calc(env(safe-area-inset-bottom)+28px)]">
        {children}
        {pied ? <div className="mt-auto flex flex-col items-center gap-3 pt-4 text-center text-[15px]">{pied}</div> : null}
      </main>
    </div>
  );
}
