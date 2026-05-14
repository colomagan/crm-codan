-- Training Tab: Google Sheet Embed
-- Run this in Supabase SQL Editor

ALTER TABLE workout_plans
ADD COLUMN IF NOT EXISTS google_sheet_url TEXT;
