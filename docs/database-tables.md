# CodanFit CRM — Database Tables

All tables below must be created in your Supabase project.
Run each SQL block in the Supabase SQL Editor after setting up your project.

---

## Authentication

Handled by Supabase Auth automatically. No manual table needed.
`auth.users` is created by Supabase on project setup.

---

## 1. app_settings

Stores CRM layout preferences (visible sections, group order).

```sql
create table public.app_settings (
  id integer primary key,
  visible_sections jsonb,
  group_order jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create policy "Anyone can read app_settings"
  on public.app_settings for select using (true);

create policy "Authenticated users can upsert app_settings"
  on public.app_settings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Insert default row
insert into public.app_settings (id) values (1);
```

---

## 2. leads

Uncontacted prospects discovered via Lead Finder or manual entry.

```sql
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  business_name text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  email text,
  phone text,
  website text,
  source text,
  city text,
  state text,
  country_code text,
  category text,
  notes text,
  google_maps_url text,
  score numeric,
  reviews_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "Users manage own leads"
  on public.leads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_leads_user_id on public.leads(user_id);
```

---

## 3. contacts

Leads that have been contacted (LEAD_CONTACTED) or promoted to clients (CLIENT).

```sql
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null default 'LEAD_CONTACTED'
    check (type in ('CLIENT', 'LEAD_CONTACTED', 'LEAD_NOT_CONTACTED')),
  business_name text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  whatsapp text,
  email text,
  website text,
  labels text[] not null default '{}',
  last_contact_date date,
  channel text,
  notes text,
  source text,
  country_code text,
  country_name text,
  province text,
  city text,
  category text,
  google_maps_url text,
  score numeric,
  reviews_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contacts enable row level security;

create policy "Users manage own contacts"
  on public.contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_contacts_user_id on public.contacts(user_id);
create index idx_contacts_type on public.contacts(type);
```

---

## 4. crm_clients

Confirmed paying clients.

```sql
create table public.crm_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  business_name text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  email text,
  phone text,
  website text,
  source text,
  notes text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'paused')),
  city text,
  category text,
  country_code text,
  labels text[] not null default '{}',
  channel text,
  google_maps_url text,
  score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crm_clients enable row level security;

create policy "Users manage own clients"
  on public.crm_clients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_crm_clients_user_id on public.crm_clients(user_id);
create index idx_crm_clients_status on public.crm_clients(status);
```

---

## 5. email_signatures

HTML/text email signatures with optional image.

```sql
create table public.email_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  html text,
  text text,
  image_url text,
  image_position text default 'bottom'
    check (image_position in ('top', 'bottom', 'left', 'right')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_signatures enable row level security;

create policy "Users manage own signatures"
  on public.email_signatures for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 6. sender_accounts

SMTP email accounts used for sending emails.

```sql
create table public.sender_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text not null,
  smtp_host text not null,
  smtp_port integer not null default 587,
  smtp_user text not null,
  smtp_pass text not null,
  signature_id uuid references public.email_signatures(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sender_accounts enable row level security;

create policy "Users manage own sender accounts"
  on public.sender_accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 7. email_logs

Record of every email sent.

```sql
create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  sender_account_id uuid references public.sender_accounts(id) on delete set null,
  subject text not null,
  body_html text,
  body_text text,
  recipients jsonb not null default '[]',
  status text not null default 'sent'
    check (status in ('sent', 'failed', 'pending')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.email_logs enable row level security;

create policy "Users view own email logs"
  on public.email_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_email_logs_user_id on public.email_logs(user_id);
```

---

## 8. email_opens

Tracks when recipients open emails (via 1x1 pixel tracking).

```sql
create table public.email_opens (
  id uuid primary key default gen_random_uuid(),
  email_log_id uuid references public.email_logs(id) on delete cascade not null,
  recipient_email text not null,
  opened_at timestamptz not null default now()
);

alter table public.email_opens enable row level security;

create policy "Users view own email opens"
  on public.email_opens for select
  using (
    exists (
      select 1 from public.email_logs
      where email_logs.id = email_opens.email_log_id
        and email_logs.user_id = auth.uid()
    )
  );

create index idx_email_opens_log_id on public.email_opens(email_log_id);
```

---

## Edge Functions to Deploy

After setting up your Supabase project, deploy these edge functions:

```bash
supabase functions deploy send-email --project-ref YOUR_PROJECT_REF
supabase functions deploy track-open --project-ref YOUR_PROJECT_REF
```

Functions are in `supabase/functions/send-email/` and `supabase/functions/track-open/`.

---

## Order of Execution

Run tables in this order to respect foreign key dependencies:

1. `app_settings`
2. `leads`
3. `email_signatures`
4. `sender_accounts`
5. `contacts`
6. `crm_clients`
7. `email_logs`
8. `email_opens`
