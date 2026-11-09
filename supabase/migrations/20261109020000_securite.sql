-- =====================================================================
-- Ligeey : renforcement de la sécurité
--  1. Profils : plus possible de lister tous les utilisateurs
--  2. Conversations / réponses aux demandes : contrôles resserrés
--  3. Fichiers : chaque chemin doit être dans le bon dossier
--  4. Limites anti-abus (spam de demandes, de messages, de signalements)
--  5. Compteur de tentatives pour la connexion et les SMS
--  6. Garde-fous sur la taille des données
-- Toutes les contraintes sont ajoutées « not valid » : elles s'appliquent
-- aux nouvelles écritures sans bloquer sur d'éventuelles anciennes lignes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profils
-- Avant : n'importe qui (même sans compte) pouvait lire le nom, le quartier
-- et le rôle de TOUS les utilisateurs, clients compris.
-- Maintenant : on voit son propre profil, les artisans (publics), les
-- personnes avec qui on a une conversation et les auteurs d'avis.
-- ---------------------------------------------------------------------
drop policy if exists "lecture publique" on public.profiles;
create policy "lecture des profils" on public.profiles for select
  using (
    id = (select auth.uid())
    or exists (select 1 from public.artisans a where a.id = profiles.id)
    or exists (select 1 from public.avis v where v.client_id = profiles.id)
    or exists (
      select 1 from public.conversations c
      where profiles.id in (c.client_id, c.artisan_id)
    )
    or public.est_admin()
  );

-- Les visiteurs sans compte ne voient que le strict nécessaire (pas le rôle ni le quartier)
revoke select on public.profiles from anon;
grant select (id, nom_complet, avatar_url, telephone_verifie) on public.profiles to anon;

-- ---------------------------------------------------------------------
-- 2. Conversations
-- ---------------------------------------------------------------------
-- Un client ne peut rattacher une conversation qu'à SA propre demande
-- (avant : il pouvait y mettre la demande de quelqu'un d'autre et la faire lire à un complice).
drop policy if exists "client contacte un artisan" on public.conversations;
create policy "client contacte un artisan" on public.conversations for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and exists (select 1 from public.artisans a where a.id = conversations.artisan_id and not a.masque)
    and (
      demande_id is null
      or exists (select 1 from public.demandes d where d.id = conversations.demande_id and d.client_id = (select auth.uid()))
    )
  );

-- Un artisan ne répond qu'aux demandes ouvertes de SON métier, et pas s'il est masqué
drop policy if exists "artisan répond à une demande" on public.conversations;
create policy "artisan répond à une demande" on public.conversations for insert to authenticated
  with check (
    artisan_id = (select auth.uid())
    and demande_id is not null
    and public.demande_ouverte_du_client(demande_id, client_id)
    and exists (
      select 1 from public.artisans a
      join public.demandes d on d.id = conversations.demande_id
      where a.id = (select auth.uid()) and a.metier = d.metier and not a.masque
    )
  );

