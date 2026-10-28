-- =====================================================================
-- Ligeey : schéma initial
-- Tables, référentiels, sécurité (RLS), recherche par distance (PostGIS),
-- triggers métier, fonctions d'offre / d'avis, stockage des fichiers.
-- =====================================================================

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.role_utilisateur as enum ('client', 'artisan', 'admin');
create type public.statut_offre as enum ('envoyee', 'acceptee', 'refusee', 'terminee', 'annulee');
create type public.urgence as enum ('urgent', 'semaine', 'flexible');
create type public.statut_verification as enum ('non_soumis', 'en_attente', 'verifie', 'refuse');
create type public.statut_demande as enum ('ouverte', 'pourvue', 'fermee');
create type public.type_message as enum ('texte', 'image', 'vocal', 'offre');

-- ---------------------------------------------------------------------
-- Référentiels : métiers et quartiers
-- ---------------------------------------------------------------------
create table public.metiers (
  slug  text primary key,
  nom   text not null,
  ordre int  not null default 0
);

insert into public.metiers (slug, nom, ordre) values
  ('macon', 'Maçon', 1),
  ('electricien', 'Électricien', 2),
  ('plombier', 'Plombier', 3),
  ('peintre', 'Peintre', 4),
  ('menuisier', 'Menuisier', 5),
  ('carreleur', 'Carreleur', 6),
  ('soudeur', 'Soudeur / ferronnier', 7),
  ('frigoriste', 'Frigoriste (clim)', 8),
  ('etancheur', 'Étanchéité', 9),
  ('platrier', 'Plâtrier / staffeur', 10);

-- Position approximative du centre de chaque quartier : sert à calculer les distances
-- sans demander le GPS. À compléter / affiner au besoin.
create table public.quartiers (
  slug     text primary key,
  nom      text not null,
  commune  text not null,
  position extensions.geography(point, 4326) not null
);

insert into public.quartiers (slug, nom, commune, position) values
  ('plateau',      'Plateau',             'Dakar',      extensions.st_point(-17.4381, 14.6708, 4326)::extensions.geography),
  ('medina',       'Médina',              'Dakar',      extensions.st_point(-17.4470, 14.6810, 4326)::extensions.geography),
  ('fann',         'Fann',                'Dakar',      extensions.st_point(-17.4630, 14.6930, 4326)::extensions.geography),
  ('hlm',          'HLM',                 'Dakar',      extensions.st_point(-17.4440, 14.7110, 4326)::extensions.geography),
  ('liberte',      'Liberté',             'Dakar',      extensions.st_point(-17.4600, 14.7160, 4326)::extensions.geography),
  ('sacre-coeur',  'Sacré-Cœur',          'Dakar',      extensions.st_point(-17.4680, 14.7210, 4326)::extensions.geography),
  ('mermoz',       'Mermoz',              'Dakar',      extensions.st_point(-17.4740, 14.7060, 4326)::extensions.geography),
  ('ouakam',       'Ouakam',              'Dakar',      extensions.st_point(-17.4880, 14.7240, 4326)::extensions.geography),
  ('ngor',         'Ngor',                'Dakar',      extensions.st_point(-17.5130, 14.7500, 4326)::extensions.geography),
  ('yoff',         'Yoff',                'Dakar',      extensions.st_point(-17.4730, 14.7560, 4326)::extensions.geography),
  ('grand-yoff',   'Grand Yoff',          'Dakar',      extensions.st_point(-17.4560, 14.7330, 4326)::extensions.geography),
  ('parcelles',    'Parcelles Assainies', 'Dakar',      extensions.st_point(-17.4410, 14.7640, 4326)::extensions.geography),
  ('pikine',       'Pikine',              'Pikine',     extensions.st_point(-17.3900, 14.7550, 4326)::extensions.geography),
  ('thiaroye',     'Thiaroye',            'Pikine',     extensions.st_point(-17.3660, 14.7490, 4326)::extensions.geography),
  ('guediawaye',   'Guédiawaye',          'Guédiawaye', extensions.st_point(-17.3970, 14.7770, 4326)::extensions.geography),
  ('mbao',         'Mbao',                'Pikine',     extensions.st_point(-17.3270, 14.7330, 4326)::extensions.geography),
  ('keur-massar',  'Keur Massar',         'Keur Massar',extensions.st_point(-17.3110, 14.7830, 4326)::extensions.geography),
  ('rufisque',     'Rufisque',            'Rufisque',   extensions.st_point(-17.2730, 14.7160, 4326)::extensions.geography);

