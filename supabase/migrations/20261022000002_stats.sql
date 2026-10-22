-- Usage counts for the admin: how many people open the editor, pick each template, print or export,
-- open the Print Kit and tap its links. Only daily totals per event, nothing about who: anyone (signed in
-- or not) can add one to a known event, and only the admin can read them.

create table public.stats (
  day date not null,
  event text not null,
  n int not null default 0,
  primary key (day, event)
);

-- The events the app counts. A fixed list, so the table can't be filled with made-up names.
create function public.stat_events()
returns text[]
language sql immutable set search_path = ''
as $$ select array[
  'open', 'print', 'export_png', 'print_kit_open', 'product_click', 'design_service_click',
  'template:pastel', 'template:classic', 'template:modern', 'template:split', 'template:give3',
  'template:give12', 'template:business', 'template:business2', 'template:desk',
  'template:wallpaper', 'template:mini3', 'template:blank'
] $$;

-- Adds one to today's count (Philippine time) of `e`; unknown events are ignored.
create function public.count_event(e text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not (e = any (public.stat_events())) then
    return;
  end if;
  insert into public.stats as s (day, event, n)
  values ((now() at time zone 'Asia/Manila')::date, e, 1)
  on conflict (day, event) do update set n = s.n + 1;
end
$$;
grant execute on function public.count_event(text) to anon, authenticated;

alter table public.stats enable row level security;
revoke insert, update, delete on public.stats from anon, authenticated;

create policy stats_select on public.stats for select to authenticated
  using ((select public.is_admin()));
