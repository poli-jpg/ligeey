-- =====================================================================
-- Vérification d'identité renforcée
--  - 3 photos : recto, verso (sauf passeport) et selfie avec la pièce
--  - type de pièce et nom tel qu'écrit dessus
--  - empreinte du numéro (pas le numéro en clair) : une même pièce ne peut
--    pas servir à deux comptes en même temps
--  - plus de PDF : uniquement des photos
-- =====================================================================

alter table public.verifications
  add column if not exists type_piece       text check (type_piece in ('cni', 'passeport', 'permis')),
  add column if not exists nom_piece        text check (char_length(nom_piece) <= 120),
  add column if not exists numero_empreinte text check (numero_empreinte ~ '^[0-9a-f]{64}$'),
  add column if not exists verso_path       text,
  add column if not exists selfie_path      text;

-- L'artisan peut renseigner ces colonnes à l'envoi (rien d'autre)
grant insert (type_piece, nom_piece, numero_empreinte, verso_path, selfie_path)
  on public.verifications to authenticated;

-- Une pièce = un seul compte (hors demandes refusées)
create unique index if not exists verification_piece_unique
  on public.verifications (numero_empreinte)
  where numero_empreinte is not null and statut <> 'refuse';

-- Nouveaux envois : dossier complet obligatoire, photos dans son propre dossier
drop policy if exists "envoyer sa pièce" on public.verifications;
create policy "envoyer sa pièce" on public.verifications for insert to authenticated
  with check (
    artisan_id = (select auth.uid())
    and statut = 'en_attente'
    and type_piece is not null
    and nom_piece is not null
    and numero_empreinte is not null
    and selfie_path is not null
    and (type_piece = 'passeport' or verso_path is not null)
    and split_part(document_path, '/', 1) = (select auth.uid())::text
    and split_part(selfie_path, '/', 1) = (select auth.uid())::text
    and (verso_path is null or split_part(verso_path, '/', 1) = (select auth.uid())::text)
  );

-- Pièces d'identité : photos uniquement
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'pieces-identite';
