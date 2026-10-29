# Ligeey

Application de mise en relation entre **artisans du bâtiment** (maçons, électriciens, plombiers, peintres…) et **clients**, au Sénégal.

PWA mobile (installable sur Android depuis le navigateur) · **Next.js 16** · **Supabase** (Auth par SMS, Postgres + PostGIS, Realtime, Storage) · **Vercel**.

---

## Démarrer en local

### 1. Créer le projet Supabase

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Applique le schéma de la base. Deux possibilités :
   - **Le plus simple** : ouvre *SQL Editor*, colle le contenu de `supabase/migrations/20261028000000_schema_initial.sql` et exécute-le.
   - **Avec le CLI** :
     ```bash
     npx supabase init          # répondre "N" aux questions VS Code / Deno
     npx supabase link --project-ref <ref-du-projet>
     npx supabase db push
     ```
3. Active la **connexion par téléphone** : *Authentication › Sign In / Providers › Phone*.
   - Il faut un fournisseur SMS (Twilio, MessageBird, Vonage…).
   - **Pour développer sans SMS** : dans la même page, ajoute des *test phone numbers*, par exemple `221770000001=123456`. Tu te connectes alors avec `77 000 00 01` et le code `123456`.

### 2. Lancer l'application

```bash
cp .env.example .env.local   # puis remplir l'URL et la clé publique (Project Settings › API)
npm install
npm run dev
```

Ouvre <http://localhost:3000>. Dans le navigateur, passe en vue mobile (F12 › icône téléphone).

### 3. Devenir administrateur

Connecte-toi une première fois avec ton numéro, puis dans le *SQL Editor* :

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where phone = '221784653251');
```

La page `/admin` permet alors de valider les pièces d'identité (badge « Vérifié »).

---

## Structure

```
app/
  page.tsx                 Accueil client
  recherche/               Recherche + filtres (métier, quartier, dispo, note, vérifié)
  artisans/[id]/           Profil public d'un artisan
  connexion/               Connexion par SMS (OTP)
  bienvenue/               Première connexion : nom, quartier, client ou artisan
  messages/                Liste des conversations
  messages/[id]/Chat.tsx   Chat temps réel + cartes d'offre (accepter, terminer, noter)
  devis/                   Demandes de devis du client (+ nouvelle)
  avis/[offreId]/          Noter l'artisan après une mission terminée
  espace/                  Tableau de bord artisan (dispo, demandes près de lui)
  espace/profil/           Fiche artisan, photos de réalisations, pièce d'identité
  admin/                   Validation des pièces, signalements
