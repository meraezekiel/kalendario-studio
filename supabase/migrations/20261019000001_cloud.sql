-- Cloud designs: tables, RLS, per-account limits, sync RPCs, realtime and photo storage.

-- ---------------------------------------------------------------- tables

create table public.designs (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null default 'Untitled calendar',
  state text not null default '',            -- base64 Yjs state; '' = empty
  compacted_through bigint not null default 0, -- design_updates.id folded into state
  thumb text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index designs_owner_idx on public.designs (owner);

create table public.design_updates (
  id bigserial primary key,
  design_id uuid not null references public.designs on delete cascade,
  author uuid not null default auth.uid(),
  data text not null,                        -- base64 Yjs update
  created_at timestamptz not null default now()
);
create index design_updates_design_idx on public.design_updates (design_id, id);

create table public.design_members (
  design_id uuid not null references public.designs on delete cascade,
  email text not null check (email = lower(email)),
  user_id uuid references auth.users on delete set null,
  role text not null check (role in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (design_id, email)
);
create index design_members_user_idx on public.design_members (user_id);
create index design_members_pending_idx on public.design_members (email) where user_id is null;

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  saved_at timestamptz not null default now(),
  data jsonb not null
);
create index templates_owner_idx on public.templates (owner);

create table public.photos (
  path text primary key,                     -- storage.objects.name in bucket 'photos'
  owner uuid not null,                       -- whose quota it counts against; set by trigger
  design_id uuid references public.designs on delete cascade,
  template_id uuid references public.templates on delete cascade,
  bytes int not null check (bytes > 0),
  created_at timestamptz not null default now(),
  check (num_nonnulls(design_id, template_id) = 1)
);
create index photos_owner_idx on public.photos (owner);
create index photos_design_idx on public.photos (design_id);
create index photos_template_idx on public.photos (template_id);

-- ---------------------------------------------------------------- helpers

-- Per-account limits: 50 MB of photos, 50 designs, 5 MB per photo.
create function public.app_limits()
returns table (photo_bytes bigint, designs int, file_bytes int)
language sql immutable set search_path = ''
as $$ select 52428800::bigint, 50, 5242880 $$;

-- The caller's role on a design: 'owner' | 'editor' | 'viewer' | null. Definer, so policies can use it without recursing.
create function public.design_role(d uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when exists (select 1 from public.designs g where g.id = d and g.owner = auth.uid()) then 'owner'
    else (
      select m.role from public.design_members m
      where m.design_id = d and m.user_id = auth.uid()
      order by m.role = 'editor' desc
      limit 1
    )
  end
$$;

-- The design id in a realtime topic 'design:<uuid>', or null.
create function public.topic_design(topic text)
returns uuid
language sql immutable set search_path = ''
as $$
  select case when topic ~* '^design:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then substring(topic from 8)::uuid end
$$;

-- Whether bucket 'photos' holds an object at `path` (definer: storage RLS would hide it).
create function public.photo_object_exists(path text)
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from storage.objects o where o.bucket_id = 'photos' and o.name = path) $$;

-- ---------------------------------------------------------------- RPCs

-- Compacted state plus the updates after it, read in one statement (one snapshot). RLS applies.
create function public.load_design(d uuid)
returns table (state text, through bigint, updates jsonb)
language sql stable security invoker set search_path = ''
as $$
  select g.state, g.compacted_through,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', u.id, 'data', u.data) order by u.id)
      from public.design_updates u
      where u.design_id = g.id and u.id > g.compacted_through
    ), '[]'::jsonb)
  from public.designs g
  where g.id = d
$$;

-- Replaces state with one covering updates <= through and drops them. Applies only when newer
-- than the stored compaction and not past the newest update; returns whether it applied.
create function public.compact_design(d uuid, new_state text, through bigint)
returns boolean
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if coalesce(public.design_role(d), '') not in ('owner', 'editor') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  -- Same per-design lock as design_updates_before_insert: waits out in-flight appends.
  perform pg_advisory_xact_lock(hashtext('upd:' || d::text));
  update public.designs g set state = new_state, compacted_through = through
  where g.id = d
    and g.compacted_through < through
    and through <= coalesce((select max(u.id) from public.design_updates u where u.design_id = d), 0);
  if not found then
    return false;
  end if;
  delete from public.design_updates u where u.design_id = d and u.id <= through;
  return true;
