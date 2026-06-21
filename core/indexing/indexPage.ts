// core/indexing/indexPage.ts
import { extractKeywords } from './keywords';
import { generateEmbedding } from './embeddings';
import { saveKeywords } from '../../storage/pagesRepository';
import { saveEmbedding } from '../../storage/embeddingsRepository';
import type { StoredPage } from '../types';

// Retourne l'embedding généré — le background le réutilise pour les suggestions
export async function indexPage(page: StoredPage): Promise<number[] | null> {
  const keywords = extractKeywords(page.textContent);
  await saveKeywords(page.id, keywords);

  const embedding = await generateEmbedding(page.textContent);
  await saveEmbedding(page.id, embedding);

  return embedding;
}