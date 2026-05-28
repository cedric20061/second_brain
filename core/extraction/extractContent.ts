// core/extraction/extractContent.ts
import { Readability } from '@mozilla/readability';
import type { ExtractedPage } from '../types';

export function extractContent(doc: Document, url: string): ExtractedPage | null {
  // Clone obligatoire : Readability mute le DOM passé en argument
  const clonedDoc = doc.cloneNode(true) as Document;

  const reader = new Readability(clonedDoc, {
    charThreshold: 200, // évite d'indexer des pages trop pauvres en contenu (ex: pages de login)
  });

  const article = reader.parse();

  if (!article || !article.textContent || article.textContent.trim().length < 200) {
    // Page non pertinente (paywall, app web, page vide...)
    return null;
  }

  return {
    url,
    title: article.title ?? doc.title,
    content: article.content ?? '',
    textContent: article.textContent.trim(),
    excerpt: article.excerpt ?? '',
    siteName: article.siteName ?? null,
    byline: article.byline ?? null,
    capturedAt: Date.now(),
    lang: doc.documentElement.lang || null,
  };
}