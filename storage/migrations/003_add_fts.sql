-- storage/migrations/003_add_fts.sql

ALTER TABLE pages ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Trigger : recalcule search_vector à chaque INSERT ou UPDATE
CREATE OR REPLACE FUNCTION pages_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'simple', -- 'simple' = pas de stemming langue-spécifique, OK pour FR+EN mélangés
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.text_content, '')
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER pages_search_vector_trigger
  BEFORE INSERT OR UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION pages_search_vector_update();

-- Met à jour les pages déjà en base
UPDATE pages
SET search_vector = to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(text_content, ''));

-- Index GIN : indispensable pour que la FTS soit rapide à 10k+ pages
CREATE INDEX IF NOT EXISTS pages_fts_idx ON pages USING GIN(search_vector);