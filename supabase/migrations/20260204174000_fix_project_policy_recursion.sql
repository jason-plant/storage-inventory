-- Ensure owners are also project members
insert into public.project_members (project_id, user_id, role)
select id, owner_id, 'owner'
from public.projects
on conflict do nothing;

-- Add trigger to keep owner as member on new projects
create or replace function public.handle_project_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members(project_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists project_owner_member on public.projects;
create trigger project_owner_member
after insert on public.projects
for each row execute function public.handle_project_owner_member();

-- Drop and recreate policies to avoid recursion
-- Projects
DROP POLICY IF EXISTS projects_select_members ON public.projects;
DROP POLICY IF EXISTS projects_insert_owner ON public.projects;
DROP POLICY IF EXISTS projects_update_owner ON public.projects;
DROP POLICY IF EXISTS projects_delete_owner ON public.projects;

CREATE POLICY projects_select_members ON public.projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY projects_insert_owner ON public.projects
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY projects_update_owner ON public.projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id AND pm.user_id = auth.uid() AND pm.role = 'owner'
    )
  )
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY projects_delete_owner ON public.projects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id AND pm.user_id = auth.uid() AND pm.role = 'owner'
    )
  );

-- Project members
DROP POLICY IF EXISTS project_members_select ON public.project_members;
DROP POLICY IF EXISTS project_members_insert_owner ON public.project_members;
DROP POLICY IF EXISTS project_members_update_owner ON public.project_members;
DROP POLICY IF EXISTS project_members_delete_owner ON public.project_members;

CREATE POLICY project_members_select ON public.project_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid() AND pm.role = 'owner'
    )
  );

CREATE POLICY project_members_insert_owner ON public.project_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid() AND pm.role = 'owner'
    )
  );

CREATE POLICY project_members_update_owner ON public.project_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid() AND pm.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid() AND pm.role = 'owner'
    )
  );

CREATE POLICY project_members_delete_owner ON public.project_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid() AND pm.role = 'owner'
    )
  );
