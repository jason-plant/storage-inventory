alter table public.items
add column if not exists condition smallint;

alter table public.items
add constraint items_condition_range check (condition between 1 and 5);
