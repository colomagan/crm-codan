-- ============================================================
-- FITNESS CRM — Migración de tablas
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. client_fitness_profile
create table if not exists public.client_fitness_profile (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null,
  user_id          uuid not null references auth.users(id) on delete cascade,
  goal_cycle       text not null default 'definition' check (goal_cycle in ('definition','bulk','recomp')),
  kcal_target      int,
  protein_g        int,
  carbs_g          int,
  fat_g            int,
  allergies        text,
  injuries         text,
  subscription_end date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (client_id)
);
alter table public.client_fitness_profile enable row level security;
create policy "Users manage own fitness profiles"
  on public.client_fitness_profile for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. fitness_metrics
create table if not exists public.fitness_metrics (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null,
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  weight_kg       numeric(5,2),
  body_fat_pct    numeric(4,2),
  muscle_mass_kg  numeric(5,2),
  bmi             numeric(4,2),
  notes           text,
  created_at      timestamptz not null default now()
);
alter table public.fitness_metrics enable row level security;
create policy "Users manage own fitness metrics"
  on public.fitness_metrics for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists fitness_metrics_client_date on public.fitness_metrics (client_id, date desc);

-- 3. body_measurements
create table if not exists public.body_measurements (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  neck        numeric(4,1),
  shoulders   numeric(4,1),
  chest       numeric(4,1),
  bicep_l     numeric(4,1),
  bicep_r     numeric(4,1),
  waist       numeric(4,1),
  hips        numeric(4,1),
  thigh_l     numeric(4,1),
  thigh_r     numeric(4,1),
  calf_l      numeric(4,1),
  calf_r      numeric(4,1),
  created_at  timestamptz not null default now()
);
alter table public.body_measurements enable row level security;
create policy "Users manage own body measurements"
  on public.body_measurements for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists body_measurements_client_date on public.body_measurements (client_id, date desc);

-- 4. check_in_photos
create table if not exists public.check_in_photos (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null,
  user_id       uuid not null references auth.users(id) on delete cascade,
  folder_date   date not null,
  photo_url     text not null,
  storage_path  text,
  label         text,
  created_at    timestamptz not null default now()
);
alter table public.check_in_photos enable row level security;
create policy "Users manage own check-in photos"
  on public.check_in_photos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists check_in_photos_client_date on public.check_in_photos (client_id, folder_date desc);

-- 5. weekly_checkins
create table if not exists public.weekly_checkins (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null,
  user_id          uuid not null references auth.users(id) on delete cascade,
  week_date        date not null,
  sleep_score      int not null check (sleep_score between 1 and 10),
  hunger_score     int not null check (hunger_score between 1 and 10),
  stress_score     int not null check (stress_score between 1 and 10),
  adherence_score  int not null check (adherence_score between 1 and 10),
  notes            text,
  created_at       timestamptz not null default now(),
  unique (client_id, week_date)
);
alter table public.weekly_checkins enable row level security;
create policy "Users manage own weekly checkins"
  on public.weekly_checkins for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. strength_records
create table if not exists public.strength_records (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null,
  user_id         uuid not null references auth.users(id) on delete cascade,
  exercise_name   text not null,
  weight_kg       numeric(5,2) not null,
  reps            int not null,
  estimated_1rm   numeric(5,2) not null,
  recorded_at     date not null,
  created_at      timestamptz not null default now()
);
alter table public.strength_records enable row level security;
create policy "Users manage own strength records"
  on public.strength_records for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists strength_records_client_exercise on public.strength_records (client_id, exercise_name, recorded_at desc);

-- 7. workout_plans
create table if not exists public.workout_plans (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.workout_plans enable row level security;
create policy "Users manage own workout plans"
  on public.workout_plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 8. workout_exercises
create table if not exists public.workout_exercises (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.workout_plans(id) on delete cascade,
  day         text not null,
  "order"     int not null default 0,
  name        text not null,
  sets        int not null default 3,
  reps        text not null default '10',
  rpe_rir     text,
  rest_sec    int,
  video_url   text,
  created_at  timestamptz not null default now()
);
alter table public.workout_exercises enable row level security;
create policy "Users manage own workout exercises"
  on public.workout_exercises for all
  using (
    exists (
      select 1 from public.workout_plans p
      where p.id = plan_id and p.user_id = auth.uid()
    )
  );
create index if not exists workout_exercises_plan_day on public.workout_exercises (plan_id, day, "order");

-- 9. nutrition_plans
create table if not exists public.nutrition_plans (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  kcal_target  int not null default 2000,
  protein_g    int not null default 150,
  carbs_g      int not null default 200,
  fat_g        int not null default 67,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
alter table public.nutrition_plans enable row level security;
create policy "Users manage own nutrition plans"
  on public.nutrition_plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 10. nutrition_meals
create table if not exists public.nutrition_meals (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.nutrition_plans(id) on delete cascade,
  name        text not null,
  time        text,
  "order"     int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.nutrition_meals enable row level security;
create policy "Users manage own nutrition meals"
  on public.nutrition_meals for all
  using (
    exists (
      select 1 from public.nutrition_plans p
      where p.id = plan_id and p.user_id = auth.uid()
    )
  );
create index if not exists nutrition_meals_plan on public.nutrition_meals (plan_id, "order");

-- 11. nutrition_items
create table if not exists public.nutrition_items (
  id           uuid primary key default gen_random_uuid(),
  meal_id      uuid not null references public.nutrition_meals(id) on delete cascade,
  ingredient   text not null,
  qty          numeric(6,2) not null default 100,
  unit         text not null default 'g',
  kcal         int not null default 0,
  protein_g    numeric(5,2) not null default 0,
  carbs_g      numeric(5,2) not null default 0,
  fat_g        numeric(5,2) not null default 0,
  created_at   timestamptz not null default now()
);
alter table public.nutrition_items enable row level security;
create policy "Users manage own nutrition items"
  on public.nutrition_items for all
  using (
    exists (
      select 1 from public.nutrition_meals m
      join public.nutrition_plans p on p.id = m.plan_id
      where m.id = meal_id and p.user_id = auth.uid()
    )
  );
create index if not exists nutrition_items_meal on public.nutrition_items (meal_id);

-- Storage bucket for check-in photos (run separately if needed)
-- insert into storage.buckets (id, name, public) values ('checkin-photos', 'checkin-photos', false);
