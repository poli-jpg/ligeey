"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compresserImage } from "@/lib/images";
import { dateCourte, fcfa, heure } from "@/lib/format";
import type { Message, Offre, StatutOffre } from "@/lib/types";
import { IconeEnvoyer, IconeFermer, IconePhoto, IconeRetour } from "@/components/Icones";
import { Avatar, Erreur, Pastille } from "@/components/ui";

type Props = {
  conversationId: string;
  moi: string;
  clientId: string;
  artisanId: string;
  estArtisan: boolean;
  autre: string;
  sujet: string | null;
  messagesInitiaux: Message[];
  offresInitiales: Offre[];
  offresNotees: string[];
  ouvrirOffre: boolean;
};

const LIBELLE_STATUT: Record<StatutOffre, { texte: string; ton: "vert" | "ambre" | "chantier" | "gris" }> = {
  envoyee: { texte: "En attente de réponse", ton: "ambre" },
  acceptee: { texte: "Acceptée · mission en cours", ton: "vert" },
  refusee: { texte: "Refusée", ton: "gris" },
  annulee: { texte: "Retirée par l'artisan", ton: "gris" },
  terminee: { texte: "Mission terminée", ton: "vert" },
};

export function Chat(props: Props) {
  const { conversationId, moi, clientId, estArtisan } = props;
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>(props.messagesInitiaux);
  const [offres, setOffres] = useState<Record<string, Offre>>(
    Object.fromEntries(props.offresInitiales.map((o) => [o.id, o])),
  );
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [formOffre, setFormOffre] = useState(props.ouvrirOffre);
  const bas = useRef<HTMLDivElement>(null);
  const champPhoto = useRef<HTMLInputElement>(null);

  const ajouterMessage = (m: Message) =>
    setMessages((liste) => (liste.some((x) => x.id === m.id) ? liste : [...liste, m]));
  const majOffre = (o: Offre) => setOffres((map) => ({ ...map, [o.id]: o }));

  // Temps réel : nouveaux messages + changements de statut des offres
  useEffect(() => {
    const canal = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (p) => ajouterMessage(p.new as Message),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offres", filter: `conversation_id=eq.${conversationId}` },
        (p) => p.new && "id" in p.new && majOffre(p.new as Offre),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [supabase, conversationId]);

  // Carte d'offre arrivée avant l'offre elle-même : on la charge
  useEffect(() => {
    const manquantes = messages.filter((m) => m.offre_id && !offres[m.offre_id]).map((m) => m.offre_id!);
    if (!manquantes.length) return;
    supabase
      .from("offres")
      .select("*")
      .in("id", manquantes)
      .then(({ data }) => data?.forEach((o) => majOffre(o as Offre)));
  }, [messages, offres, supabase]);

  useEffect(() => {
    bas.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function envoyerTexte(e: React.FormEvent) {
    e.preventDefault();
    const contenu = texte.trim();
    if (!contenu || envoi) return;
    setEnvoi(true);
    setErreur(null);
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, auteur_id: moi, type: "texte", contenu })
      .select()
      .single();
    setEnvoi(false);
    if (error) return setErreur("Message non envoyé. Vérifiez votre connexion.");
    setTexte("");
    ajouterMessage(data as Message);
  }

  async function envoyerPhoto(fichier: File) {
    setEnvoi(true);
    setErreur(null);
    try {
      const image = await compresserImage(fichier);
      const chemin = `${conversationId}/${crypto.randomUUID()}.jpg`;
      const { error: errUpload } = await supabase.storage.from("messages").upload(chemin, image, { contentType: "image/jpeg" });
      if (errUpload) throw errUpload;
      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, auteur_id: moi, type: "image", media_path: chemin })
        .select()
        .single();
      if (error) throw error;
      ajouterMessage(data as Message);
    } catch {
      setErreur("Photo non envoyée. Réessayez.");
    } finally {
      setEnvoi(false);
      if (champPhoto.current) champPhoto.current.value = "";
    }
  }

  async function actionOffre(fn: "repondre_offre" | "terminer_offre" | "annuler_offre", offreId: string, accepter?: boolean) {
    setErreur(null);
    const args = fn === "repondre_offre" ? { p_offre: offreId, p_accepter: accepter } : { p_offre: offreId };
    const { error } = await supabase.rpc(fn, args);
    if (error) return setErreur(error.message);
    const { data } = await supabase.from("offres").select("*").eq("id", offreId).single();
    if (data) majOffre(data as Offre);
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-2 bg-nuit px-2 pt-[calc(env(safe-area-inset-top)+8px)] pb-2 text-white">
        <Link href="/messages" aria-label="Retour aux messages" className="flex size-11 items-center justify-center rounded-full bg-white/10">
          <IconeRetour />
        </Link>
        <Avatar nom={props.autre} taille="sm" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-bold">{props.autre}</span>
          <span className="truncate text-xs text-slate-300">{props.sujet ? `Devis : ${props.sujet}` : estArtisan ? "Client" : "Artisan"}</span>
        </span>
        {estArtisan ? (
          <button type="button" onClick={() => setFormOffre((v) => !v)} className="bouton min-h-10 px-3.5 text-[13px]">
            {formOffre ? "Fermer" : "Faire une offre"}
          </button>
        ) : null}
      </header>

      {formOffre ? (
        <FormulaireOffre
          onAnnuler={() => setFormOffre(false)}
          onEnvoyer={async (champs) => {
            const { data, error } = await supabase
              .from("offres")
              .insert({ ...champs, conversation_id: conversationId, artisan_id: moi, client_id: clientId })
              .select()
              .single();
            if (error) return "Offre non envoyée. Vérifiez les champs.";
            majOffre(data as Offre);
            setFormOffre(false);
            return null;
          }}
        />
      ) : null}

      <main className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <p className="mx-auto mt-6 max-w-64 text-center text-sm text-gris">
            Présentez votre besoin : ce qu&apos;il faut faire, où, et quand. Vous pouvez joindre une photo.
          </p>
        ) : null}
        {messages.map((m) => {
          const deMoi = m.auteur_id === moi;
          if (m.type === "offre" && m.offre_id) {
            const o = offres[m.offre_id];
            return o ? (
              <CarteOffre
                key={m.id}
                offre={o}
                estClient={moi === clientId}
                dejaNotee={props.offresNotees.includes(o.id)}
                onAction={actionOffre}
              />
            ) : null;
          }
          return (
            <div key={m.id} className={`flex max-w-[78%] flex-col gap-1 ${deMoi ? "self-end items-end" : "self-start"}`}>
              {m.type === "image" && m.media_path ? <ImageChat chemin={m.media_path} /> : null}
              {m.contenu ? (
                <p
                  className={`px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    deMoi ? "rounded-[18px_18px_4px_18px] bg-nuit text-white" : "rounded-[18px_18px_18px_4px] border border-trait bg-carte"
                  }`}
                >
                  {m.contenu}
                </p>
              ) : null}
              <span className="px-1 text-[11px] text-gris">{heure(m.created_at)}</span>
            </div>
          );
        })}
        <div ref={bas} />
      </main>

      <div className="border-t border-trait bg-carte px-3 pt-2.5 pb-[max(env(safe-area-inset-bottom),12px)]">
        <Erreur message={erreur} />
        <form onSubmit={envoyerTexte} className="flex items-center gap-2 pt-1">
          <input
            ref={champPhoto}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && envoyerPhoto(e.target.files[0])}
          />
          <button type="button" aria-label="Joindre une photo" onClick={() => champPhoto.current?.click()} className="flex size-11 shrink-0 items-center justify-center rounded-full text-gris">
            <IconePhoto />
          </button>
          <label className="sr-only" htmlFor="message">Votre message</label>
          <input
            id="message"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Votre message…"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 rounded-full border border-trait bg-fond px-4 text-base outline-none focus:border-nuit"
          />
          <button type="submit" disabled={envoi || !texte.trim()} aria-label="Envoyer" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-nuit text-white disabled:opacity-50">
            <IconeEnvoyer />
          </button>
        </form>
      </div>
    </div>
  );
}