actions/                   Server Actions (auth, fiche artisan, demandes, avis…)
components/                Interface réutilisable (navigation, cartes, icônes…)
lib/supabase/              Clients Supabase : serveur, navigateur, proxy (session)
proxy.ts                   Rafraîchit la session, protège les pages privées
supabase/migrations/       Tout le schéma SQL
```

## Comment la base protège les règles métier

Les règles sont appliquées **dans Postgres** (RLS + fonctions), pas seulement dans l'interface :

| Règle | Où |
|---|---|
| Personne ne peut se donner le rôle admin, le badge vérifié ou une fausse note | Droits par colonne (`grant update (…)`) |
| Une conversation n'est visible que par ses deux participants | RLS `conversations`, `messages` |
| Seul l'artisan de la conversation peut faire une offre | RLS `offres` |
| Accepter / refuser / terminer une offre | Fonctions `repondre_offre`, `terminer_offre`, `annuler_offre` |
| Un avis seulement après une mission **terminée**, une seule fois | RLS `avis` + contrainte unique |
| La note moyenne est recalculée automatiquement | Trigger `recalculer_note` |
| Les pièces d'identité ne sont visibles que par l'artisan et l'admin | Bucket privé + politiques Storage |
| Distance artisan ↔ client | PostGIS, centre du quartier (`quartiers`) |

Ces règles ont été testées sur un Postgres 16 + PostGIS (triche refusée, accès d'un intrus refusé, parcours offre → avis complet).

**Quartiers** : les coordonnées des 18 quartiers de départ sont approximatives (centre du quartier). Complète ou affine la table `quartiers` au besoin.

## Application mobile (PWA)

Ligeey s'installe comme une appli, sans Play Store ni App Store :

- **Android (Chrome)** : la carte « Installer Ligeey » apparaît sur l'accueil → bouton **Installer**. Sinon menu ⋮ › *Installer l'application*.
- **iPhone (Safari)** : bouton Partager › *Sur l'écran d'accueil* (la carte l'explique).
- **Appui long sur l'icône** (Android) : raccourcis *Chercher*, *Demande*, *Messages*.
- **Sans réseau** : page « Pas de connexion internet », retour automatique quand le réseau revient.
- **Nouvelle version déployée** : un bandeau propose « Mettre à jour ».

Fichiers : `app/manifest.ts`, `public/sw.js` (changer `VERSION` quand on le modifie), `components/PWA.tsx`, `components/InstallerApp.tsx`, `app/hors-ligne/`, icônes dans `public/icones/`.

Le service worker ne tourne qu'en production : pour le tester en local, `npm run build && npm start`.

## Inscription et connexion

Numéro de téléphone + mot de passe (8 caractères minimum) :

- **Créer un compte** (`/inscription`) : nom, numéro, mot de passe → un code SMS confirme le numéro (badge « Téléphone vérifié ») → page Bienvenue (quartier, client ou artisan).
- **Se connecter** (`/connexion`) : numéro + mot de passe, **sans SMS**.
- **Mot de passe oublié** (`/mot-de-passe-oublie`) : code SMS puis nouveau mot de passe. Les comptes créés avant les mots de passe passent par ici une fois.

Un SMS n'est donc envoyé qu'à l'inscription et en cas d'oubli. Les messages d'erreur ne révèlent jamais si un numéro est inscrit ou non (sauf à l'inscription, pour proposer de se connecter).

Code : `actions/auth.ts`, `components/ChampsAuth.tsx`, `components/EcranAuth.tsx`.

## Créer des comptes de test (sans SMS)

```bash
npm run creer-compte -- 771234567 "Prénom Nom" motdepasse
```

Le compte est créé déjà confirmé (badge « Téléphone vérifié ») : le testeur se connecte sur `/connexion` avec ce numéro et ce mot de passe. Nécessite `SUPABASE_SECRET_KEY` dans `.env.local` (voir `.env.example`).

## Badges de confiance

| Badge | Comment on l'obtient |
|---|---|
| Téléphone vérifié (gris) | Automatique quand le code SMS est validé (`profiles.telephone_verifie`, trigger sur `auth.users`) |
| Identité vérifiée (vert) | Pièce d'identité envoyée par l'artisan puis validée par un admin dans `/admin` |
| Recommandé (jaune) | Calculé : au moins 10 avis et une note de 4,5 ou plus (`lib/types.ts`, `SEUIL_RECOMMANDE`) |

## Signalements

Sur chaque profil : « Signaler ce profil » (raison + détails). Les signalements ne sont visibles que par l'admin, qui peut **masquer le profil** (il disparaît de la recherche) et **marquer le signalement traité**.

## Déployer sur Vercel

1. Pousse le dépôt sur GitHub, puis importe-le dans Vercel.
2. Ajoute les variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Dans Supabase, *Authentication › URL Configuration* : mets l'URL Vercel comme *Site URL*.

## Prochaines étapes

- [ ] Messages vocaux dans le chat (MediaRecorder, le bucket `messages` accepte déjà l'audio)
- [ ] Photos jointes à une demande de devis (colonne `demandes.photos` prête)
- [ ] Notifications : nouvelle demande pour l'artisan, nouvelle offre pour le client (Web Push ou SMS)
- [ ] Géolocalisation GPS en option, en plus du quartier
- [ ] Paiement d'acompte Wave / Orange Money
- [ ] Types TypeScript générés : `npx supabase gen types typescript --linked > lib/database.types.ts`
