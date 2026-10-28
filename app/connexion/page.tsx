import type { Metadata } from "next";
import { Entete } from "@/components/ui";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const metadata: Metadata = { title: "Connexion" };

export default async function Connexion({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  return (
    <>
      <Entete retour="/" />
      <main className="flex flex-col gap-6 px-5 pt-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-titre text-[26px] leading-tight font-bold">Connexion</h1>
          <p className="text-[15px] text-gris">
            Pas de mot de passe : vous recevez un code par SMS. Le même compte sert aux clients et aux artisans.
          </p>
        </div>
        <FormulaireConnexion suite={suite ?? "/"} />
      </main>
    </>
  );
}
