// Affiché aussitôt qu'on touche un lien, pendant que le serveur prépare la page.
// Sans lui, l'écran reste figé jusqu'à la réponse et l'appli paraît lente.
export default function Chargement() {
  return (
    <div role="status" aria-label="Chargement" className="animate-pulse">
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+20px)] pb-4">
        <div className="h-7 w-40 rounded-full bg-photo" />
        <div className="mt-3 h-4 w-56 rounded-full bg-photo" />
      </div>

      <div className="space-y-3 px-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-3xl bg-carte p-4">
            <div className="size-12 shrink-0 rounded-full bg-photo" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded-full bg-photo" />
              <div className="h-3 w-1/2 rounded-full bg-photo" />
            </div>
          </div>
        ))}
      </div>

      {/* Emplacement de la barre du bas, pour que l'écran ne saute pas */}
      <div aria-hidden className="h-[calc(72px+env(safe-area-inset-bottom))]" />
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto h-[calc(72px+env(safe-area-inset-bottom))] max-w-md border-t border-trait bg-carte/95" />
    </div>
  );
}
