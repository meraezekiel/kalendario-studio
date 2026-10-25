-- Photo library: photos belong to the account, and designs link to the ones they use, so one
-- uploaded photo serves every design (and counts once). Repeat uploads of the same file are found
-- by its hash. Template photos stay in their templates' folders, as before.

-- ---------------------------------------------------------------- photos

-- A photo may now belong to no design and no template: it is in its owner's library.
do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.photos'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%num_nonnulls%';
  execute format('alter table public.photos drop constraint %I', c);
end
$$;
alter table public.photos add constraint photos_one_place check (num_nonnulls(design_id, template_id) <= 1);

-- SHA-256 of the file as it was picked (before resizing), and the stored image's size in px.
alter table public.photos add column hash text, add column w int, add column h int;
create unique index photos_owner_hash_idx on public.photos (owner, hash) where hash is not null;

-- ---------------------------------------------------------------- design_photos

-- Which designs use which photos: lets everyone with a role on a design see its photos, and keeps
-- a photo from being deleted while any design uses it.
create table public.design_photos (
  design_id uuid not null references public.designs on delete cascade,
  path text not null references public.photos on delete cascade,
  created_at timestamptz not null default now(),
  primary key (design_id, path)
);
create index design_photos_path_idx on public.design_photos (path);

-- Whether any design uses photo `p` (definer: the caller may not see every design that does).
create function public.photo_in_use(p text)
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.design_photos l where l.path = p) $$;

alter table public.design_photos enable row level security;

create policy design_photos_select on public.design_photos for select to authenticated
  using (public.design_role(design_id) is not null);
-- Owners and editors link their own photos to the design.
create policy design_photos_insert on public.design_photos for insert to authenticated
  with check (
    public.design_role(design_id) in ('owner', 'editor')
    and exists (select 1 from public.photos p where p.path = design_photos.path and p.owner = auth.uid())
  );
create policy design_photos_delete on public.design_photos for delete to authenticated
  using (public.design_role(design_id) in ('owner', 'editor'));

-- ---------------------------------------------------------------- policies

drop policy photos_select on public.photos;
create policy photos_select on public.photos for select to authenticated
  using (
    owner = auth.uid()
    or public.design_role(design_id) is not null
    or exists (select 1 from public.design_photos l where l.path = photos.path and public.design_role(l.design_id) is not null)
  );

drop policy photos_insert on public.photos;
create policy photos_insert on public.photos for insert to authenticated
  with check (
    public.design_role(design_id) in ('owner', 'editor')
    or (template_id is not null and exists (
      select 1 from public.templates t where t.id = template_id and t.owner = auth.uid()))
    -- A library photo: photos_before_insert makes the caller its owner.
    or (design_id is null and template_id is null and owner = auth.uid())
  );

drop policy photos_delete on public.photos;
create policy photos_delete on public.photos for delete to authenticated
  using (
    (public.design_role(design_id) in ('owner', 'editor')
      or (template_id is not null and owner = auth.uid())
      or (design_id is null and template_id is null and owner = auth.uid() and not public.photo_in_use(path)))
    and not public.photo_object_exists(path)
  );

drop policy photos_object_insert on storage.objects;
create policy photos_object_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and exists (
    select 1 from public.photos p
    where p.path = storage.objects.name
      and (public.design_role(p.design_id) in ('owner', 'editor')
        or exists (select 1 from public.templates t where t.id = p.template_id and t.owner = auth.uid())
        or (p.design_id is null and p.template_id is null and p.owner = auth.uid()))));

-- A library photo's file can go only while no design uses it (then its row follows).
drop policy photos_object_delete on storage.objects;
create policy photos_object_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and exists (
    select 1 from public.photos p
    where p.path = storage.objects.name
      and (public.design_role(p.design_id) in ('owner', 'editor')
        or (p.template_id is not null and p.owner = auth.uid())
        or (p.design_id is null and p.template_id is null and p.owner = auth.uid() and not public.photo_in_use(p.path)))));

-- ---------------------------------------------------------------- existing photos

-- Every design photo moves into its owner's library, linked to the design it was in. Paths (and
-- so the files and every design that shows them) stay the same.
insert into public.design_photos (design_id, path)
select design_id, path from public.photos where design_id is not null
on conflict do nothing;
update public.photos set design_id = null where design_id is not null;