-- Fonctions internes des règles : inutiles aux visiteurs sans compte
revoke execute on function public.est_participant(uuid) from public, anon;
revoke execute on function public.demande_ouverte_du_client(uuid, uuid) from public, anon;
grant execute on function public.est_participant(uuid) to authenticated;
grant execute on function public.demande_ouverte_du_client(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Chemins de fichiers
-- ---------------------------------------------------------------------
drop policy if exists "ajouter ses réalisations" on public.realisations;
create policy "ajouter ses réalisations" on public.realisations for insert to authenticated
  with check (
    artisan_id = (select auth.uid())
    and split_part(image_path, '/', 1) = (select auth.uid())::text
  );

-- Un média du chat doit être rangé dans le dossier de SA conversation
drop policy if exists "envoyer un message" on public.messages;
create policy "envoyer un message" on public.messages for insert to authenticated
  with check (
    auteur_id = (select auth.uid())
    and type in ('texte', 'image', 'vocal')
    and offre_id is null
    and lu_le is null
    and public.est_participant(messages.conversation_id)
    and (media_path is null or split_part(media_path, '/', 1) = messages.conversation_id::text)
  );

-- L'artisan peut supprimer ses propres photos de pièce (nettoyage après un envoi raté)
drop policy if exists "pièces : suppression" on storage.objects;
create policy "pièces : suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'pieces-identite' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- 4. Limites anti-abus
-- ---------------------------------------------------------------------
create or replace function public.limiter_insertions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nb int;
begin
  if tg_table_name = 'demandes' then
    select count(*) into v_nb from public.demandes
     where client_id = new.client_id and created_at > now() - interval '24 hours';
    if v_nb >= 5 then raise exception 'limite_atteinte: 5 demandes par jour maximum'; end if;

  elsif tg_table_name = 'conversations' then
    select count(*) into v_nb from public.conversations
     where (select auth.uid()) in (client_id, artisan_id) and created_at > now() - interval '24 hours';
    if v_nb >= 30 then raise exception 'limite_atteinte: 30 nouvelles conversations par jour maximum'; end if;

  elsif tg_table_name = 'messages' then
    -- Les cartes d'offre sont créées par la base, pas par l'utilisateur
    if new.type <> 'offre' then
      select count(*) into v_nb from public.messages
       where auteur_id = new.auteur_id and created_at > now() - interval '1 minute';
      if v_nb >= 20 then raise exception 'limite_atteinte: trop de messages, patientez une minute'; end if;
    end if;

  elsif tg_table_name = 'offres' then
    select count(*) into v_nb from public.offres
     where artisan_id = new.artisan_id and created_at > now() - interval '1 hour';
    if v_nb >= 20 then raise exception 'limite_atteinte: trop d''offres envoyées, patientez'; end if;

  elsif tg_table_name = 'signalements' then
    select count(*) into v_nb from public.signalements
     where auteur_id = new.auteur_id and created_at > now() - interval '24 hours';
    if v_nb >= 10 then raise exception 'limite_atteinte: 10 signalements par jour maximum'; end if;

  elsif tg_table_name = 'verifications' then
    select count(*) into v_nb from public.verifications
     where artisan_id = new.artisan_id and created_at > now() - interval '24 hours';
    if v_nb >= 3 then raise exception 'limite_atteinte: 3 envois de pièce par jour maximum'; end if;
  end if;

  return new;
end;
$$;

drop trigger if exists limite_demandes on public.demandes;
create trigger limite_demandes before insert on public.demandes
  for each row execute function public.limiter_insertions();
drop trigger if exists limite_conversations on public.conversations;
create trigger limite_conversations before insert on public.conversations
  for each row execute function public.limiter_insertions();
drop trigger if exists limite_messages on public.messages;
create trigger limite_messages before insert on public.messages
  for each row execute function public.limiter_insertions();
drop trigger if exists limite_offres on public.offres;
create trigger limite_offres before insert on public.offres
  for each row execute function public.limiter_insertions();
drop trigger if exists limite_signalements on public.signalements;
create trigger limite_signalements before insert on public.signalements
  for each row execute function public.limiter_insertions();
drop trigger if exists limite_verifications on public.verifications;
create trigger limite_verifications before insert on public.verifications
  for each row execute function public.limiter_insertions();

create index if not exists messages_auteur_recent_idx on public.messages (auteur_id, created_at desc);
create index if not exists demandes_client_recent_idx on public.demandes (client_id, created_at desc);

-- ---------------------------------------------------------------------
-- 5. Compteur de tentatives (connexion, codes SMS)
-- Appelé par le serveur de l'appli avec une clé = empreinte(numéro + adresse IP).
-- Personne ne peut lire la table ; la fonction répond seulement « autorisé ou non ».
-- ---------------------------------------------------------------------
create table if not exists public.tentatives (
  cle text not null,
  at  timestamptz not null default now()
);
create index if not exists tentatives_cle_idx on public.tentatives (cle, at desc);
alter table public.tentatives enable row level security;
revoke all on public.tentatives from anon, authenticated;

create or replace function public.consommer_tentative(p_cle text, p_max int, p_fenetre_s int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nb int;
begin
  -- Clé de forme « type:empreinte » ; bornes raisonnables pour éviter les abus de la fonction
  if p_cle !~ '^[a-z]{2,12}:[0-9a-f]{64}$' or p_max not between 1 and 100 or p_fenetre_s not between 30 and 86400 then
    raise exception 'paramètres invalides';
  end if;

  -- Ménage de temps en temps
  if random() < 0.02 then
    delete from public.tentatives where at < now() - interval '1 day';
  end if;

  select count(*) into v_nb from public.tentatives
   where cle = p_cle and at > now() - make_interval(secs => p_fenetre_s);
  if v_nb >= p_max then
    return false;
  end if;

  insert into public.tentatives (cle) values (p_cle);
  return true;
end;
$$;

revoke execute on function public.consommer_tentative(text, int, int) from public;
grant execute on function public.consommer_tentative(text, int, int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Garde-fous sur la taille des données
-- ---------------------------------------------------------------------
alter table public.profiles
  add constraint profiles_nom_longueur check (char_length(nom_complet) <= 80) not valid,
  add constraint profiles_avatar_url check (avatar_url is null or (char_length(avatar_url) <= 500 and avatar_url ~ '^https://')) not valid;

alter table public.artisans
  add constraint artisans_competences_max check (cardinality(competences) <= 20) not valid,
  add constraint artisans_zones_max check (cardinality(zones) <= 30) not valid,
  add constraint artisans_jours_valides check (jours_dispo <@ array[1,2,3,4,5,6,7]::smallint[]) not valid;

alter table public.demandes
  add constraint demandes_photos_max check (cardinality(photos) <= 6) not valid,
  add constraint demandes_budget_max check (budget is null or budget <= 100000000) not valid;

alter table public.offres
  add constraint offres_prix_max check (prix <= 100000000) not valid;

alter table public.avis
  add constraint avis_tags_max check (cardinality(tags) <= 10) not valid;
