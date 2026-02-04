create table if not exists public.item_units (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  legacy_code text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists item_units_project_legacy_code_idx
  on public.item_units(project_id, legacy_code);

create index if not exists item_units_item_id_idx
  on public.item_units(item_id);
