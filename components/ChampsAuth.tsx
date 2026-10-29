"use client";

import { useState } from "react";

/** Numéro sénégalais avec l'indicatif +221 affiché. */
export function ChampTelephone({ defaut }: { defaut?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">Numéro de téléphone</span>
      <span className="flex items-center gap-2">
        <span className="flex min-h-[50px] items-center rounded-[14px] border-[1.5px] border-trait bg-carte px-3.5 font-semibold">+221</span>
        <input
          name="telephone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="77 123 45 67"
          defaultValue={defaut}
          required
          className="champ"
        />
      </span>
    </label>
  );
}

/** Mot de passe avec bouton Afficher / Masquer. */
export function ChampMotDePasse({
  label = "Mot de passe",
  nouveau = false,
  aide,
}: {
  label?: string;
  nouveau?: boolean;
  aide?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">{label}</span>
      <span className="relative flex">
        <input
          name="mot_de_passe"
          type={visible ? "text" : "password"}
          autoComplete={nouveau ? "new-password" : "current-password"}
          minLength={nouveau ? 8 : undefined}
          required
          className="champ pr-24"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg px-3 py-2 text-[13px] font-bold text-nuit"
        >
          {visible ? "Masquer" : "Afficher"}
        </button>
      </span>
      {aide ? <span className="text-xs text-gris">{aide}</span> : null}
    </label>
  );
}

/** Code SMS à 6 chiffres. */
export function ChampCode({ telephone }: { telephone?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">Code reçu par SMS</span>
      {telephone ? <span className="text-[13px] text-gris">Envoyé au {telephone.replace(/^\+221/, "")}</span> : null}
      <input
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        placeholder="••••••"
        required
        autoFocus
        className="champ text-center text-2xl tracking-[0.5em]"
      />
    </label>
  );
}
