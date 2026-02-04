alter table public.item_units
add column if not exists locked_at timestamptz;
