import Link from "next/link";
import type { Metadata } from "next";
import { EcranAuth } from "@/components/EcranAuth";
import { FormulaireInscription } from "./FormulaireInscription";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function Inscription({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  const suiteQs = suite ? `?suite=${encodeURIComponent(suite)}` : "";
  return (
    <EcranAuth
      titre="Créer un compte"
      texte="Gratuit, en une minute. Le même compte sert pour trouver un artisan ou proposer vos services."
      pied={
        <p className="text-gris">
          Déjà inscrit ?{" "}
          <Link href={`/connexion${suiteQs}`} className="font-extrabold text-nuit underline decoration-chantier decoration-2 underline-offset-4">
            Se connecter
          </Link>
        </p>
      }
    >
      <FormulaireInscription suite={suite ?? "/"} />
    </EcranAuth>
  );
}
