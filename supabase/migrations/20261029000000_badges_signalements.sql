-- =====================================================================
-- Ligeey : badges de confiance à deux niveaux + signalements + masquage
--   • Téléphone vérifié : automatique dès que le code SMS est validé
--   • Identité vérifiée : après validation de la pièce par un admin (existant)
--   • Signalement d'un profil par un utilisateur, traité par l'admin
--   • Un admin peut masquer un profil (il disparaît de la recherche)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Badge « Téléphone vérifié »
-- ---------------------------------------------------------------------
alter table public.profiles add column telephone_verifie boolean not null default false;

-- Suit auth.users.phone_confirmed_at : rempli par Supabase quand le code SMS est bon
create or replace function public.synchroniser_telephone()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.profiles
  set telephone_verifie = new.phone_confirmed_at is not null
  where id = new.id;
  return new;
end;
$$;

-- Nom en "z_" : les triggers s'exécutent par ordre alphabétique, celui-ci doit passer
-- après "a_la_creation_utilisateur" (qui crée le profil)
create trigger z_confirmation_telephone
  after insert or update of phone_confirmed_at on auth.users
  for each row execute function public.synchroniser_telephone();

-- Comptes existants
update public.profiles p
set telephone_verifie = true
from auth.users u
where u.id = p.id and u.phone_confirmed_at is not null;

-- La colonne n'est jamais modifiable par l'utilisateur (droits par colonne déjà restreints)

-- ---------------------------------------------------------------------
-- 2. Masquage d'un profil par l'admin
-- ---------------------------------------------------------------------
alter table public.artisans add column masque boolean not null default false;

create or replace function public.masquer_artisan(p_artisan uuid, p_masquer boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.est_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  update public.artisans set masque = p_masquer where id = p_artisan;
end;
$$;

revoke execute on function public.masquer_artisan(uuid, boolean) from anon;

-- Un profil masqué n'est plus visible que par lui-même et l'admin
drop policy "lecture publique" on public.artisans;
create policy "lecture publique" on public.artisans for select
  using (not masque or id = (select auth.uid()) or public.est_admin());

-- ---------------------------------------------------------------------
-- 3. Recherche : ajoute le badge téléphone, ignore les profils masqués
-- ---------------------------------------------------------------------
drop function public.rechercher_artisans(text, text, numeric, numeric, boolean, boolean, int);

create function public.rechercher_artisans(
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
  nb_avis int, disponible boolean, verifie boolean, telephone_verifie boolean, distance_km numeric
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
      o.position is null or a.position is null
      or extensions.st_dwithin(a.position, o.position, p_rayon_km * 1000)
    )
  -- Les profils à identité vérifiée remontent en premier à distance égale
  order by distance_km asc nulls last, (a.verification = 'verifie') desc, a.note_moyenne desc, a.nb_avis desc
  limit least(p_limite, 100);
$$;

-- ---------------------------------------------------------------------
-- 4. Signalements
-- ---------------------------------------------------------------------
alter table public.signalements add column raison text not null default 'autre'
  check (raison in ('faux_profil', 'arnaque', 'comportement', 'travail_bacle', 'autre'));
alter table public.signalements add column traite_le timestamptz;
-- Le détail devient facultatif : la raison suffit
alter table public.signalements alter column motif drop not null;
alter table public.signalements drop constraint signalements_motif_check;
alter table public.signalements add constraint signalements_motif_check check (motif is null or char_length(motif) <= 1000);

-- Un seul signalement ouvert par personne et par profil (évite le spam)
create unique index signalement_ouvert_unique
  on public.signalements (auteur_id, artisan_id) where not traite;

-- On ne se signale pas soi-même
drop policy "signaler" on public.signalements;
create policy "signaler" on public.signalements for insert to authenticated
  with check (
    auteur_id = (select auth.uid())
    and (artisan_id is null or artisan_id <> (select auth.uid()))
    and not traite
  );

revoke update on public.signalements from anon, authenticated;
revoke insert on public.signalements from anon, authenticated;
grant insert (auteur_id, artisan_id, message_id, motif, raison) on public.signalements to authenticated;

create or replace function public.traiter_signalement(p_signalement uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.est_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  update public.signalements set traite = true, traite_le = now() where id = p_signalement;
end;
$$;

revoke execute on function public.traiter_signalement(uuid) from anon;
