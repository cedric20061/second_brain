// core/search/keywordSearch.ts
import { getDb } from '../../storage/db';
import { tokenize } from '../indexing/keywords'; // on réutilise le tokenizer existant
import type { SearchResult } from '../types';

export async function keywordSearch(query: string, limit = 20): Promise<SearchResult[]> {
  const db = await getDb();
  const tokens = tokenize(query).filter(t => t.length >= 3);

  if (tokens.length === 0) return [];

  // websearch_to_tsquery gère les requêtes libres : "docker postgres" → recherche intelligente
  // 'simple' = même dictionnaire que l'indexation, cohérence garantie
  const result = await db.query<{
    id: number;
    url: string;
    title: string;
    excerpt: string;
    site_name: string | null;
    captured_at: number;
    keyword_score: number;
  }>(
    `SELECT
       p.id,
       p.url,
       p.title,
       p.excerpt,
       p.site_name,
       extract(epoch from p.captured_at) * 1000 AS captured_at,
       ts_rank_cd(p.search_vector, query) AS keyword_score
     FROM pages p,
          websearch_to_tsquery('simple', $1) query
     WHERE p.search_vector @@ query
     ORDER BY keyword_score DESC
     LIMIT $2`,
    [query, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    excerpt: row.excerpt,
    siteName: row.site_name,
    capturedAt: row.captured_at,
    score: row.keyword_score,
    keywordScore: row.keyword_score,
    matchedTerms: tokens,
  }));
}