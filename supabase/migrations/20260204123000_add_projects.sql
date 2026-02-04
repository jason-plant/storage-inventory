-- Add projects table and project_id for locations

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  created_at timestamptz not null default now()
);

alter table locations
  add column if not exists project_id uuid references projects(id) on delete set null;

create index if not exists projects_owner_id_idx on projects(owner_id);
create index if not exists locations_project_id_idx on locations(project_id);
