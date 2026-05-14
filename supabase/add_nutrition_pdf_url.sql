alter table public.nutrition_plans
  add column if not exists pdf_url text default null;
