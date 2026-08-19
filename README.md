# ◎ Second Brain — Technical Documentation

> A personal augmented memory engine built as a Chrome extension.
> 100% local, zero cloud APIs, zero cost.

---

## Table of Contents

1. [Concept & Philosophy](#1-concept--philosophy)
2. [Tech Stack](#2-tech-stack)
3. [File Structure](#3-file-structure)
4. [Architecture & Module Communication](#4-architecture--module-communication)
5. [The Three Pipelines in Detail](#5-the-three-pipelines-in-detail)
   - [Capture Pipeline](#51-capture-pipeline--the-foundation)
   - [Search Pipeline](#52-search-pipeline)
   - [Graph Pipeline](#53-graph-pipeline)
6. [Role of Each File](#6-role-of-each-file)
7. [Installation & Running](#7-installation--running)
8. [Testing the Project](#8-testing-the-project)
9. [Customizing the Extension](#9-customizing-the-extension)
10. [Configuration & Key Parameters](#10-configuration--key-parameters)
11. [Common Troubleshooting](#11-common-troubleshooting)

---

## 1. Concept & Philosophy

Second Brain turns your browser into a **personal memory engine**: every page you read is automatically captured, cleaned, indexed, and made searchable — without ever leaving your machine.

**No external APIs.** No Gemini, OpenAI, or Claude. Everything runs locally:
- The embedding model (`all-MiniLM-L6-v2`) is downloaded once from HuggingFace then cached in the browser.
- The database is an embedded PostgreSQL instance (PGlite / WASM) persisted in IndexedDB.
- Vector search uses an HNSW index stored in that same database.

---

## 2. Tech Stack

| Role | Technology |
|---|---|
| Build & dev | **WXT** (extension framework) + **Vite** |
| Language | **TypeScript** |
| Database | **PGlite** (PostgreSQL in WASM) + **pgvector** extension |
| Content extraction | **Readability.js** (Mozilla) + **DOMPurify** |
| Local embeddings | **Transformers.js** (`@huggingface/transformers`) |
| ML model | `Xenova/all-MiniLM-L6-v2` quantized q8 (384 dimensions) |
| Vector search | **HNSW** index via pgvector |
| Text search | PostgreSQL **Full-Text Search** (`tsvector` + `GIN`) |
| Clustering | **ml-kmeans** (k-means++) |
| Graph | **graphology** |
| Graph visualization | **Cytoscape.js** |
| Charts | **Recharts** |
| UI | **React** |

---

## 3. File Structure

```
second-brain/
│
├── wxt.config.ts              # WXT config: manifest, permissions, WASM CSP
├── package.json
├── tsconfig.json
│
├── entrypoints/               # Chrome entry points (managed by WXT)
│   ├── background.ts          # Central service worker — orchestrator
│   ├── content.ts             # Injected into every visited page
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── Popup.tsx          # Quick search bar (400px)
│   └── sidepanel/
│       ├── index.html
│       ├── main.tsx
│       └── SidePanel.tsx      # Main interface (4 tabs)
│
├── core/                      # Pure business logic — no Chrome APIs
│   ├── types.ts               # Shared types (ExtractedPage, StoredPage, SearchResult)
│   ├── extraction/
│   │   ├── extractContent.ts  # Readability.js wrapper
│   │   └── sanitize.ts        # HTML sanitization (DOMPurify)
│   ├── indexing/
│   │   ├── keywords.ts        # TF extraction + FR/EN stopwords
│   │   ├── embeddings.ts      # Transformers.js wrapper (Worker communication)
│   │   └── indexPage.ts       # Orchestrator: keywords → embedding → save
│   ├── search/
│   │   ├── keywordSearch.ts   # PostgreSQL FTS search
│   │   ├── vectorSearch.ts    # Cosine search via pgvector
│   │   └── hybridSearch.ts    # Score fusion
│   └── graph/
│       ├── clustering.ts      # K-means on embeddings
│       └── buildGraph.ts      # Graph construction + Cytoscape serialization
│
├── storage/                   # Only layer that touches the database
│   ├── db.ts                  # PGlite singleton + migration runner
│   ├── pagesRepository.ts     # Pages CRUD (savePage, getRecentPages…)
│   ├── embeddingsRepository.ts # Vectors CRUD (saveEmbedding, findSimilarPages)
│   ├── graphRepository.ts     # Embedding reads for graph, saveClusterIds
│   ├── statsRepository.ts     # Dashboard queries (totals, activity, domains)
│   └── migrations/
│       ├── 001_init.sql       # pages + page_embeddings tables + HNSW index
│       ├── 002_add_keywords.sql # keywords JSONB column
│       ├── 003_add_fts.sql    # tsvector column + GIN index + trigger
│       └── 004_add_clusters.sql # cluster_id column
│
├── messaging/
│   └── messageTypes.ts        # Typed UI ↔ background contract (all message types)
│
├── workers/
│   └── embedding.worker.ts    # Dedicated Web Worker for ML computation
│
├── ui/
│   ├── styles/
│   │   ├── tokens.css         # CSS variables (colors, typography, spacing)
│   │   └── clusterColors.ts   # Color palette per cluster
│   ├── hooks/
│   │   ├── useSearch.ts       # State + debounce for search
│   │   ├── useStats.ts        # Lazy stats loading
│   │   └── useRecent.ts       # Recent pages pagination
│   └── components/
│       ├── SearchBar.tsx      # Input with spinner and clear button
│       ├── ResultCard.tsx     # Result card with term highlighting
│       ├── EmptyState.tsx     # Contextual empty states
│       ├── RecentList.tsx     # History grouped by day
│       ├── Dashboard.tsx      # Recharts (activity, domains, clusters)
│       └── GraphView.tsx      # Cytoscape.js visualization
│
└── public/
    ├── icons/
    └── wasm/                  # onnxruntime-web .wasm files (copied at postinstall)
```

---

## 4. Architecture & Module Communication

### Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          CHROME BROWSER                         │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────────────────────────┐  │
│  │ Content      │    │         Background Service Worker     │  │
│  │ Script       │    │                                       │  │
│  │              │    │  ┌─────────┐   ┌──────────────────┐  │  │
│  │ Readability  │───▶│  │  core/  │   │    storage/      │  │  │
│  │ DOMPurify    │    │  │  search │◀─▶│  PGlite (WASM)   │  │  │
│  │              │    │  │  graph  │   │  pgvector (HNSW) │  │  │
│  │              │◀───│  │  index  │   └──────────────────┘  │  │
│  │ Sug. widget  │    │  └────▲────┘                          │  │
│  └──────────────┘    │       │ postMessage                   │  │
│                      │  ┌────┴──────────────┐                │  │
│  ┌──────────────┐    │  │  embedding.worker │                │  │
│  │   Popup      │    │  │  (Transformers.js)│                │  │
│  │  SearchBar   │    │  │  all-MiniLM-L6-v2 │                │  │
│  └──────┬───────┘    │  └───────────────────┘                │  │
│         │            └────────────▲─────────────────────────┘  │
│  ┌──────┴───────┐                 │ chrome.runtime.sendMessage  │
│  │  Side Panel  │─────────────────┘                            │
│  │   4 tabs     │                                              │
│  └──────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
```

### The Golden Rule of Communication

Chrome extensions enforce strict context separation. Modules **never call each other directly** across different contexts:

| From | To | Mechanism |
|---|---|---|
| Content script → Background | `chrome.runtime.sendMessage` |
| UI (Popup/SidePanel) → Background | `chrome.runtime.sendMessage` |
| Background → Content script | `chrome.tabs.sendMessage(tabId, …)` |
| Background → Embedding Worker | `worker.postMessage` / `worker.onmessage` |

All message types are centralized in `messaging/messageTypes.ts`. Adding a new message type means editing only that file.

### Why `core/` is Separate from `storage/`

`core/` contains pure logic: extraction, search, and clustering algorithms. These modules **never import** `chrome.*` or IndexedDB directly. The benefit: they can be tested with Vitest without simulating an extension environment.

`storage/` is the only layer allowed to talk to PGlite. If PGlite is replaced tomorrow by Dexie or SQLite WASM, only this folder changes.

---

## 5. The Three Pipelines in Detail

### 5.1 Capture Pipeline — The Foundation

Triggered automatically on every page visit.

```
User visits a page
         │
         ▼
[content.ts] setTimeout 1500ms
  (lets React/Vue SPAs finish their initial render)
         │
         ▼ shouldSkip() → filters login pages, chrome://, etc.
         │
         ▼
[extractContent.ts] Readability.js
  • DOM clone (Readability mutates the DOM it receives!)
  • extracts: title, clean text, excerpt, author, language
  • if textContent < 200 chars → abort
         │
         ▼
[content.ts] sendMessage({ type: 'CAPTURE_PAGE', payload })
         │
         ▼ chrome.runtime.sendMessage
         │
[background.ts] handleCapture()
         │
    ┌────┴────────────────────┐
    ▼                         ▼
[pagesRepository.ts]    [indexPage.ts]
 savePage()              │
 ON CONFLICT → UPDATE    ├─▶ [keywords.ts] TF + stopwords → JSONB
 (URL = unique key)      │
                         └─▶ [embeddings.ts] → [embedding.worker.ts]
                                  all-MiniLM-L6-v2 (q8)
                                  text.slice(0, 2000) → 384d vector
                                       │
                                       ▼
                              [embeddingsRepository.ts]
                               saveEmbedding() → pgvector
                                       │
                                       ▼
                              [background.ts]
                               findSimilarPages(embedding, 4)
                               similarity > 0.65 and url ≠ current page
                                       │
                                       ▼
                              chrome.tabs.sendMessage(tabId)
                              { type: 'SHOW_SUGGESTIONS', results }
                                       │
                                       ▼
                              [content.ts] injectSuggestionWidget()
                               Shadow DOM → floating widget for 8 seconds
```

**Key points:**
- The 1500ms delay is a compromise for SPAs. Increase it if you notice empty captures on specific sites.
- `ON CONFLICT (url) DO UPDATE`: revisiting a page updates its content, no duplicates.
- The embedding returned by `indexPage()` is immediately reused for suggestions — no double computation.

---

### 5.2 Search Pipeline

Triggered when the user types in the popup or side panel.

```
User types a query
         │
         ▼
[useSearch.ts] debounce 280ms
  (avoids a request on every keystroke)
         │
         ▼
sendMessage({ type: 'SEARCH', payload: { query, limit: 15 } })
         │
         ▼ chrome.runtime.sendMessage
         │
[background.ts] handleSearch()
         │
         ▼
[hybridSearch.ts] Promise.all([...])
    │                    │
    ▼                    ▼
[keywordSearch.ts]   [vectorSearch.ts]
 websearch_to_        generateEmbedding(query)
 tsquery('simple')         │
 @@ search_vector    findSimilarPages(embedding)
 ts_rank_cd()         cosine similarity (HNSW)
 → FTS score          filter > 0.25
                      → vector score
    │                    │
    └────────┬───────────┘
             ▼
    Merge by page.id into a Map
    hybrid score = 0.6 × vectorScore + 0.4 × keywordScore
    (keywordScore normalized by batch max)
             │
             ▼
    Sort by score DESC → slice(0, limit)
             │
             ▼
    { type: 'SEARCH_RESULTS', results: SearchResult[] }
             │
             ▼
[useSearch.ts] setState → re-render
[ResultCard.tsx] display with term highlighting
```

**Why hybrid search?**
- Vector search alone misses exact technical terms ("JWT", "pgvector") — the model may not know them well.
- FTS alone misses reformulations ("secure an API" vs "token authentication").
- The combination of both gives the best results in practice.

---

### 5.3 Graph Pipeline

Triggered manually (by clicking "Build graph").

```
User clicks "Build graph"
         │
         ▼
[SidePanel.tsx] handleBuildGraph()
sendMessage({ type: 'BUILD_GRAPH', payload: { limit: 300 } })
         │
         ▼
[background.ts] handleBuildGraph()
  Checks in-memory cache (TTL 10 min)
  If cache is valid → return immediately
         │
    ┌────┴────────────────────────┐
    ▼                             ▼
[clustering.ts]           [buildGraph.ts]
 getGraphData(300)
  (most recent pages with embeddings)
         │
         ▼
 k = √(n/2) capped to [3, 15]
 KMeans(embeddings, k, 'kmeans++')
 → cluster_id per page
         │
         ▼
 saveClusterIds() → UPDATE pages (batch unnest)
         │
         ▼
[buildGraph.ts]
 getGraphData(300)  ← fetches updated cluster_ids
         │
         ▼
 For each pair (i, j):
   score = dotProduct(embedding_i, embedding_j)
   (dot product = cosine similarity on normalized vectors)
   if score > 0.65 → edge candidate
   → keep top 5 neighbors per page
         │
         ▼
 graphology Graph
   .addNode(id, { label, url, cluster, degree })
   .addEdge(src, tgt, { weight })
         │
         ▼
 Serialization → { nodes[], edges[] }
         │
         ▼
[background.ts] graphCache = { data, at: Date.now() }
{ type: 'GRAPH_DATA', graph }
         │
         ▼
[GraphView.tsx]
 cytoscape({ elements: nodes + edges })
 layout: 'cose' (physics, no animation)
 nodes colored by cluster, size ∝ degree
 click → highlight direct neighbors + tooltip
```

---

## 6. Role of Each File

### `entrypoints/`

| File | Role |
|---|---|
| `background.ts` | The brain of the extension. Receives all messages, orchestrates calls to `core/` and `storage/`, maintains the graph cache. Runs as an MV3 Service Worker. |
| `content.ts` | Injected into every page. Extracts content, sends it to the background, renders the suggestion widget. Has no access to `storage/`. |
| `popup/Popup.tsx` | Compact interface (400px). Only the quick search bar + side panel open button. |
| `sidepanel/SidePanel.tsx` | Main interface: 4 tabs (Search, Recent, Graph, Stats). Orchestrates all hooks. |

### `core/`

| File | Role |
|---|---|
| `types.ts` | Single source of truth for TypeScript types. `ExtractedPage` → `StoredPage` → `SearchResult`. |
| `extraction/extractContent.ts` | Clones the DOM, passes it to Readability, returns `null` if content is too sparse (< 200 chars). |
| `extraction/sanitize.ts` | Sanitizes HTML for display (allowlist of tags). Not used for indexing, which works on plain text. |
| `indexing/keywords.ts` | Tokenizes, removes accents, filters FR/EN stopwords, returns the N most frequent terms. |
| `indexing/embeddings.ts` | Creates and maintains the Web Worker. Sends texts via `postMessage`, correlates responses by UUID. Initializes the WASM path via `chrome.runtime.getURL`. |
| `indexing/indexPage.ts` | Orchestrator: calls keywords.ts + embeddings.ts + both repositories. Returns the embedding so the background can reuse it for suggestions without recomputing. |
| `search/keywordSearch.ts` | PostgreSQL FTS query with `websearch_to_tsquery` and `ts_rank_cd`. Normalizes the score. |
| `search/vectorSearch.ts` | Generates an embedding for the query, calls `findSimilarPages`, filters scores < 0.25. |
| `search/hybridSearch.ts` | Runs both searches in parallel (`Promise.all`), merges by `page.id`, computes the weighted score. |
| `graph/clustering.ts` | Loads embeddings, computes `k`, runs k-means++, saves `cluster_id` values. |
| `graph/buildGraph.ts` | Computes pairwise similarities in memory (dot product), builds the graphology graph, serializes for Cytoscape. |

### `storage/`

| File | Role |
|---|---|
| `db.ts` | PGlite singleton with `idb://second-brain-db`. `relaxedDurability: true` for performance. Runs migrations in order at every startup (idempotent thanks to `IF NOT EXISTS`). |
| `pagesRepository.ts` | `savePage` (upsert on URL), `getPageByUrl`, `countPages`, `getRecentPages` (pagination). |
| `embeddingsRepository.ts` | `saveEmbedding` (upsert), `findSimilarPages` (pgvector `<=>` operator, HNSW index). |
| `graphRepository.ts` | `getGraphData` (pages + embeddings for clustering), `saveClusterIds` (batch update via `unnest`). |
| `statsRepository.ts` | 4 parallel queries: totals, daily activity, top domains, cluster distribution. |
| `migrations/*.sql` | Run in order at every startup. Idempotent (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`). |

### `messaging/messageTypes.ts`

Single contract between all modules. All extension communication flows through this file.

```typescript
// Messages sent by UI → background
type ExtensionMessage =
  | { type: 'CAPTURE_PAGE'; payload: ExtractedPage }
  | { type: 'SEARCH';       payload: { query: string; limit?: number } }
  | { type: 'BUILD_GRAPH';  payload?: { limit?: number } }
  | { type: 'GET_STATS' }
  | { type: 'GET_RECENT';   payload: { limit: number; offset: number } };

// Push message background → content script (reverse direction)
type TabMessage =
  | { type: 'SHOW_SUGGESTIONS'; results: SearchResult[] };

// Background → UI responses
type ExtensionResponse =
  | { type: 'SEARCH_RESULTS'; results: SearchResult[] }
  | { type: 'GRAPH_DATA';     graph: SerializedGraph | null }
  | { type: 'STATS_DATA';     stats: DashboardStats }
  | { type: 'RECENT_DATA';    pages: RecentPage[] }
  | { type: 'ERROR';          message: string };
```

### `workers/embedding.worker.ts`

Isolated from the main thread to never block the UI or the service worker.

- Receives `{ type: 'INIT', wasmBaseUrl }` → configures the WASM path
- Receives `{ type: 'EMBED', id, text }` → generates the embedding, responds with `{ id, embedding }`
- Keeps the model in memory (singleton) → loaded once, reused for all texts

### `ui/`

| File | Role |
|---|---|
| `styles/tokens.css` | Global CSS variables. Edit here to change the entire palette. |
| `styles/clusterColors.ts` | Palette of 15 distinct colors. Shared between GraphView and Dashboard. |
| `hooks/useSearch.ts` | 280ms debounce, cancels stale requests via `ref`, returns `{ results, loading, error, query, search, clear }`. |
| `hooks/useStats.ts` | Loads stats once when the Stats tab becomes active. `refresh()` forces a reload. |
| `hooks/useRecent.ts` | Infinite pagination (50 per page). Loads on first display of the Recent tab. |
| `components/SearchBar.tsx` | Controlled input with search icon / spinner and clear button. |
| `components/ResultCard.tsx` | Shows title (with regex highlighting), domain, excerpt, relative date, matched terms (amber badges). |
| `components/EmptyState.tsx` | Two states: empty memory (first launch) or no results for the query. |
| `components/RecentList.tsx` | Groups pages by day (Today / Yesterday / long date). Colored dot = cluster. "Load more" pagination. |
| `components/Dashboard.tsx` | Activity AreaChart, horizontal domains BarChart, cluster progress bars. Recharts + CSS vars. |
| `components/GraphView.tsx` | Cytoscape.js in a `useEffect`. Nodes colored by cluster, size ∝ degree. Click = highlight neighbors + tooltip. Shadow DOM isolated. |

---

## 7. Installation & Running

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9 (`corepack enable pnpm` or `npm install -g pnpm`)
- **Chrome** ≥ 114 (Side Panel API)

### Installation

```bash
# 1. Clone the project
git clone <repo-url>
cd second-brain

# 2. Install dependencies
pnpm install
# postinstall automatically copies .wasm files into public/wasm/
```

### Development (hot-reload)

```bash
pnpm dev
```

WXT launches a Chrome instance with the extension already loaded and hot-reload enabled.
Every file change automatically reloads the extension.

> **Important:** the first launch downloads the `all-MiniLM-L6-v2` model (≈ 23 MB quantized q8) from HuggingFace. This download is cached in the browser — subsequent launches are instant.

### Production Build

```bash
pnpm build
```

Generates the `.output/chrome-mv3/` folder, ready to be loaded manually or submitted to the Chrome Web Store.

### Load the Built Extension in Chrome (without `pnpm dev`)

1. `pnpm build`
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right corner)
4. Click **"Load unpacked"**
5. Select the `.output/chrome-mv3/` folder

The extension is now installed. To see the logs (captures, errors), click the **"Service worker"** link that appears under the extension name in `chrome://extensions`.

> After each new `pnpm build`, click the reload icon ⟳ on the extension card in `chrome://extensions` to pick up the changes.

### Share the Extension with Testers (`.zip`)

WXT can package the build for you.
Run

```bash
pnpm zip
# → .output/second-brain-<version>-chrome.zip
```

**What the tester does** (no Node.js, no pnpm, nothing to install):

1. Unzip the archive somewhere permanent (Chrome loads the extension from this folder, so don't delete or move it afterwards)
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right corner)
4. Click **"Load unpacked"**
5. Select the unzipped folder (the one that contains `manifest.json`)

**Good to know for testers:**

- Internet access is needed on first use only: the ML model (≈ 23 MB) is downloaded from HuggingFace, then cached.
- All data stays in the tester's own browser. Nothing is shared with you or sent anywhere.
- Chrome ≥ 114 is required.
- Chrome may display a "Disable developer mode extensions" warning at startup. This is normal for extensions loaded outside the Web Store.

---

## 8. Testing the Project

### Test the Capture Pipeline

1. Run `pnpm dev`
2. Visit a blog post or technical documentation page
3. Open `chrome://extensions` → your extension → **"Service worker"** (inspect link)
4. In the service worker console, you should see:

```
[Second Brain] Page saved: "Page Title" (id=1)
[Second Brain] Page indexed (keywords + embedding)
```

5. Verify that a content-sparse page (login page, 404) generates **no logs**. 

### Test Search

In the service worker console, you can send a query directly:

```javascript
chrome.runtime.sendMessage(
  { type: 'SEARCH', payload: { query: 'docker postgres', limit: 5 } },
  (response) => console.log(response)
);
```

You should see results with `score`, `vectorScore`, and `keywordScore`.

### Test the Database

```javascript
// In the service worker console
// Check current stats
chrome.runtime.sendMessage({ type: 'GET_STATS' }, (res) => console.log(res.stats));
```

### Test Suggestions

1. Capture 10+ pages on the same topic (e.g. several Docker-related articles)
2. Visit a new page on that topic
3. A floating widget should appear in the bottom right with similar already-captured pages

### Test the Graph

1. Capture at least 10 varied pages
2. Open the side panel → **Graph** tab
3. Click "Build graph"
4. After a few seconds, the constellation of pages should appear

### Check Database State

```javascript
// Service worker console
chrome.runtime.sendMessage({ type: 'GET_STATS' }, (r) => {
  console.log(`Pages: ${r.stats.totalPages}`);
  console.log(`Indexed: ${r.stats.indexedPages}`);
  console.log(`Sites: ${r.stats.totalSites}`);
});
```
---

## 9. Configuration & Key Parameters

All tunable parameters are gathered here with their impact.

### Capture

```typescript
// entrypoints/content.ts
setTimeout(capturePage, 1500);
// → Increase if SPAs (Notion, Linear…) produce empty captures
// → Decrease for faster, more reactive capture
```

### Embedding Model

```typescript
// workers/embedding.worker.ts
pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' })
// dtype: 'q4' → lighter, less accurate
// dtype: 'fp32' → more accurate, ~4x heavier
// Alternative model: 'nomic-ai/nomic-embed-text-v1.5' (768d, better quality)
```

### Text Window for Embedding

```typescript
// workers/embedding.worker.ts
text.slice(0, 2000)
// MiniLM handles ~256 tokens ≈ 1500-2000 useful characters
// Beyond that: the model silently truncates
// For very long articles: implement chunking (future phase)
```

### Similarity Threshold for Suggestions

```typescript
// entrypoints/background.ts
.filter((s) => s.url !== page.url && s.similarity > 0.65)
// Lower (0.5) → more suggestions, less precise
// Higher (0.8) → fewer suggestions, very precise
```

### Hybrid Search — Weighting

```typescript
// core/search/hybridSearch.ts
const VECTOR_WEIGHT = 0.6;  // weight of semantic search
const KEYWORD_WEIGHT = 0.4; // weight of keyword search
// If your searches are very technical (lib names, functions) → increase KEYWORD_WEIGHT
// If your searches are conceptual → increase VECTOR_WEIGHT
```

### Graph Similarity Threshold

```typescript
// core/graph/buildGraph.ts
const SIMILARITY_THRESHOLD = 0.65;
const TOP_K_NEIGHBORS = 5;
// SIMILARITY_THRESHOLD too high → fragmented graph (isolated islands)
// SIMILARITY_THRESHOLD too low  → overly dense, unreadable graph
// TOP_K_NEIGHBORS → max connections per page
```

### Graph Cache

```typescript
// entrypoints/background.ts
const GRAPH_TTL = 10 * 60 * 1000; // 10 minutes
// Increase if recomputation is too frequent
// Set to 0 to recompute on every tab open (debug)
```

---

## 10. Common Troubleshooting

### Suggestion widget doesn't appear

- Verify the captured page has an embedding (check "Page indexed" log in the service worker console)
- Verify other similar pages exist in the database (at least 3-4 on the same topic)
- The 0.65 threshold may be too high for your corpus — try 0.50

### Search returns nothing

- FTS doesn't work on pages without a `search_vector` → pages captured before migration 003 need to be refreshed: `UPDATE pages SET text_content = text_content` (triggers the trigger)
- Verify the page is indexed with `GET_STATS`

### Model fails to load (WASM error)

- Verify that `public/wasm/` contains the `.wasm` files (run `pnpm run postinstall` to copy them again)
- Verify the CSP in `wxt.config.ts`: `'wasm-unsafe-eval'` must be present

### Service worker is suspended between visits

Normal MV3 behavior. The service worker can be killed by Chrome after a few seconds of inactivity. On the next message, it restarts automatically. PGlite and the Web Worker are re-initialized via their respective singletons.

### PGlite doesn't persist between sessions

Verify that `dataDir: 'idb://second-brain-db'` is present in `storage/db.ts`. Without the `idb://` prefix, PGlite runs in-memory only.

### Graph is empty after building

- At least 5 pages with embeddings are required
- Check with `GET_STATS` that `indexedPages > 0`
- If `indexedPages = 0` but `totalPages > 0`: the embedding worker likely failed during indexing (check the service worker console)