end
$$;

-- Bytes of photos counted against the caller.
create function public.photo_usage()
returns bigint
language sql stable security definer set search_path = ''
as $$ select coalesce(sum(p.bytes), 0)::bigint from public.photos p where p.owner = auth.uid() $$;

-- ---------------------------------------------------------------- triggers

-- Appends to one design are serialized and take their id only after the lock, which is held until
-- commit, so ids commit in order: any snapshot that sees update N also sees every earlier one.
-- That is what lets compact_design drop updates <= through without losing one still in flight.
-- (A shared lock would not do: two concurrent appends could commit out of id order.)
create function public.design_updates_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('upd:' || new.design_id::text));
  new.id := nextval(pg_get_serial_sequence('public.design_updates', 'id'));
  return new;
end
$$;
create trigger design_updates_before_insert before insert on public.design_updates
  for each row execute function public.design_updates_before_insert();

create function public.designs_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('designs:' || new.owner::text));
  if (select count(*) from public.designs g where g.owner = new.owner) >= (select l.designs from public.app_limits() l) then
    raise exception 'design limit reached' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger designs_before_insert before insert on public.designs
  for each row execute function public.designs_before_insert();

create function public.designs_before_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.name is distinct from old.name and auth.uid() is not null
     and public.design_role(old.id) is distinct from 'owner' then
    raise exception 'only the owner can rename a design' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end
$$;
create trigger designs_before_update before update on public.designs
  for each row execute function public.designs_before_update();

create function public.photos_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  lim record;
  used bigint;
begin
  select * into lim from public.app_limits();
  if new.design_id is not null then
    new.owner := (select g.owner from public.designs g where g.id = new.design_id);
  else
    new.owner := coalesce((select t.owner from public.templates t where t.id = new.template_id), auth.uid());
  end if;
  if new.owner is null then
    raise exception 'photo has no owner' using errcode = '23502';
  end if;
  if new.bytes > lim.file_bytes then
    raise exception 'photo too large' using errcode = 'P0001';
  end if;
  -- A row must come before its object; otherwise a re-inserted row could under-declare an
  -- existing object's size, or claim someone else's orphaned object.
  if public.photo_object_exists(new.path) then
    raise exception 'photo object already exists' using errcode = '23505';
  end if;
  perform pg_advisory_xact_lock(hashtext('photos:' || new.owner::text));
  select coalesce(sum(p.bytes), 0) into used from public.photos p where p.owner = new.owner;
  if used + new.bytes > lim.photo_bytes then
    raise exception 'photo storage limit reached' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger photos_before_insert before insert on public.photos
  for each row execute function public.photos_before_insert();

-- user_id always comes from a confirmed account with that email, never from the client.
create function public.design_members_link()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.user_id := (
    select u.id from auth.users u
    where lower(u.email) = new.email and u.email_confirmed_at is not null
    limit 1
  );
  return new;
end
$$;
create trigger design_members_link before insert or update on public.design_members
  for each row execute function public.design_members_link();

-- When an account is (or becomes) confirmed, claim invitations sent to its email.
create function public.link_invites_on_confirm()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null and new.email is not null then
    update public.design_members set user_id = new.id
    where email = lower(new.email) and user_id is null;
  end if;
  return null;
end
$$;
create trigger link_invites_on_confirm after insert or update of email_confirmed_at, email on auth.users
  for each row execute function public.link_invites_on_confirm();

-- ---------------------------------------------------------------- RLS

alter table public.designs enable row level security;
alter table public.design_updates enable row level security;
alter table public.design_members enable row level security;
alter table public.templates enable row level security;
alter table public.photos enable row level security;

-- Clients may only write these columns; compacted_through moves via compact_design().
revoke insert, update on public.designs from anon, authenticated;
grant insert (id, owner, name, state, thumb) on public.designs to authenticated;
grant update (name, state, thumb) on public.designs to authenticated;
revoke insert, update on public.design_updates from anon, authenticated;
grant insert (design_id, author, data) on public.design_updates to authenticated;

-- owner = auth.uid() is checked inline so insert ... returning sees the new row.
create policy designs_select on public.designs for select to authenticated
  using (owner = auth.uid() or public.design_role(id) is not null);
