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

export async function findSimilarPages(embedding: number[], limit = 10) {
  const db = await getDb();
  const vectorLiteral = `[${embedding.join(',')}]`;

  // L'opérateur <=> est la distance cosine fournie par pgvector
  const result = await db.query(
    `SELECT p.id, p.title, p.url,
            1 - (pe.embedding <=> $1) AS similarity
     FROM page_embeddings pe
     JOIN pages p ON p.id = pe.page_id
     ORDER BY pe.embedding <=> $1
     LIMIT $2`,
    [vectorLiteral, limit]
  );

  return result.rows;
}