-- Vérification d'identité : le selfie n'est plus demandé (recto + verso suffisent)
drop policy if exists "envoyer sa pièce" on public.verifications;
create policy "envoyer sa pièce" on public.verifications for insert to authenticated
  with check (
    artisan_id = (select auth.uid())
    and statut = 'en_attente'
    and type_piece is not null
    and nom_piece is not null
    and numero_empreinte is not null
    and (type_piece = 'passeport' or verso_path is not null)
    and split_part(document_path, '/', 1) = (select auth.uid())::text
    and (verso_path is null or split_part(verso_path, '/', 1) = (select auth.uid())::text)
  );
