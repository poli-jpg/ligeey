-- =====================================================================
-- Distances entre quartiers : corrections
--  1. Plus de rayon caché de 15 km : un artisan n'est plus exclu de la
--     recherche parce qu'il est loin, il est juste classé plus bas.
--     (Depuis Plateau ou Ouakam, les artisans de Keur Massar disparaissaient.)
--  2. Positions des artisans et des demandes resynchronisées avec leur
--     quartier, et tenues à jour si les coordonnées d'un quartier changent.
-- La distance renvoyée reste la ligne droite entre les centres des deux
-- quartiers ; l'appli l'affiche comme une estimation par la route.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Recherche sans rayon par défaut
-- ---------------------------------------------------------------------
drop function public.rechercher_artisans(text, text, numeric, numeric, boolean, boolean, int);

create function public.rechercher_artisans(
  p_metier              text    default null,
  p_quartier            text    default null,
  p_rayon_km            numeric default null,  -- null = pas de limite de distance
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
      p_rayon_km is null or o.position is null or a.position is null
      or extensions.st_dwithin(a.position, o.position, p_rayon_km * 1000)
    )
  -- Les plus proches d'abord, puis les profils vérifiés et les mieux notés
  order by distance_km asc nulls last, (a.verification = 'verifie') desc, a.note_moyenne desc, a.nb_avis desc
  limit least(p_limite, 100);
$$;

-- ---------------------------------------------------------------------
-- 2. Positions toujours alignées sur le quartier
-- ---------------------------------------------------------------------
update public.artisans a
   set position = q.position
  from public.quartiers q
 where q.slug = a.quartier_base
   and (a.position is null or not extensions.st_equals(a.position::extensions.geometry, q.position::extensions.geometry));

update public.demandes d
   set position = q.position
  from public.quartiers q
 where q.slug = d.quartier
   and (d.position is null or not extensions.st_equals(d.position::extensions.geometry, q.position::extensions.geometry));

-- Si on corrige les coordonnées d'un quartier, ses artisans et demandes suivent
create or replace function public.propager_position_quartier()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.artisans set position = new.position where quartier_base = new.slug;
  update public.demandes set position = new.position where quartier = new.slug;
  return new;
end;
$$;

revoke execute on function public.propager_position_quartier() from public, anon, authenticated;

create trigger apres_maj_position_quartier
  after update of position on public.quartiers
  for each row execute function public.propager_position_quartier();