function ImageChat({ chemin }: { chemin: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    createClient()
      .storage.from("messages")
      .createSignedUrl(chemin, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [chemin]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, pas d'optimisation Next utile
    <img src={url} alt="Photo envoyée" className="max-h-60 w-48 rounded-2xl object-cover" />
  ) : (
    <span className="block h-36 w-48 animate-pulse rounded-2xl bg-photo" />
  );
}

function CarteOffre({
  offre,
  estClient,
  dejaNotee,
  onAction,
}: {
  offre: Offre;
  estClient: boolean;
  dejaNotee: boolean;
  onAction: (fn: "repondre_offre" | "terminer_offre" | "annuler_offre", id: string, accepter?: boolean) => Promise<void>;
}) {
  const [occupe, setOccupe] = useState(false);
  const statut = LIBELLE_STATUT[offre.statut];
  const lancer = async (fn: Parameters<typeof onAction>[0], accepter?: boolean) => {
    setOccupe(true);
    await onAction(fn, offre.id, accepter);
    setOccupe(false);
  };

  return (
    <article className="carte flex w-[280px] flex-col gap-3 self-start overflow-hidden p-0">
      <div className="ruban h-2" aria-hidden />
      <div className="flex flex-col gap-2.5 px-4 pb-4">
      <span className="text-xs font-bold text-chantier-fonce">Offre de prix</span>
      <h3 className="font-titre text-[17px] leading-snug font-extrabold">{offre.titre}</h3>
      <dl className="flex flex-col gap-1 text-[13px] text-gris">
        <div className="flex justify-between"><dt>Prix</dt><dd className="font-bold text-encre">{fcfa(offre.prix)}</dd></div>
        <div className="flex justify-between"><dt>Date</dt><dd className="font-bold text-encre">{dateCourte(offre.date_prevue)}</dd></div>
        {offre.duree ? <div className="flex justify-between"><dt>Durée</dt><dd className="font-bold text-encre">{offre.duree}</dd></div> : null}
      </dl>
      <Pastille ton={statut.ton}>{statut.texte}</Pastille>

      {estClient && offre.statut === "envoyee" ? (
        <div className="flex gap-2">
          <button disabled={occupe} onClick={() => lancer("repondre_offre", false)} className="bouton-secondaire flex-1">Refuser</button>
          <button disabled={occupe} onClick={() => lancer("repondre_offre", true)} className="bouton min-h-11 flex-1 text-sm">Accepter</button>
        </div>
      ) : null}
      {estClient && offre.statut === "acceptee" ? (
        <button disabled={occupe} onClick={() => lancer("terminer_offre")} className="bouton-secondaire border-nuit">
          Le travail est terminé
        </button>
      ) : null}
      {estClient && offre.statut === "terminee" && !dejaNotee ? (
        <Link href={`/avis/${offre.id}`} className="bouton min-h-11 text-sm">Noter l&apos;artisan</Link>
      ) : null}
      {!estClient && offre.statut === "envoyee" ? (
        <button disabled={occupe} onClick={() => lancer("annuler_offre")} className="bouton-secondaire">Retirer l&apos;offre</button>
      ) : null}
      </div>
    </article>
  );
}

function FormulaireOffre({
  onEnvoyer,
  onAnnuler,
}: {
  onEnvoyer: (o: { titre: string; prix: number; date_prevue: string | null; duree: string | null }) => Promise<string | null>;
  onAnnuler: () => void;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const prix = parseInt(String(f.get("prix")).replace(/\s/g, ""), 10);
    if (!Number.isFinite(prix) || prix < 0) return setErreur("Indiquez un prix en FCFA.");
    const date = String(f.get("date") || "");
    setOccupe(true);
    const err = await onEnvoyer({
      titre: String(f.get("titre")).trim(),
      prix,
      date_prevue: date ? new Date(date).toISOString() : null,
      duree: String(f.get("duree") || "").trim() || null,
    });
    setOccupe(false);
    setErreur(err);
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-3 border-b border-trait bg-fond p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-titre font-bold">Nouvelle offre</h2>
        <button type="button" onClick={onAnnuler} aria-label="Fermer" className="flex size-10 items-center justify-center"><IconeFermer /></button>
      </div>
      <label className="flex flex-col gap-1 text-sm font-bold">
        Travail proposé
        <input name="titre" required minLength={3} maxLength={120} placeholder="Ex. : Réparation fuite évier" className="champ font-normal" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-sm font-bold">
          Prix (FCFA)
          <input name="prix" required inputMode="numeric" placeholder="15000" className="champ font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Durée
          <input name="duree" maxLength={60} placeholder="2 h" className="champ font-normal" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-bold">
        Date et heure
        <input name="date" type="datetime-local" className="champ font-normal" />
      </label>
      <Erreur message={erreur} />
      <button disabled={occupe} className="bouton">{occupe ? "Envoi…" : "Envoyer l'offre"}</button>
    </form>
  );
}
