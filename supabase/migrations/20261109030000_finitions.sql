-- =====================================================================
-- Ligeey : finitions avant présentation
--  1. Recherche « autour de moi » avec la position GPS du téléphone
--  2. Demandes de devis triées par distance pour l'artisan
--  3. Messages non lus (badges)
--  4. Suppression de son compte par l'utilisateur
-- La position des artisans reste le centre de leur quartier : on ne publie
-- jamais l'adresse exacte d'un artisan.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Recherche : point de départ = quartier OU position GPS
-- ---------------------------------------------------------------------
drop function if exists public.rechercher_artisans(text, text, numeric, numeric, boolean, boolean, int);

create function public.rechercher_artisans(
  p_metier              text    default null,
  p_quartier            text    default null,
  p_rayon_km            numeric default null,
  p_note_min            numeric default 0,
  p_dispo_seulement     boolean default false,
  p_verifies_seulement  boolean default false,
  p_limite              int     default 30,
  p_lat                 double precision default null,
  p_lng                 double precision default null
)
returns table (
  id uuid, nom_complet text, avatar_url text, metier text, metier_nom text,
  annees_experience int, tarif_base int, quartier_base text, note_moyenne numeric,
  nb_avis int, disponible boolean, verifie boolean, telephone_verifie boolean, distance_km numeric
)
language sql stable
set search_path = ''
as $$
  with origine as (
    -- Position GPS (si elle est plausible pour le Sénégal), sinon centre du quartier choisi
    select case
      when p_lat between 12 and 17 and p_lng between -18 and -11
        then extensions.st_point(p_lng, p_lat, 4326)::extensions.geography
      else (select q.position from public.quartiers q where q.slug = p_quartier)
    end as position
  )
  select
    a.id, p.nom_complet, p.avatar_url, a.metier, m.nom as metier_nom,
    a.annees_experience, a.tarif_base, a.quartier_base, a.note_moyenne,
    a.nb_avis, a.disponible, a.verification = 'verifie' as verifie,
    p.telephone_verifie,
    case
      when o.position is null or a.position is null then null
      else round((extensions.st_distance(a.position, o.position) / 1000)::numeric, 1)
    end as distance_km
  from public.artisans a
  join public.profiles p on p.id = a.id
  join public.metiers m on m.slug = a.metier
  left join origine o on true
  where not a.masque
    and (p_metier is null or a.metier = p_metier)
    and a.note_moyenne >= coalesce(p_note_min, 0)
    and (not p_dispo_seulement or a.disponible)
    and (not p_verifies_seulement or a.verification = 'verifie')
    and (
      p_rayon_km is null or o.position is null or a.position is null
      or extensions.st_dwithin(a.position, o.position, p_rayon_km * 1000)
    )
  order by distance_km asc nulls last, (a.verification = 'verifie') desc, a.note_moyenne desc, a.nb_avis desc
  limit least(p_limite, 100);
$$;

-- Quartier le plus proche d'une position GPS (pour afficher « autour de Pikine »)
create or replace function public.quartier_proche(p_lat double precision, p_lng double precision)
returns table (slug text, nom text, distance_km numeric)
language sql stable
set search_path = ''
as $$
  select q.slug, q.nom, round((extensions.st_distance(q.position, extensions.st_point(p_lng, p_lat, 4326)::extensions.geography) / 1000)::numeric, 1)
  from public.quartiers q
  where p_lat between 12 and 17 and p_lng between -18 and -11
  order by 3
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- 2. Tableau de l'artisan : demandes de son métier, les plus proches d'abord
-- ---------------------------------------------------------------------
create or replace function public.demandes_proches(p_limite int default 20)
returns table (
  id uuid, client_id uuid, description text, budget int, urgence public.urgence,
  quartier text, quartier_nom text, created_at timestamptz, distance_km numeric
)
language sql stable
set search_path = ''
as $$
  -- Fonction « invoker » : la RLS ne renvoie que les demandes ouvertes du métier de l'artisan
  select d.id, d.client_id, d.description, d.budget, d.urgence, d.quartier, q.nom, d.created_at,
    case when a.position is null or d.position is null then null
      else round((extensions.st_distance(a.position, d.position) / 1000)::numeric, 1) end
  from public.demandes d
  join public.artisans a on a.id = (select auth.uid())
  join public.quartiers q on q.slug = d.quartier
  where d.statut = 'ouverte' and d.metier = a.metier and d.client_id <> a.id
  order by 9 asc nulls last, d.created_at desc
  limit least(p_limite, 50);
$$;
revoke execute on function public.demandes_proches(int) from public, anon;
grant execute on function public.demandes_proches(int) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Messages non lus
-- ---------------------------------------------------------------------
create index if not exists messages_non_lus_idx on public.messages (conversation_id) where lu_le is null;

-- Nombre de messages non lus par conversation (pour soi)
create or replace function public.mes_non_lus()
returns table (conversation_id uuid, nb int)
language sql stable
set search_path = ''
as $$
  select m.conversation_id, count(*)::int
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where m.lu_le is null
    and m.auteur_id <> (select auth.uid())
    and (select auth.uid()) in (c.client_id, c.artisan_id)
  group by m.conversation_id;
$$;
revoke execute on function public.mes_non_lus() from public, anon;
grant execute on function public.mes_non_lus() to authenticated;

-- Marque comme lus les messages reçus dans une conversation
create or replace function public.marquer_lus(p_conversation uuid)
returns void
language sql
set search_path = ''
as $$
  update public.messages set lu_le = now()
  where conversation_id = p_conversation and lu_le is null and auteur_id <> (select auth.uid());
$$;
revoke execute on function public.marquer_lus(uuid) from public, anon;
grant execute on function public.marquer_lus(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Suppression de son propre compte
-- Supprime l'utilisateur : son profil, sa fiche artisan, ses demandes,
-- conversations et messages partent avec (suppression en cascade).
-- ---------------------------------------------------------------------
create or replace function public.supprimer_mon_compte()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := (select auth.uid());
begin
  if v_id is null then raise exception 'Non connecté'; end if;
  if exists (select 1 from public.profiles where id = v_id and role = 'admin') then
    raise exception 'Un compte administrateur ne peut pas être supprimé depuis l''appli';
  end if;
  -- Les fichiers (photos, pièces d'identité) sont effacés par l'appli juste avant, via l'API de stockage
  delete from auth.users where id = v_id;
end;
$$;
revoke execute on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;
