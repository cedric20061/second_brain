-- storage/migrations/004_add_clusters.sql

ALTER TABLE pages ADD COLUMN IF NOT EXISTS cluster_id INTEGER;
CREATE INDEX IF NOT EXISTS pages_cluster_id_idx ON pages (cluster_id);