create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.projects enable row level security;
alter table public.locations enable row level security;
alter table public.boxes enable row level security;
alter table public.items enable row level security;
alter table public.item_units enable row level security;
alter table public.project_members enable row level security;

-- Projects
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'projects_select_members') THEN
    CREATE POLICY projects_select_members ON public.projects
      FOR SELECT
      USING (
        owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.project_members pm
          WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'projects_insert_owner') THEN
    CREATE POLICY projects_insert_owner ON public.projects
      FOR INSERT
      WITH CHECK (owner_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'projects_update_owner') THEN
    CREATE POLICY projects_update_owner ON public.projects
      FOR UPDATE
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'projects_delete_owner') THEN
    CREATE POLICY projects_delete_owner ON public.projects
      FOR DELETE
      USING (owner_id = auth.uid());
  END IF;
END $$;

-- Project members
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'project_members_select') THEN
    CREATE POLICY project_members_select ON public.project_members
      FOR SELECT
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'project_members_insert_owner') THEN
    CREATE POLICY project_members_insert_owner ON public.project_members
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'project_members_update_owner') THEN
    CREATE POLICY project_members_update_owner ON public.project_members
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'project_members_delete_owner') THEN
    CREATE POLICY project_members_delete_owner ON public.project_members
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Locations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'locations_select_members') THEN
    CREATE POLICY locations_select_members ON public.locations
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE p.id = locations.project_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'locations_insert_members') THEN
    CREATE POLICY locations_insert_members ON public.locations
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.projects p
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE p.id = locations.project_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'locations_update_members') THEN
    CREATE POLICY locations_update_members ON public.locations
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE p.id = locations.project_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.projects p
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE p.id = locations.project_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'locations_delete_members') THEN
    CREATE POLICY locations_delete_members ON public.locations
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE p.id = locations.project_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;
END $$;

-- Boxes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'boxes_select_members') THEN
    CREATE POLICY boxes_select_members ON public.boxes
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.locations l
          JOIN public.projects p ON p.id = l.project_id
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE l.id = boxes.location_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'boxes_insert_members') THEN
    CREATE POLICY boxes_insert_members ON public.boxes
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.locations l
          JOIN public.projects p ON p.id = l.project_id
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE l.id = boxes.location_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'boxes_update_members') THEN
    CREATE POLICY boxes_update_members ON public.boxes
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.locations l
          JOIN public.projects p ON p.id = l.project_id
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE l.id = boxes.location_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.locations l
          JOIN public.projects p ON p.id = l.project_id
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE l.id = boxes.location_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'boxes_delete_members') THEN
    CREATE POLICY boxes_delete_members ON public.boxes
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM public.locations l
          JOIN public.projects p ON p.id = l.project_id
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE l.id = boxes.location_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;
END $$;

-- Items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'items_select_members') THEN
    CREATE POLICY items_select_members ON public.items
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.boxes b
          JOIN public.locations l ON l.id = b.location_id
          JOIN public.projects p ON p.id = l.project_id
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE b.id = items.box_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'items_insert_members') THEN
    CREATE POLICY items_insert_members ON public.items
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.boxes b
          JOIN public.locations l ON l.id = b.location_id
          JOIN public.projects p ON p.id = l.project_id
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE b.id = items.box_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'items_update_members') THEN
    CREATE POLICY items_update_members ON public.items
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.boxes b
          JOIN public.locations l ON l.id = b.location_id
          JOIN public.projects p ON p.id = l.project_id
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE b.id = items.box_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.boxes b
          JOIN public.locations l ON l.id = b.location_id
          JOIN public.projects p ON p.id = l.project_id
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE b.id = items.box_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'items_delete_members') THEN
    CREATE POLICY items_delete_members ON public.items
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM public.boxes b
          JOIN public.locations l ON l.id = b.location_id
          JOIN public.projects p ON p.id = l.project_id
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE b.id = items.box_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;
END $$;

-- Item units
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'item_units_select_members') THEN
    CREATE POLICY item_units_select_members ON public.item_units
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE p.id = item_units.project_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'item_units_insert_members') THEN
    CREATE POLICY item_units_insert_members ON public.item_units
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.projects p
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE p.id = item_units.project_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'item_units_update_members') THEN
    CREATE POLICY item_units_update_members ON public.item_units
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE p.id = item_units.project_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.projects p
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE p.id = item_units.project_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'item_units_delete_members') THEN
    CREATE POLICY item_units_delete_members ON public.item_units
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = auth.uid()
          WHERE p.id = item_units.project_id AND (p.owner_id = auth.uid() OR pm.user_id IS NOT NULL)
        )
      );
  END IF;
END $$;
