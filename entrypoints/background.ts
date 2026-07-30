// entrypoints/background.ts
import type { ExtensionMessage, ExtensionResponse } from '../messaging/messageTypes';
import { savePage } from '../storage/pagesRepository';
import { indexPage } from '../core/indexing/indexPage';
import { hybridSearch } from '../core/search/hybridSearch';
import { findSimilarPages } from '../storage/embeddingsRepository';
import { runClustering } from '../core/graph/clustering';
import { buildKnowledgeGraph } from '../core/graph/buildGraph';
import { getStats } from '../storage/statsRepository';
import { getRecentPages } from '../storage/pagesRepository';

let graphCache: { data: Awaited<ReturnType<typeof buildKnowledgeGraph>>; at: number } | null = null;
const GRAPH_TTL = 10 * 60 * 1000;

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, sender, sendResponse: (r: ExtensionResponse) => void) => {

      if (message.type === 'CAPTURE_PAGE') {
        // On passe le tabId pour envoyer les suggestions en retour
        handleCapture(message.payload, sender.tab?.id);
        return false;
      }
      if (message.type === 'SEARCH') {
        handleSearch(message.payload).then(sendResponse);
        return true;
      }
      if (message.type === 'BUILD_GRAPH') {
        handleBuildGraph(message.payload?.limit).then(sendResponse);
        return true;
      }
      if (message.type === 'GET_STATS') {
        getStats()
          .then((stats) => sendResponse({ type: 'STATS_DATA', stats }))
          .catch((err) => sendResponse({ type: 'ERROR', message: err.message }));
        return true;
      }
      if (message.type === 'GET_RECENT') {
        const { limit, offset } = message.payload;
        getRecentPages(limit, offset)
          .then((pages) => sendResponse({ type: 'RECENT_DATA', pages }))
          .catch((err) => sendResponse({ type: 'ERROR', message: err.message }));
        return true;
      }
    }
  );
});

async function handleCapture(
  page: Extract<ExtensionMessage, { type: 'CAPTURE_PAGE' }>['payload'],
  tabId?: number,
) {
  try {
    const stored = await savePage(page);
    const embedding = await indexPage(stored);  // récupère l'embedding généré
    graphCache = null;

    // Suggestions : on réutilise l'embedding qu'on vient de calculer
    if (tabId && embedding) {
      const similar = await findSimilarPages(embedding, 4);
      const suggestions = similar
        .filter((s) => s.url !== page.url && s.similarity > 0.65)
        .slice(0, 3);

      if (suggestions.length > 0) {
        browser.tabs.sendMessage(tabId, { type: 'SHOW_SUGGESTIONS', results: suggestions });
      }
    }
  } catch (err) {
    console.error('[Second Brain] Erreur capture :', err);
  }
}

async function handleSearch(p: { query: string; limit?: number }): Promise<ExtensionResponse> {
  try {
    const results = await hybridSearch(p.query, p.limit ?? 15);
    return { type: 'SEARCH_RESULTS', results };
  } catch (err) {
    return { type: 'ERROR', message: (err as Error).message };
  }
}

async function handleBuildGraph(limit = 300): Promise<ExtensionResponse> {
  try {
    if (graphCache && Date.now() - graphCache.at < GRAPH_TTL) {
      return { type: 'GRAPH_DATA', graph: graphCache.data };
    }
    await runClustering(limit);
    const graph = await buildKnowledgeGraph(limit);
    graphCache = { data: graph, at: Date.now() };
    return { type: 'GRAPH_DATA', graph };
  } catch (err) {
    return { type: 'ERROR', message: (err as Error).message };
  }
}