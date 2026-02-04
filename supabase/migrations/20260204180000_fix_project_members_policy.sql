alter table public.project_members
add column if not exists owner_id uuid;

-- Backfill owner_id from projects
update public.project_members pm
set owner_id = p.owner_id
from public.projects p
where p.id = pm.project_id and pm.owner_id is null;

-- Recreate project_members policies to avoid recursion
DROP POLICY IF EXISTS project_members_select ON public.project_members;
DROP POLICY IF EXISTS project_members_insert_owner ON public.project_members;
DROP POLICY IF EXISTS project_members_update_owner ON public.project_members;
DROP POLICY IF EXISTS project_members_delete_owner ON public.project_members;

CREATE POLICY project_members_select ON public.project_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR owner_id = auth.uid()
  );

CREATE POLICY project_members_insert_owner ON public.project_members
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
  );

CREATE POLICY project_members_update_owner ON public.project_members
  FOR UPDATE
  USING (
    owner_id = auth.uid()
  )
  WITH CHECK (
    owner_id = auth.uid()
  );

CREATE POLICY project_members_delete_owner ON public.project_members
  FOR DELETE
  USING (
    owner_id = auth.uid()
  );
