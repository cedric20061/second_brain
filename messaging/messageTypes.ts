// messaging/messageTypes.ts
import type { ExtractedPage, SearchResult } from '../core/types';
import type { DashboardStats } from '../storage/statsRepository';
import type { RecentPage } from '../storage/pagesRepository';
import type { SerializedGraph } from '../core/graph/buildGraph';

export type ExtensionMessage =
  | { type: 'CAPTURE_PAGE'; payload: ExtractedPage }
  | { type: 'SEARCH';       payload: { query: string; limit?: number } }
  | { type: 'BUILD_GRAPH';  payload?: { limit?: number } }
  | { type: 'GET_STATS' }
  | { type: 'GET_RECENT';   payload: { limit: number; offset: number } };

// Message background → content script (push)
export type TabMessage =
  | { type: 'SHOW_SUGGESTIONS'; results: SearchResult[] };

export type ExtensionResponse =
  | { type: 'SEARCH_RESULTS'; results: SearchResult[] }
  | { type: 'GRAPH_DATA';     graph: SerializedGraph | null }
  | { type: 'STATS_DATA';     stats: DashboardStats }
  | { type: 'RECENT_DATA';    pages: RecentPage[] }
  | { type: 'ERROR';          message: string };

export function sendMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  return browser.runtime.sendMessage(message);
}