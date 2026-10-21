-- The admin dashboard: the site owner's account is the admin, who can list every account and
-- activate, deactivate or decline it.

alter table public.accounts add column deactivated_at timestamptz;

-- The owner's account is the admin (when it exists; otherwise the oldest account stays admin).
update public.accounts a set admin = true, approved_at = coalesce(a.approved_at, now())
where lower(a.email) = 'androidantoque@gmail.com';
update public.accounts a set admin = false
where lower(a.email) <> 'androidantoque@gmail.com'
  and exists (select 1 from public.accounts b where lower(b.email) = 'androidantoque@gmail.com');

-- Admin only: every account, waiting ones first, with what it stores.
create function public.admin_accounts()
returns table (
  user_id uuid, email text, name text, admin boolean, approved_at timestamptz, deactivated_at timestamptz,
  created_at timestamptz, last_sign_in_at timestamptz, designs int, photo_bytes bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select a.user_id, a.email, a.name, a.admin, a.approved_at, a.deactivated_at, a.created_at, u.last_sign_in_at,
    (select count(*)::int from public.designs g where g.owner = a.user_id),
    (select coalesce(sum(p.bytes), 0)::bigint from public.photos p where p.owner = a.user_id)
  from public.accounts a
  left join auth.users u on u.id = a.user_id
  order by a.approved_at is not null, a.created_at;
end
$$;

-- Admin only: activate a waiting or deactivated account.
create or replace function public.approve_account(u uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.accounts a set approved_at = now(), deactivated_at = null where a.user_id = u and a.approved_at is null;
end
$$;

-- Admin only: deactivate an account (never an admin). Its designs and photos stay but it can't use
-- them; it is signed out everywhere (its sessions end now; an access token lasts at most an hour, and RLS refuses it at once).
create function public.deactivate_account(u uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.accounts a set approved_at = null, deactivated_at = now()
  where a.user_id = u and not a.admin and a.approved_at is not null;
  if found then
    delete from auth.sessions s where s.user_id = u;
  end if;
end
$$;

-- Admin only: remove a new account that was never let in (not a deactivated one: that would delete its designs).
create or replace function public.decline_account(u uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from auth.users x
  where x.id = u
    and exists (select 1 from public.accounts a
      where a.user_id = u and a.approved_at is null and a.deactivated_at is null and not a.admin);
end
$$;