create policy designs_insert on public.designs for insert to authenticated
  with check (owner = auth.uid());
create policy designs_update on public.designs for update to authenticated
  using (public.design_role(id) in ('owner', 'editor'))
  with check (public.design_role(id) in ('owner', 'editor'));
create policy designs_delete on public.designs for delete to authenticated
  using (owner = auth.uid());

create policy design_updates_select on public.design_updates for select to authenticated
  using (public.design_role(design_id) is not null);
create policy design_updates_insert on public.design_updates for insert to authenticated
  with check (public.design_role(design_id) in ('owner', 'editor') and author = auth.uid());

create policy design_members_select on public.design_members for select to authenticated
  using (public.design_role(design_id) = 'owner' or user_id = auth.uid());
create policy design_members_insert on public.design_members for insert to authenticated
  with check (public.design_role(design_id) = 'owner');
create policy design_members_update on public.design_members for update to authenticated
  using (public.design_role(design_id) = 'owner')
  with check (public.design_role(design_id) = 'owner');
create policy design_members_delete on public.design_members for delete to authenticated
  using (public.design_role(design_id) = 'owner');

create policy templates_owner on public.templates for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

create policy photos_select on public.photos for select to authenticated
  using (owner = auth.uid() or public.design_role(design_id) is not null);
create policy photos_insert on public.photos for insert to authenticated
  with check (
    public.design_role(design_id) in ('owner', 'editor')
    or (template_id is not null and exists (
      select 1 from public.templates t where t.id = template_id and t.owner = auth.uid()))
  );
-- Delete the storage object first, then this row: the object's delete policy needs the row, and
-- the row can't go while its object exists (so the object's bytes stay counted).
create policy photos_delete on public.photos for delete to authenticated
  using (
    (public.design_role(design_id) in ('owner', 'editor')
      or (template_id is not null and owner = auth.uid()))
    and not public.photo_object_exists(path)
  );

-- ---------------------------------------------------------------- realtime

alter publication supabase_realtime add table public.design_updates;

-- Private channels 'design:<uuid>' for anyone with a role on the design.
create policy design_channel_select on realtime.messages for select to authenticated
  using (public.design_role(public.topic_design(realtime.topic())) is not null);
create policy design_channel_insert on realtime.messages for insert to authenticated
  with check (public.design_role(public.topic_design(realtime.topic())) is not null);

-- ---------------------------------------------------------------- storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- An object is readable when the user can see its photos row (photos RLS applies in the subquery).
create policy photos_object_select on storage.objects for select to authenticated
  using (bucket_id = 'photos' and exists (
    select 1 from public.photos p where p.path = storage.objects.name));

-- An object can be uploaded only to a path whose photos row the user could insert.
create policy photos_object_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and exists (
    select 1 from public.photos p
    where p.path = storage.objects.name
      and (public.design_role(p.design_id) in ('owner', 'editor')
        or exists (select 1 from public.templates t where t.id = p.template_id and t.owner = auth.uid()))));

-- An object can be deleted while its photos row is still there and deletable by the user
-- (same rule as photos_delete). Delete the object first, then the row.
create policy photos_object_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and exists (
    select 1 from public.photos p
    where p.path = storage.objects.name
      and (public.design_role(p.design_id) in ('owner', 'editor')
        or (p.template_id is not null and p.owner = auth.uid()))));

-- The quota counts real object sizes, not what the client declared: once storage records an
-- object's size, it overwrites photos.bytes and re-checks the owner's total.
create function public.photos_object_size()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  o uuid;
  used bigint;
begin
  if new.bucket_id <> 'photos' or new.metadata is null or not (new.metadata ? 'size') then
    return null;
  end if;
  select p.owner into o from public.photos p where p.path = new.name;
  if o is null then
    return null;
  end if;
  perform pg_advisory_xact_lock(hashtext('photos:' || o::text));
  update public.photos p set bytes = greatest((new.metadata->>'size')::bigint, 1)::int where p.path = new.name;
  select coalesce(sum(p.bytes), 0) into used from public.photos p where p.owner = o;
  if used > (select l.photo_bytes from public.app_limits() l) then
    raise exception 'photo storage limit reached' using errcode = 'P0001';
  end if;
  return null;
end
$$;
create trigger photos_object_size after insert or update of metadata on storage.objects
  for each row execute function public.photos_object_size();
