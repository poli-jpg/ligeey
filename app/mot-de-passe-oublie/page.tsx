import type { Metadata } from "next";
import { EcranAuth } from "@/components/EcranAuth";
import { FormulaireReinitialisation } from "./FormulaireReinitialisation";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default async function MotDePasseOublie({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  return (
    <EcranAuth
      titre="Mot de passe oublié"
      texte="On vous envoie un code par SMS, puis vous choisissez un nouveau mot de passe. Inscrit avant les mots de passe ? Passez aussi par ici."
      retour={`/connexion${suite ? `?suite=${encodeURIComponent(suite)}` : ""}`}
    >
      <FormulaireReinitialisation suite={suite ?? "/"} />
    </EcranAuth>
  );
}
