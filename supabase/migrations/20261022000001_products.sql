-- Affiliate products for the Support tab's "Print supplies": the admin lists them at /admin/products, and
-- everyone (signed in or not) reads the visible ones. Prices are typed in by hand; price_checked_at says
-- when, so the panel can show "Price as of …".

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  note text not null default '',
  price numeric(10, 2) check (price >= 0),
  price_checked_at timestamptz,
  -- Only https links, so a link can never run script ('javascript:…'). '' while the admin is still filling it in.
  url text not null default '' check (url = '' or url ~* '^https://'),
  image text,                                -- storage.objects.name in bucket 'products'
  position int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_position_idx on public.products (position);

-- A new or changed price is checked now; the admin can also re-confirm an unchanged one by setting the date.
create function public.products_before_write()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.price is not null and (tg_op = 'INSERT' or new.price is distinct from old.price) then
    new.price_checked_at := now();
  end if;
  if new.price is null then
    new.price_checked_at := null;
  end if;
  new.updated_at := now();
  return new;
end
$$;
create trigger products_before_write before insert or update on public.products
  for each row execute function public.products_before_write();

-- Admin only: puts the products in the order of `ids` (the drag-and-drop order).
create function public.reorder_products(ids uuid[])
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.products p set position = o.n
  from unnest(ids) with ordinality as o(id, n)
  where p.id = o.id;
end
$$;

-- ---------------------------------------------------------------- RLS

alter table public.products enable row level security;

create policy products_select on public.products for select to anon, authenticated
  using (not hidden or (select public.is_admin()));
create policy products_insert on public.products for insert to authenticated
  with check ((select public.is_admin()));
create policy products_update on public.products for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy products_delete on public.products for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------- storage

-- Public: product pictures are shown to everyone. Only the admin can add, replace or remove them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 1048576, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy products_object_select on storage.objects for select to anon, authenticated
  using (bucket_id = 'products');
create policy products_object_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'products' and (select public.is_admin()));
create policy products_object_update on storage.objects for update to authenticated
  using (bucket_id = 'products' and (select public.is_admin()))
  with check (bucket_id = 'products' and (select public.is_admin()));
create policy products_object_delete on storage.objects for delete to authenticated
  using (bucket_id = 'products' and (select public.is_admin()));
