-- Quem criou cada aviso agendado (para governação só cancelar os seus).
-- Corre no SQL Editor do Supabase.

alter table push_schedules
  add column if not exists created_by uuid references auth.users (id);

-- Inserts: created_by tem de ser o próprio user (ou null só via service role)
drop policy if exists "Auth insert schedules" on push_schedules;
create policy "Auth insert schedules"
  on push_schedules for insert
  to authenticated
  with check (
    created_by is null
    or created_by = auth.uid()
  );

-- Update/cancel:
-- - admin (sem role ou role=admin) → qualquer linha
-- - avisos → só as suas (created_by = auth.uid())
drop policy if exists "Auth update schedules" on push_schedules;
create policy "Auth update schedules"
  on push_schedules for update
  to authenticated
  using (
    created_by = auth.uid()
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'admin') = 'admin'
  )
  with check (
    created_by = auth.uid()
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'admin') = 'admin'
  );

create index if not exists push_schedules_created_by_idx
  on push_schedules (created_by);
