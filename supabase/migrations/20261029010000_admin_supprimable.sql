-- Un admin supprimé ne doit pas bloquer la suppression de son compte :
-- la trace « validé par » des pièces d'identité passe simplement à vide.
alter table public.verifications
  drop constraint if exists verifications_traite_par_fkey,
  add constraint verifications_traite_par_fkey
    foreign key (traite_par) references public.profiles (id) on delete set null;
