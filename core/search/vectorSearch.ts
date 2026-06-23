// core/search/vectorSearch.ts
import { generateEmbedding } from '../indexing/embeddings';
import { findSimilarPages } from '../../storage/embeddingsRepository';
import type { SearchResult } from '../types';

export async function vectorSearch(query: string, limit = 20): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(query);
  const rows = await findSimilarPages(embedding, limit);

  // On filtre les résultats dont la similarité est trop faible (bruit)
  return rows
    .filter((row) => row.similarity > 0.25)
    .map((row) => ({
      id: row.id,
      url: row.url,
      title: row.title,
      excerpt: row.excerpt ?? '',
      siteName: row.site_name ?? null,
      capturedAt: row.captured_at,
      score: row.similarity,
      vectorScore: row.similarity,
    }));
}