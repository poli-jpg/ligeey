"use client";

import { useFormStatus } from "react-dom";

export function BoutonEnvoi({
  children,
  enCours = "Envoi…",
  className = "bouton w-full",
  name,
  value,
  disabled = false,
}: {
  children: React.ReactNode;
  enCours?: string;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending || disabled} className={className}>
      {pending ? enCours : children}
    </button>
  );
}
