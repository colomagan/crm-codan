-- Add new lead profile fields
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS instagram         TEXT,
  ADD COLUMN IF NOT EXISTS linkedin          TEXT,
  ADD COLUMN IF NOT EXISTS job_title         TEXT,
  ADD COLUMN IF NOT EXISTS industry          TEXT,
  ADD COLUMN IF NOT EXISTS headline          TEXT,
  ADD COLUMN IF NOT EXISTS seniority_level   TEXT,
  ADD COLUMN IF NOT EXISTS company_linkedin  TEXT,
  ADD COLUMN IF NOT EXISTS functional_area   TEXT,
  ADD COLUMN IF NOT EXISTS company_domain    TEXT,
  ADD COLUMN IF NOT EXISTS company_founded_year TEXT,
  ADD COLUMN IF NOT EXISTS company_city      TEXT,
  ADD COLUMN IF NOT EXISTS company_country   TEXT;
