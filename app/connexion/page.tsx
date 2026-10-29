import Link from "next/link";
import type { Metadata } from "next";
import { EcranAuth } from "@/components/EcranAuth";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const metadata: Metadata = { title: "Se connecter" };

export default async function Connexion({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  const suiteQs = suite ? `?suite=${encodeURIComponent(suite)}` : "";
  return (
    <EcranAuth
      titre="Se connecter"
      texte="Avec votre numéro et votre mot de passe."
      pied={
        <>
          <p className="text-gris">Pas encore de compte ?</p>
          <Link href={`/inscription${suiteQs}`} className="bouton-secondaire w-full min-h-[52px] text-[15px]">
            Créer un compte
          </Link>
        </>
      }
    >
      <FormulaireConnexion suite={suite ?? "/"} />
    </EcranAuth>
  );
}
