// storage/graphRepository.ts
import { getDb } from './db';

export interface GraphPageData {
  id: number;
  title: string;
  url: string;
  clusterId: number | null;
  embedding: number[];
}

// Récupère les N pages les plus récentes qui ont un embedding
export async function getGraphData(limit = 300): Promise<GraphPageData[]> {
  const db = await getDb();

  const result = await db.query<{
    id: number;
    title: string;
    url: string;
    cluster_id: number | null;
    embedding: string;
  }>(
    `SELECT p.id, p.title, p.url, p.cluster_id,
            pe.embedding::text AS embedding
     FROM pages p
     JOIN page_embeddings pe ON pe.page_id = p.id
     ORDER BY p.captured_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    clusterId: row.cluster_id,
    embedding: parseVector(row.embedding),
  }));
}

// Sauvegarde les cluster_id en batch avec unnest (une seule requête)
export async function saveClusterIds(assignments: Map<number, number>): Promise<void> {
  if (assignments.size === 0) return;
  const db = await getDb();

  const ids = [...assignments.keys()];
  const clusters = [...assignments.values()];

  await db.query(
    `UPDATE pages SET cluster_id = v.cluster_id
     FROM (
       SELECT unnest($1::int[]) AS id,
              unnest($2::int[]) AS cluster_id
     ) AS v
     WHERE pages.id = v.id`,
    [ids, clusters]
  );
}

// pgvector retourne les vecteurs sous forme '[0.1,0.2,…]'
function parseVector(text: string): number[] {
  return text.slice(1, -1).split(',').map(Number);
}