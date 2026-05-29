// core/indexing/indexPage.ts
import { extractKeywords } from './keywords';
import { generateEmbedding } from './embeddings';
import { saveKeywords } from '../../storage/pagesRepository';
import { saveEmbedding } from '../../storage/embeddingsRepository';
import type { StoredPage } from '../types';

export async function indexPage(page: StoredPage): Promise<void> {
  const keywords = extractKeywords(page.textContent);
  await saveKeywords(page.id, keywords);

  const embedding = await generateEmbedding(page.textContent);
  await saveEmbedding(page.id, embedding);
}