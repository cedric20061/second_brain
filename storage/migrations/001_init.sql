-- storage/migrations/001_init.sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS pages (
  id            SERIAL PRIMARY KEY,
  url           TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  text_content  TEXT NOT NULL,
  excerpt       TEXT,
  site_name     TEXT,
  byline        TEXT,
  lang          TEXT,
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS page_embeddings (
  page_id    INTEGER PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
  embedding  vector(384)  -- 384 = dimension de all-MiniLM-L6-v2 (Phase 3)
);

-- Index HNSW pour la recherche par similarité cosine (utilisé en Phase 4)
CREATE INDEX IF NOT EXISTS page_embeddings_hnsw_idx
  ON page_embeddings
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS pages_captured_at_idx ON pages (captured_at DESC);