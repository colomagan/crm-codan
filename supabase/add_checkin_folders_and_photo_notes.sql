-- Notas por foto
alter table public.check_in_photos
  add column if not exists notes text default null;

-- Tabla de carpetas (metadata por fecha)
create table if not exists public.check_in_folders (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  folder_date date not null,
  notes       text default null,
  created_at  timestamptz not null default now(),
  unique(client_id, folder_date)
);
alter table public.check_in_folders enable row level security;
create policy "Users manage own checkin folders"
  on public.check_in_folders for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists check_in_folders_client on public.check_in_folders (client_id, folder_date desc);
