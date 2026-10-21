-- New accounts wait for the site admin's approval before they can store anything (the free plan's
-- storage is shared by everyone). Until then the app signs them straight out, and RLS refuses their
-- reads and writes in case they use the API directly.

create table public.accounts (
  user_id uuid primary key references auth.users on delete cascade,
  email text not null default '',
  name text not null default '',
  admin boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index accounts_pending_idx on public.accounts (created_at) where approved_at is null;

-- Everyone already signed up is approved; the oldest account is the admin.
insert into public.accounts (user_id, email, name, admin, approved_at, created_at)
select u.id, coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', ''),
  u.id = (select f.id from auth.users f order by f.created_at limit 1),
  now(), u.created_at
from auth.users u;

-- Every new auth user (email or Google) gets a pending row; an email change is copied over.
create function public.accounts_on_signup()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.accounts (user_id, email, name)
  values (new.id, coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''))
  on conflict (user_id) do update set email = excluded.email;
  return null;
end
$$;
create trigger accounts_on_signup after insert or update of email on auth.users
  for each row execute function public.accounts_on_signup();

create function public.is_approved()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.accounts a where a.user_id = auth.uid() and a.approved_at is not null) $$;

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.accounts a where a.user_id = auth.uid() and a.admin and a.approved_at is not null) $$;

-- Admin only: approve a waiting account.
create function public.approve_account(u uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.accounts a set approved_at = now() where a.user_id = u and a.approved_at is null;
end
$$;

-- Admin only: remove a waiting account (never an approved one). Its email can sign up again.
create function public.decline_account(u uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from auth.users x
  where x.id = u
    and exists (select 1 from public.accounts a where a.user_id = u and a.approved_at is null and not a.admin);
end
$$;

-- ---------------------------------------------------------------- RLS

alter table public.accounts enable row level security;
revoke insert, update, delete on public.accounts from anon, authenticated;

-- Your own row (to see whether you're approved); the admin sees all.
create policy accounts_select on public.accounts for select to authenticated
  using (user_id = auth.uid() or (select public.is_admin()));

-- Restrictive: on top of the existing policies, only approved accounts get anything.
create policy designs_approved on public.designs as restrictive for all to authenticated
  using ((select public.is_approved())) with check ((select public.is_approved()));
create policy design_updates_approved on public.design_updates as restrictive for all to authenticated
  using ((select public.is_approved())) with check ((select public.is_approved()));
create policy design_members_approved on public.design_members as restrictive for all to authenticated
  using ((select public.is_approved())) with check ((select public.is_approved()));
create policy templates_approved on public.templates as restrictive for all to authenticated
  using ((select public.is_approved())) with check ((select public.is_approved()));
create policy photos_approved on public.photos as restrictive for all to authenticated
  using ((select public.is_approved())) with check ((select public.is_approved()));
create policy photos_object_approved on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'photos' or (select public.is_approved()))
  with check (bucket_id <> 'photos' or (select public.is_approved()));
create policy design_channel_approved on realtime.messages as restrictive for all to authenticated
  using ((select public.is_approved())) with check ((select public.is_approved()));
