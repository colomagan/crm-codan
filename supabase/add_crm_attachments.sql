-- ── CRM Attachments ──────────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor.
-- Also create a storage bucket named "crm-attachments" with public access
-- in Storage → New bucket → name: crm-attachments → Public: ON

CREATE TABLE IF NOT EXISTS public.crm_attachment_folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,   -- 'lead' | 'contact'
  entity_id   UUID NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type  TEXT NOT NULL,  -- 'lead' | 'contact'
  entity_id    UUID NOT NULL,
  folder_id    UUID REFERENCES public.crm_attachment_folders(id) ON DELETE SET NULL,
  file_name    TEXT NOT NULL,
  file_type    TEXT,
  file_size    INTEGER,
  storage_path TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.crm_attachment_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_attachments        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_folders" ON public.crm_attachment_folders
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "owner_attachments" ON public.crm_attachments
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_folders_entity   ON public.crm_attachment_folders (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_attach_entity    ON public.crm_attachments (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_attach_folder    ON public.crm_attachments (folder_id);
