// core/search/hybridSearch.ts
import { keywordSearch } from './keywordSearch';
import { vectorSearch } from './vectorSearch';
import type { SearchResult } from '../types';

// Poids : le sens (vecteur) domine légèrement les mots-clés exacts
const VECTOR_WEIGHT = 0.6;
const KEYWORD_WEIGHT = 0.4;

export async function hybridSearch(query: string, limit = 15): Promise<SearchResult[]> {
  // Les deux recherches tournent en parallèle
  const [vectorResults, keywordResults] = await Promise.all([
    vectorSearch(query, 30),
    keywordSearch(query, 30),
  ]);

  // Fusion par id dans une Map
  const merged = new Map<number, SearchResult>();

  for (const r of vectorResults) {
    merged.set(r.id, { ...r, score: VECTOR_WEIGHT * (r.vectorScore ?? 0) });
  }

  for (const r of keywordResults) {
    const existing = merged.get(r.id);
    if (existing) {
      // Page présente dans les deux → score hybride complet
      existing.keywordScore = r.keywordScore;
      existing.score += KEYWORD_WEIGHT * normalizeKeywordScore(r.keywordScore ?? 0, keywordResults);
      existing.matchedTerms = r.matchedTerms;
    } else {
      // Page trouvée uniquement par mots-clés
      merged.set(r.id, {
        ...r,
        score: KEYWORD_WEIGHT * normalizeKeywordScore(r.keywordScore ?? 0, keywordResults),
      });
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ts_rank_cd n'est pas borné à [0,1] — on normalise par rapport au max du batch
function normalizeKeywordScore(score: number, results: SearchResult[]): number {
  const max = Math.max(...results.map((r) => r.keywordScore ?? 0));
  return max > 0 ? score / max : 0;
}