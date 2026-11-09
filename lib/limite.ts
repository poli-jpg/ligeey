import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Limite le nombre de tentatives (connexion, codes SMS…) par numéro ET par
 * adresse IP. Les appels à Supabase partent du serveur Vercel : sans ce
 * compteur, Supabase verrait toujours la même adresse et ne pourrait pas
 * freiner quelqu'un qui essaie des mots de passe en boucle.
 */

export const TROP_DE_TENTATIVES = "Trop de tentatives. Patientez 15 minutes puis réessayez.";

async function adresseIp() {
  const h = await headers();
  // Sur Vercel, x-forwarded-for est réécrit par la plateforme : la 1re adresse est celle du visiteur
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnue";
}

const empreinte = (texte: string) => createHash("sha256").update(`ligeey-limite:${texte}`).digest("hex");

type Regle = { type: string; max: number; fenetreS: number; parNumero: boolean };

export const REGLES = {
  // Mot de passe : 8 essais / 15 min pour un numéro depuis une adresse, 40 / 15 min par adresse
  connexion: [
    { type: "cx", max: 8, fenetreS: 900, parNumero: true },
    { type: "cxip", max: 40, fenetreS: 900, parNumero: false },
  ],
  // Code SMS saisi : 10 essais / 15 min
  code: [
    { type: "otp", max: 10, fenetreS: 900, parNumero: true },
    { type: "otpip", max: 40, fenetreS: 900, parNumero: false },
  ],
  // Envoi d'un SMS (inscription, renvoi, mot de passe oublié) : chaque SMS coûte de l'argent
  sms: [
    { type: "sms", max: 3, fenetreS: 3600, parNumero: true },
    { type: "smsip", max: 10, fenetreS: 3600, parNumero: false },
  ],
} satisfies Record<string, Regle[]>;

/** true si l'action est autorisée (et compte la tentative), false si la limite est atteinte. */
export async function autoriser(supabase: SupabaseClient, regles: Regle[], telephone: string | null) {
  const ip = await adresseIp();
  for (const r of regles) {
    const cle = `${r.type}:${empreinte(r.parNumero ? `${telephone ?? ""}|${ip}` : ip)}`;
    const { data, error } = await supabase.rpc("consommer_tentative", { p_cle: cle, p_max: r.max, p_fenetre_s: r.fenetreS });
    // Base pas encore à jour ou indisponible : on ne bloque pas les vrais utilisateurs
    if (error) {
      console.error("limite", error.code, error.message);
      continue;
    }
    if (data === false) return false;
  }
  return true;
}
