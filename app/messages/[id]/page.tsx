import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Message, Offre } from "@/lib/types";
import { Chat } from "./Chat";

export const metadata: Metadata = { title: "Discussion" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ offre?: string }> };

export default async function Discussion({ params, searchParams }: Props) {
  const { id } = await params;
  const { offre } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?suite=/messages/${id}`);

  // La RLS renvoie null si l'utilisateur ne participe pas à la conversation
  const { data: conv } = await supabase
    .from("conversations")
    .select(
      `id, client_id, artisan_id,
       client:profiles!conversations_client_id_fkey(nom_complet),
       artisan:artisans!conversations_artisan_id_fkey(profil:profiles!artisans_id_fkey(nom_complet)),
       demande:demandes(description)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!conv) notFound();

  const [{ data: messages }, { data: offres }, { data: avis }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, conversation_id, auteur_id, type, contenu, media_path, offre_id, created_at")
      .eq("conversation_id", id)
      .order("created_at")
      .limit(200),
    supabase.from("offres").select("*").eq("conversation_id", id),
    supabase.from("avis").select("offre_id").eq("client_id", user.id),
  ]);

  const estArtisan = conv.artisan_id === user.id;
  const c = conv as unknown as {
    client: { nom_complet: string } | null;
    artisan: { profil: { nom_complet: string } | null } | null;
    demande: { description: string } | null;
  };
  const autre = (estArtisan ? c.client?.nom_complet : c.artisan?.profil?.nom_complet) ?? "Utilisateur";

  return (
    <Chat
      conversationId={id}
      moi={user.id}
      clientId={conv.client_id}
      artisanId={conv.artisan_id}
      estArtisan={estArtisan}
      autre={autre}
      sujet={c.demande?.description ?? null}
      messagesInitiaux={(messages ?? []) as Message[]}
      offresInitiales={(offres ?? []) as Offre[]}
      offresNotees={(avis ?? []).map((a) => a.offre_id)}
      ouvrirOffre={offre === "1" && estArtisan}
    />
  );
}
