-- Also count "Order prints": opening the form, and sending the order to the print shop.
create or replace function public.stat_events()
returns text[]
language sql immutable set search_path = ''
as $$ select array[
  'open', 'print', 'export_png', 'print_kit_open', 'product_click', 'design_service_click', 'gcash_open',
  'order_open', 'print_order',
  'template:pastel', 'template:classic', 'template:modern', 'template:split', 'template:give3',
  'template:give12', 'template:business', 'template:business2', 'template:desk',
  'template:wallpaper', 'template:mini3', 'template:blank'
] $$;
