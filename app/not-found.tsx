import Link from "next/link";

export default function PageIntrouvable() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-titre text-2xl font-bold">Page introuvable</h1>
      <p className="text-gris">Ce lien n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
      <Link href="/" className="bouton">Retour à l&apos;accueil</Link>
      <Link href="/connexion" className="text-sm font-bold text-nuit underline underline-offset-4">Se connecter avec un autre compte</Link>
    </main>
  );
}
