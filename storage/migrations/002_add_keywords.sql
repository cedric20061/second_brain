-- storage/migrations/002_add_keywords.sql
ALTER TABLE pages ADD COLUMN IF NOT EXISTS keywords JSONB;