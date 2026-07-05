// storage/embeddingsRepository.ts
import { getDb } from './db';

export async function saveEmbedding(pageId: number, embedding: number[]): Promise<void> {
  const db = await getDb();
  // pgvector attend une syntaxe '[0.1,0.2,...]' en texte
  const vectorLiteral = `[${embedding.join(',')}]`;

  await db.query(
    `INSERT INTO page_embeddings (page_id, embedding)
     VALUES ($1, $2)
     ON CONFLICT (page_id) DO UPDATE SET embedding = EXCLUDED.embedding`,
    [pageId, vectorLiteral]
  );
}

export async function findSimilarPages(embedding: number[], limit = 20) {
  const db = await getDb();
  const vectorLiteral = `[${embedding.join(',')}]`;

  const result = await db.query<{
    id: number;
    title: string;
    url: string;
    excerpt: string;
    site_name: string | null;
    captured_at: number;
    similarity: number;
  }>(
    `SELECT
       p.id, p.title, p.url, p.excerpt, p.site_name,
       extract(epoch from p.captured_at) * 1000 AS captured_at,
       1 - (pe.embedding <=> $1) AS similarity
     FROM page_embeddings pe
     JOIN pages p ON p.id = pe.page_id
     ORDER BY pe.embedding <=> $1
     LIMIT $2`,
    [vectorLiteral, limit]
  );

  return result.rows;
}