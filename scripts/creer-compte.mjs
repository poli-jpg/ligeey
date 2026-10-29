// Crée un compte Ligeey déjà confirmé (sans SMS), pour les testeurs.
//
//   npm run creer-compte -- 771234567 "Prénom Nom" motdepasse
//
// Nécessite SUPABASE_SECRET_KEY dans .env.local (Supabase › Project Settings › API Keys › secret).
// Cette clé donne tous les droits : ne jamais la mettre dans le code, sur GitHub ou sur Vercel.
import { createClient } from "@supabase/supabase-js";

const [numero, nom, motDePasse] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cleSecrete = process.env.SUPABASE_SECRET_KEY;

function arreter(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (!url || !cleSecrete) arreter("Ajoutez SUPABASE_SECRET_KEY dans .env.local (Supabase › Project Settings › API Keys).");
if (!numero || !nom || !motDePasse) arreter('Usage : npm run creer-compte -- 771234567 "Prénom Nom" motdepasse');

const chiffres = numero.replace(/\D/g, "");
const telephone = chiffres.length === 9 ? `221${chiffres}` : chiffres.startsWith("221") && chiffres.length === 12 ? chiffres : null;
if (!telephone) arreter("Numéro invalide. Exemple : 771234567");
if (motDePasse.length < 8) arreter("Le mot de passe doit faire au moins 8 caractères.");

const supabase = createClient(url, cleSecrete, { auth: { persistSession: false, autoRefreshToken: false } });

const { data, error } = await supabase.auth.admin.createUser({
  phone: telephone,
  password: motDePasse,
  phone_confirm: true, // numéro considéré comme vérifié : badge « Téléphone vérifié »
  user_metadata: { nom_complet: nom },
});

if (error) {
  if (/already/i.test(error.message)) arreter(`Le numéro ${numero} a déjà un compte.`);
  arreter(`Création impossible : ${error.message}`);
}

console.log(`
✓ Compte créé pour ${nom}
  Numéro       : ${numero}
  Mot de passe : ${motDePasse}
  Identifiant  : ${data.user.id}

À la première connexion, l'appli demandera le quartier et « client ou artisan ».
`);