-- ---------------------------------------------------------------------
-- Profils (1 par compte) et artisans
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.role_utilisateur not null default 'client',
  nom_complet text not null default '',
  quartier    text references public.quartiers (slug),
  avatar_url  text,
  created_at  timestamptz not null default now()
);
-- Le numéro de téléphone reste dans auth.users (jamais exposé publiquement).

create table public.artisans (
  id                uuid primary key references public.profiles (id) on delete cascade,
  metier            text not null references public.metiers (slug),
  competences       text[] not null default '{}',
  bio               text check (char_length(bio) <= 1000),
  annees_experience int check (annees_experience between 0 and 70),
  tarif_base        int check (tarif_base >= 0),          -- FCFA, tarif de déplacement / de base
  quartier_base     text not null references public.quartiers (slug),
  zones             text[] not null default '{}',          -- slugs de quartiers couverts
  position          extensions.geography(point, 4326),     -- calculée depuis quartier_base
  jours_dispo       smallint[] not null default '{1,2,3,4,5,6}', -- 1 = lundi … 7 = dimanche
  disponible        boolean not null default true,
  verification      public.statut_verification not null default 'non_soumis',
  note_moyenne      numeric(2, 1) not null default 0,
  nb_avis           int not null default 0,
  nb_missions       int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index artisans_position_idx on public.artisans using gist (position);
create index artisans_metier_idx on public.artisans (metier);

create table public.realisations (
  id         uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  image_path text not null,             -- chemin dans le bucket "realisations"
  legende    text check (char_length(legende) <= 140),
  created_at timestamptz not null default now()
);
create index realisations_artisan_idx on public.realisations (artisan_id);

-- Pièces d'identité envoyées pour obtenir le badge "Vérifié"
create table public.verifications (
  id            uuid primary key default gen_random_uuid(),
  artisan_id    uuid not null references public.artisans (id) on delete cascade,
  document_path text not null,          -- chemin dans le bucket privé "pieces-identite"
  statut        public.statut_verification not null default 'en_attente',
  motif_refus   text,
  traite_par    uuid references public.profiles (id),
  traite_le     timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Demandes de devis, conversations, messages, offres, avis
-- ---------------------------------------------------------------------
create table public.demandes (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles (id) on delete cascade,
  metier      text not null references public.metiers (slug),
  description text not null check (char_length(description) between 10 and 2000),
  quartier    text not null references public.quartiers (slug),
  position    extensions.geography(point, 4326),   -- calculée depuis le quartier
  budget      int check (budget >= 0),
  urgence     public.urgence not null default 'semaine',
  photos      text[] not null default '{}',
  statut      public.statut_demande not null default 'ouverte',
  created_at  timestamptz not null default now()
);
create index demandes_ouvertes_idx on public.demandes (metier, created_at desc) where statut = 'ouverte';

create table public.conversations (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.profiles (id) on delete cascade,
  artisan_id         uuid not null references public.artisans (id) on delete cascade,
  demande_id         uuid references public.demandes (id) on delete set null,
  dernier_message_at timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  constraint conversation_unique unique nulls not distinct (client_id, artisan_id, demande_id),
  constraint pas_soi_meme check (client_id <> artisan_id)
);
create index conversations_client_idx on public.conversations (client_id, dernier_message_at desc);
create index conversations_artisan_idx on public.conversations (artisan_id, dernier_message_at desc);

create table public.offres (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  artisan_id      uuid not null references public.artisans (id) on delete cascade,
  client_id       uuid not null references public.profiles (id) on delete cascade,
  titre           text not null check (char_length(titre) between 3 and 120),
  prix            int not null check (prix >= 0),          -- FCFA
  date_prevue     timestamptz,
  duree           text check (char_length(duree) <= 60),
  statut          public.statut_offre not null default 'envoyee',
  repondue_le     timestamptz,
  terminee_le     timestamptz,
  created_at      timestamptz not null default now()
);
create index offres_conversation_idx on public.offres (conversation_id);

create table public.messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  auteur_id       uuid not null references public.profiles (id) on delete cascade,
  type            public.type_message not null default 'texte',
  contenu         text check (char_length(contenu) <= 4000),
  media_path      text,                -- bucket "messages" : photo ou vocal
  offre_id        uuid references public.offres (id) on delete cascade,
  lu_le           timestamptz,
  created_at      timestamptz not null default now(),
  constraint message_non_vide check (contenu is not null or media_path is not null or offre_id is not null)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create table public.avis (
  id          uuid primary key default gen_random_uuid(),
  offre_id    uuid not null unique references public.offres (id) on delete cascade,
  artisan_id  uuid not null references public.artisans (id) on delete cascade,
  client_id   uuid not null references public.profiles (id) on delete cascade,
  note        smallint not null check (note between 1 and 5),
  tags        text[] not null default '{}',
  commentaire text check (char_length(commentaire) <= 1000),
  created_at  timestamptz not null default now()
);
create index avis_artisan_idx on public.avis (artisan_id, created_at desc);

create table public.signalements (
  id         uuid primary key default gen_random_uuid(),
  auteur_id  uuid not null references public.profiles (id) on delete cascade,
  artisan_id uuid references public.artisans (id) on delete cascade,
  message_id bigint references public.messages (id) on delete set null,
  motif      text not null check (char_length(motif) between 5 and 1000),
  traite     boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Fonctions utilitaires
-- ---------------------------------------------------------------------
create or replace function public.est_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;


-- Ces deux fonctions lisent les tables sans RLS (security definer) : elles évitent
-- que les règles de "conversations" et de "demandes" s'appellent en boucle.
create or replace function public.est_participant(p_conversation uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation and (select auth.uid()) in (c.client_id, c.artisan_id)
  );
$$;

create or replace function public.demande_ouverte_du_client(p_demande uuid, p_client uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.demandes d
    where d.id = p_demande and d.client_id = p_client and d.statut = 'ouverte'
  );
$$;

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------

-- Création automatique du profil à l'inscription (OTP téléphone)
create or replace function public.creer_profil()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nom_complet)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nom_complet', ''));
  return new;
end;
$$;

create trigger a_la_creation_utilisateur
  after insert on auth.users
  for each row execute function public.creer_profil();

-- Un profil artisan créé => le compte passe en rôle "artisan"
create or replace function public.marquer_artisan()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.profiles set role = 'artisan' where id = new.id and role = 'client';
  return new;
end;
$$;

create trigger apres_creation_artisan
  after insert on public.artisans
  for each row execute function public.marquer_artisan();

-- Position de l'artisan = centre de son quartier de base ; updated_at
create or replace function public.preparer_artisan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.quartier_base is distinct from old.quartier_base then
    select q.position into new.position from public.quartiers q where q.slug = new.quartier_base;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger avant_ecriture_artisan
  before insert or update on public.artisans
  for each row execute function public.preparer_artisan();

-- Position de la demande = centre du quartier
create or replace function public.preparer_demande()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select q.position into new.position from public.quartiers q where q.slug = new.quartier;
  return new;
end;
$$;

create trigger avant_ecriture_demande
  before insert or update of quartier on public.demandes
  for each row execute function public.preparer_demande();

-- Nouveau message => la conversation remonte en haut de la liste
create or replace function public.maj_dernier_message()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.conversations set dernier_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger apres_message
  after insert on public.messages
  for each row execute function public.maj_dernier_message();

-- Nouvelle offre => elle apparaît comme une carte dans le chat
create or replace function public.publier_offre_dans_chat()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.messages (conversation_id, auteur_id, type, offre_id)
  values (new.conversation_id, new.artisan_id, 'offre', new.id);
  return new;
end;
$$;

create trigger apres_offre
  after insert on public.offres
  for each row execute function public.publier_offre_dans_chat();

-- Avis ajouté / modifié / supprimé => recalcul de la note de l'artisan
create or replace function public.recalculer_note()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_artisan uuid;
begin
  if tg_op = 'DELETE' then
    v_artisan := old.artisan_id;
  else
    v_artisan := new.artisan_id;
  end if;

  update public.artisans a set
    note_moyenne = coalesce((select round(avg(note)::numeric, 1) from public.avis where artisan_id = v_artisan), 0),
    nb_avis      = (select count(*) from public.avis where artisan_id = v_artisan)
  where a.id = v_artisan;
  return null;
end;
$$;

create trigger apres_avis
  after insert or update or delete on public.avis
  for each row execute function public.recalculer_note();

-- Pièce d'identité envoyée => statut "en attente"
create or replace function public.apres_envoi_verification()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.artisans set verification = 'en_attente' where id = new.artisan_id;
  return new;
end;
$$;

create trigger apres_verification
  after insert on public.verifications
  for each row execute function public.apres_envoi_verification();

-- ---------------------------------------------------------------------
-- Fonctions appelées par l'application (RPC)
-- ---------------------------------------------------------------------

-- Recherche d'artisans, triés par distance puis par note
create or replace function public.rechercher_artisans(
  p_metier              text    default null,
  p_quartier            text    default null,
  p_rayon_km            numeric default 15,
  p_note_min            numeric default 0,
  p_dispo_seulement     boolean default false,
  p_verifies_seulement  boolean default false,
  p_limite              int     default 30
)
returns table (
  id uuid, nom_complet text, avatar_url text, metier text, metier_nom text,
  annees_experience int, tarif_base int, quartier_base text, note_moyenne numeric,
  nb_avis int, disponible boolean, verifie boolean, distance_km numeric
)
language sql stable
set search_path = ''
as $$
  with origine as (
    select q.position from public.quartiers q where q.slug = p_quartier
  )
  select
    a.id, p.nom_complet, p.avatar_url, a.metier, m.nom as metier_nom,
    a.annees_experience, a.tarif_base, a.quartier_base, a.note_moyenne,
    a.nb_avis, a.disponible, a.verification = 'verifie' as verifie,
    case
      when o.position is null or a.position is null then null
      else round((extensions.st_distance(a.position, o.position) / 1000)::numeric, 1)
    end as distance_km
  from public.artisans a
  join public.profiles p on p.id = a.id
  join public.metiers m on m.slug = a.metier
  left join origine o on true
  where (p_metier is null or a.metier = p_metier)
    and a.note_moyenne >= coalesce(p_note_min, 0)
    and (not p_dispo_seulement or a.disponible)
    and (not p_verifies_seulement or a.verification = 'verifie')
    and (
      o.position is null or a.position is null
      or extensions.st_dwithin(a.position, o.position, p_rayon_km * 1000)
    )
  order by distance_km asc nulls last, a.note_moyenne desc, a.nb_avis desc
  limit least(p_limite, 100);
$$;

-- Le client accepte ou refuse une offre
create or replace function public.repondre_offre(p_offre uuid, p_accepter boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.offres
  set statut = (case when p_accepter then 'acceptee' else 'refusee' end)::public.statut_offre,
      repondue_le = now()
  where id = p_offre and client_id = (select auth.uid()) and statut = 'envoyee';

  if not found then
    raise exception 'Offre introuvable ou déjà traitée';
  end if;
end;
$$;

-- L'artisan retire une offre pas encore acceptée
create or replace function public.annuler_offre(p_offre uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.offres set statut = 'annulee'
  where id = p_offre and artisan_id = (select auth.uid()) and statut = 'envoyee';

  if not found then
    raise exception 'Offre introuvable ou déjà traitée';
  end if;
end;
$$;

-- Le client confirme que le travail est terminé => il pourra laisser un avis
create or replace function public.terminer_offre(p_offre uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_artisan uuid;
  v_conversation uuid;
begin
  update public.offres set statut = 'terminee', terminee_le = now()
  where id = p_offre and client_id = (select auth.uid()) and statut = 'acceptee'
  returning artisan_id, conversation_id into v_artisan, v_conversation;

  if not found then
    raise exception 'Seule une offre acceptée peut être marquée terminée';
  end if;

  update public.artisans set nb_missions = nb_missions + 1 where id = v_artisan;

  update public.demandes d set statut = 'pourvue'
  from public.conversations c
  where c.id = v_conversation and d.id = c.demande_id and d.statut = 'ouverte';
end;
$$;

-- Validation ou refus de la pièce d'identité (admin)
create or replace function public.traiter_verification(p_verification uuid, p_valider boolean, p_motif text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_artisan uuid;
  v_statut public.statut_verification := (case when p_valider then 'verifie' else 'refuse' end)::public.statut_verification;
begin
  if not public.est_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;

  update public.verifications
  set statut = v_statut, motif_refus = p_motif, traite_par = (select auth.uid()), traite_le = now()
  where id = p_verification and statut = 'en_attente'
  returning artisan_id into v_artisan;

  if not found then
    raise exception 'Demande de vérification introuvable ou déjà traitée';
  end if;

  update public.artisans set verification = v_statut where id = v_artisan;
end;
$$;

-- ---------------------------------------------------------------------
-- Droits par colonne : empêche un utilisateur de se donner le rôle admin,
-- le badge vérifié ou une fausse note.
-- ---------------------------------------------------------------------
revoke insert, update on public.profiles from anon, authenticated;
grant update (nom_complet, quartier, avatar_url) on public.profiles to authenticated;

revoke insert, update on public.artisans from anon, authenticated;
grant insert (id, metier, competences, bio, annees_experience, tarif_base, quartier_base, zones, jours_dispo, disponible)
  on public.artisans to authenticated;
grant update (metier, competences, bio, annees_experience, tarif_base, quartier_base, zones, jours_dispo, disponible)
  on public.artisans to authenticated;

revoke update on public.offres, public.verifications, public.demandes, public.messages from anon, authenticated;
grant update (statut) on public.demandes to authenticated;           -- le client peut fermer sa demande
grant update (lu_le) on public.messages to authenticated;            -- accusé de lecture uniquement

revoke insert on public.verifications from anon, authenticated;
grant insert (artisan_id, document_path) on public.verifications to authenticated;

revoke execute on function public.traiter_verification(uuid, boolean, text) from anon;
revoke execute on function public.repondre_offre(uuid, boolean) from anon;
revoke execute on function public.annuler_offre(uuid) from anon;
revoke execute on function public.terminer_offre(uuid) from anon;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.metiers        enable row level security;
alter table public.quartiers      enable row level security;
alter table public.profiles       enable row level security;
alter table public.artisans       enable row level security;
alter table public.realisations   enable row level security;
alter table public.verifications  enable row level security;
alter table public.demandes       enable row level security;
alter table public.conversations  enable row level security;
alter table public.offres         enable row level security;
alter table public.messages       enable row level security;
alter table public.avis           enable row level security;
alter table public.signalements   enable row level security;

-- Référentiels : lecture publique
create policy "lecture publique" on public.metiers   for select using (true);
create policy "lecture publique" on public.quartiers for select using (true);

-- Profils : nom et quartier visibles de tous ; chacun modifie le sien
create policy "lecture publique" on public.profiles for select using (true);
create policy "modifier son profil" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Artisans : profils publics ; chacun crée / modifie le sien
create policy "lecture publique" on public.artisans for select using (true);
create policy "créer son profil artisan" on public.artisans for insert to authenticated
  with check (id = (select auth.uid()));
create policy "modifier son profil artisan" on public.artisans for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Réalisations
create policy "lecture publique" on public.realisations for select using (true);
create policy "ajouter ses réalisations" on public.realisations for insert to authenticated
  with check (artisan_id = (select auth.uid()));
create policy "supprimer ses réalisations" on public.realisations for delete to authenticated
  using (artisan_id = (select auth.uid()));

-- Vérifications : l'artisan voit les siennes, l'admin voit tout
create policy "voir ses vérifications" on public.verifications for select to authenticated
  using (artisan_id = (select auth.uid()) or public.est_admin());
create policy "envoyer sa pièce" on public.verifications for insert to authenticated
  with check (artisan_id = (select auth.uid()) and statut = 'en_attente');

-- Demandes : le client voit les siennes ; les artisans du métier voient les demandes ouvertes
create policy "voir les demandes" on public.demandes for select to authenticated
  using (
    client_id = (select auth.uid())
    or public.est_admin()
    or (
      statut = 'ouverte'
      and exists (
        select 1 from public.artisans a
        where a.id = (select auth.uid()) and a.metier = demandes.metier
      )
    )
    or exists (
      select 1 from public.conversations c
      where c.demande_id = demandes.id and c.artisan_id = (select auth.uid())
    )
  );
create policy "publier une demande" on public.demandes for insert to authenticated
  with check (client_id = (select auth.uid()) and statut = 'ouverte');
create policy "fermer sa demande" on public.demandes for update to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));

-- Conversations : visibles uniquement par les deux participants
create policy "voir ses conversations" on public.conversations for select to authenticated
  using ((select auth.uid()) in (client_id, artisan_id) or public.est_admin());
create policy "client contacte un artisan" on public.conversations for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and exists (select 1 from public.artisans a where a.id = conversations.artisan_id)
  );
create policy "artisan répond à une demande" on public.conversations for insert to authenticated
  with check (
    artisan_id = (select auth.uid())
    and demande_id is not null
    and public.demande_ouverte_du_client(demande_id, client_id)
  );

-- Messages : participants uniquement
create policy "lire les messages" on public.messages for select to authenticated
  using (
    public.est_participant(messages.conversation_id)
  );
create policy "envoyer un message" on public.messages for insert to authenticated
  with check (
    auteur_id = (select auth.uid())
    and type in ('texte', 'image', 'vocal')
    and offre_id is null
    and public.est_participant(messages.conversation_id)
  );
create policy "marquer comme lu" on public.messages for update to authenticated
  using (
    auteur_id <> (select auth.uid())
    and public.est_participant(messages.conversation_id)
  );

-- Offres : l'artisan de la conversation propose ; changements de statut via les fonctions
create policy "voir les offres" on public.offres for select to authenticated
  using ((select auth.uid()) in (client_id, artisan_id) or public.est_admin());
create policy "proposer une offre" on public.offres for insert to authenticated
  with check (
    artisan_id = (select auth.uid())
    and statut = 'envoyee'
    and exists (
      select 1 from public.conversations c
      where c.id = offres.conversation_id
        and c.artisan_id = offres.artisan_id
        and c.client_id = offres.client_id
    )
  );

-- Avis : publics ; seul le client d'une mission TERMINÉE peut noter (une fois)
create policy "lecture publique" on public.avis for select using (true);
create policy "noter une mission terminée" on public.avis for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and exists (
      select 1 from public.offres o
      where o.id = avis.offre_id
        and o.client_id = avis.client_id
        and o.artisan_id = avis.artisan_id
        and o.statut = 'terminee'
    )
  );

-- Signalements : chacun signale, l'admin lit
create policy "signaler" on public.signalements for insert to authenticated
  with check (auteur_id = (select auth.uid()));
create policy "admin lit les signalements" on public.signalements for select to authenticated
  using (public.est_admin());

-- ---------------------------------------------------------------------
-- Temps réel : le chat écoute les nouveaux messages et les changements d'offre
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.messages, public.offres;

-- ---------------------------------------------------------------------
-- Stockage des fichiers
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('realisations',    'realisations',    true,  5242880,  array['image/jpeg', 'image/png', 'image/webp']),
  ('pieces-identite', 'pieces-identite', false, 5242880,  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('messages',        'messages',        false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg'])
on conflict (id) do nothing;

-- realisations/{id_artisan}/photo.jpg : public en lecture, l'artisan gère son dossier
create policy "réalisations : lecture" on storage.objects for select
  using (bucket_id = 'realisations');
create policy "réalisations : ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'realisations' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "réalisations : suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'realisations' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- pieces-identite/{id_artisan}/cni.jpg : privé, visible par l'artisan et l'admin
create policy "pièces : ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'pieces-identite' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "pièces : lecture" on storage.objects for select to authenticated
  using (
    bucket_id = 'pieces-identite'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.est_admin())
  );

-- messages/{id_conversation}/fichier : participants uniquement
create policy "médias du chat : lecture" on storage.objects for select to authenticated
  using (
    bucket_id = 'messages'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (select auth.uid()) in (c.client_id, c.artisan_id)
    )
  );
create policy "médias du chat : ajout" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'messages'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (select auth.uid()) in (c.client_id, c.artisan_id)
    )
  );
