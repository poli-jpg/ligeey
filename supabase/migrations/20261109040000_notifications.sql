-- =====================================================================
-- Ligeey : notifications sur le téléphone (Web Push), même appli fermée
--
-- Fonctionnement :
--   1. Le téléphone s'abonne (bouton « Activer les notifications ») :
--      son adresse d'abonnement est rangée dans push_abonnements.
--   2. Quand un message, une demande ou une décision arrive, un trigger
--      prépare la notification (destinataires, titre, texte, lien) et
--      l'envoie à l'appli Ligeey (route /api/push) avec une clé secrète.
--   3. L'appli signe et envoie la notification aux téléphones.
--
-- Le secret et l'adresse de l'appli sont rangés dans reglages_prives par
-- un script séparé (jamais dans le code) : voir notifications-reglages.sql.
-- Une erreur d'envoi ne bloque JAMAIS un message ou une demande.
-- =====================================================================

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- Réglages privés (illisibles depuis l'appli)
-- ---------------------------------------------------------------------
create table if not exists public.reglages_prives (
  cle    text primary key,
  valeur text not null
);
alter table public.reglages_prives enable row level security;
revoke all on public.reglages_prives from anon, authenticated;

-- ---------------------------------------------------------------------
-- Abonnements des téléphones
-- ---------------------------------------------------------------------
create table if not exists public.push_abonnements (
  endpoint   text primary key check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  p256dh     text not null check (char_length(p256dh) <= 200),
  auth       text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now(),
  vu_le      timestamptz not null default now()
);
create index if not exists push_abonnements_user_idx on public.push_abonnements (user_id);
alter table public.push_abonnements enable row level security;
revoke all on public.push_abonnements from anon, authenticated;

-- Le téléphone s'abonne (ou se réattribue au compte connecté s'il change de compte)
create or replace function public.enregistrer_abonnement(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'Non connecté'; end if;
  insert into public.push_abonnements (endpoint, user_id, p256dh, auth)
  values (p_endpoint, (select auth.uid()), p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, vu_le = now();
  -- 10 téléphones maximum par compte : on garde les plus récents
  delete from public.push_abonnements
   where user_id = (select auth.uid())
     and endpoint not in (select endpoint from public.push_abonnements where user_id = (select auth.uid()) order by vu_le desc limit 10);
end;
$$;

-- Le téléphone se désabonne (déconnexion, désactivation)
create or replace function public.retirer_abonnement(p_endpoint text)
returns void
language sql security definer
set search_path = ''
as $$
  delete from public.push_abonnements where endpoint = p_endpoint and user_id = (select auth.uid());
$$;

-- Appelée par l'appli quand un abonnement n'existe plus (téléphone réinitialisé…)
create or replace function public.abonnement_expire(p_endpoint text, p_secret text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_secret is distinct from (select valeur from public.reglages_prives where cle = 'push_secret') then
    raise exception 'Refusé';
  end if;
  delete from public.push_abonnements where endpoint = p_endpoint;
end;
$$;

revoke execute on function public.enregistrer_abonnement(text, text, text) from public, anon;
revoke execute on function public.retirer_abonnement(text) from public, anon;
grant execute on function public.enregistrer_abonnement(text, text, text) to authenticated;
grant execute on function public.retirer_abonnement(text) to authenticated;
revoke execute on function public.abonnement_expire(text, text) from public;
grant execute on function public.abonnement_expire(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Envoi : rassemble les abonnements des destinataires et appelle l'appli
-- ---------------------------------------------------------------------
create or replace function public.envoyer_push(p_users uuid[], p_titre text, p_corps text, p_url text, p_tag text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_url    text := (select valeur from public.reglages_prives where cle = 'url_app');
  v_secret text := (select valeur from public.reglages_prives where cle = 'push_secret');
  v_envois jsonb;
begin
  if v_url is null or v_secret is null or p_users is null or cardinality(p_users) = 0 then return; end if;

  select coalesce(jsonb_agg(jsonb_build_object('endpoint', a.endpoint, 'p256dh', a.p256dh, 'auth', a.auth)), '[]'::jsonb)
    into v_envois
    from (select * from public.push_abonnements where user_id = any (p_users) order by vu_le desc limit 500) a;
  if jsonb_array_length(v_envois) = 0 then return; end if;

  perform net.http_post(
    url := v_url || '/api/push',
    body := jsonb_build_object('envois', v_envois, 'titre', left(p_titre, 80), 'corps', left(coalesce(p_corps, ''), 160), 'url', p_url, 'tag', p_tag),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-ligeey-cle', v_secret),
    timeout_milliseconds := 8000
  );
exception when others then
  -- Une notification ratée ne doit jamais empêcher l'enregistrement
  raise warning 'envoyer_push : %', sqlerrm;
end;
$$;
revoke execute on function public.envoyer_push(uuid[], text, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Déclencheurs
-- ---------------------------------------------------------------------

-- Nouveau message (texte, photo, vocal ou devis) → l'autre participant
create or replace function public.notifier_message()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_conv public.conversations;
  v_dest uuid;
  v_nom  text;
  v_corps text;
  v_offre public.offres;
begin
  select * into v_conv from public.conversations where id = new.conversation_id;
  v_dest := case when new.auteur_id = v_conv.client_id then v_conv.artisan_id else v_conv.client_id end;
  select nullif(split_part(nom_complet, ' ', 1), '') into v_nom from public.profiles where id = new.auteur_id;

  if new.type = 'offre' then
    select * into v_offre from public.offres where id = new.offre_id;
    perform public.envoyer_push(array[v_dest], coalesce(v_nom, 'Un artisan') || ' vous a envoyé un devis',
      coalesce(v_offre.titre, 'Devis') || ' · ' || to_char(coalesce(v_offre.prix, 0), 'FM999G999G999') || ' FCFA',
      '/messages/' || new.conversation_id, 'conv-' || new.conversation_id);
  else
    v_corps := case new.type when 'image' then '📷 Photo' when 'vocal' then '🎤 Message vocal' else new.contenu end;
    perform public.envoyer_push(array[v_dest], coalesce(v_nom, 'Nouveau message'), v_corps,
      '/messages/' || new.conversation_id, 'conv-' || new.conversation_id);
  end if;
  return null;
exception when others then
  raise warning 'notifier_message : %', sqlerrm;
  return null;
end;
$$;

drop trigger if exists push_message on public.messages;
create trigger push_message after insert on public.messages
  for each row execute function public.notifier_message();

-- Nouvelle demande de devis → artisans du métier à moins de 25 km (ou qui couvrent ce quartier)
create or replace function public.notifier_demande()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_artisans uuid[];
  v_metier text;
  v_quartier text;
begin
  select array_agg(a.id) into v_artisans
    from public.artisans a
   where a.metier = new.metier and not a.masque and a.id <> new.client_id
     and (
       new.quartier = a.quartier_base or new.quartier = any (a.zones)
       or (a.position is not null and new.position is not null and extensions.st_dwithin(a.position, new.position, 25000))
     );
  select nom into v_metier from public.metiers where slug = new.metier;
  select nom into v_quartier from public.quartiers where slug = new.quartier;
  perform public.envoyer_push(v_artisans,
    (case when new.urgence = 'urgent' then '🚨 Urgent · ' else 'Nouvelle demande · ' end) || coalesce(v_metier, '') || ' à ' || coalesce(v_quartier, ''),
    new.description, '/espace', 'demande-' || new.id);
  return null;
exception when others then
  raise warning 'notifier_demande : %', sqlerrm;
  return null;
end;
$$;

drop trigger if exists push_demande on public.demandes;
create trigger push_demande after insert on public.demandes
  for each row execute function public.notifier_demande();

-- Devis accepté / refusé → artisan ; mission terminée → artisan
create or replace function public.notifier_offre()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_nom text;
begin
  if new.statut is not distinct from old.statut then return null; end if;
  select nullif(split_part(nom_complet, ' ', 1), '') into v_nom from public.profiles where id = new.client_id;
  if new.statut = 'acceptee' then
    perform public.envoyer_push(array[new.artisan_id], '✅ Devis accepté', coalesce(v_nom, 'Le client') || ' a accepté « ' || new.titre || ' »',
      '/messages/' || new.conversation_id, 'offre-' || new.id);
  elsif new.statut = 'refusee' then
    perform public.envoyer_push(array[new.artisan_id], 'Devis refusé', coalesce(v_nom, 'Le client') || ' a refusé « ' || new.titre || ' »',
      '/messages/' || new.conversation_id, 'offre-' || new.id);
  elsif new.statut = 'terminee' then
    perform public.envoyer_push(array[new.artisan_id], '🎉 Mission terminée', coalesce(v_nom, 'Le client') || ' a confirmé la fin du chantier.',
      '/messages/' || new.conversation_id, 'offre-' || new.id);
  end if;
  return null;
exception when others then
  raise warning 'notifier_offre : %', sqlerrm;
  return null;
end;
$$;

drop trigger if exists push_offre on public.offres;
create trigger push_offre after update of statut on public.offres
  for each row execute function public.notifier_offre();

-- Pièce d'identité validée / refusée → artisan
create or replace function public.notifier_verification()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.statut is not distinct from old.statut then return null; end if;
  if new.statut = 'verifie' then
    perform public.envoyer_push(array[new.artisan_id], '✅ Identité vérifiée', 'Le badge vert apparaît maintenant sur votre profil.', '/espace/profil', 'verif');
  elsif new.statut = 'refuse' then
    perform public.envoyer_push(array[new.artisan_id], 'Pièce d''identité refusée', coalesce(new.motif_refus, 'Ouvrez Ligeey pour voir le motif.'), '/espace/profil#verification', 'verif');
  end if;
  return null;
exception when others then
  raise warning 'notifier_verification : %', sqlerrm;
  return null;
end;
$$;

drop trigger if exists push_verification on public.verifications;
create trigger push_verification after update of statut on public.verifications
  for each row execute function public.notifier_verification();
