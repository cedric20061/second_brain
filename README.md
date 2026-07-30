# ◎ Second Brain — Documentation technique

> Moteur de mémoire personnelle augmentée sous forme d'extension Chrome.
> 100 % local, zéro API cloud, zéro coût.

---

## Table des matières

1. [Concept & philosophie](#1-concept--philosophie)
2. [Stack technique](#2-stack-technique)
3. [Structure des fichiers](#3-structure-des-fichiers)
4. [Architecture & communication entre modules](#4-architecture--communication-entre-modules)
5. [Les trois pipelines en détail](#5-les-trois-pipelines-en-détail)
   - [Pipeline Capture](#51-pipeline-capture--la-base-de-tout)
   - [Pipeline Recherche](#52-pipeline-recherche)
   - [Pipeline Graphe](#53-pipeline-graphe)
6. [Rôle de chaque fichier](#6-rôle-de-chaque-fichier)
7. [Installation & lancement](#7-installation--lancement)
8. [Tester le projet](#8-tester-le-projet)
9. [Configuration & paramètres clés](#9-configuration--paramètres-clés)
10. [Dépannage fréquent](#10-dépannage-fréquent)

---

## 1. Concept & philosophie

Second Brain transforme ton navigateur en **moteur de mémoire personnelle** : chaque page que tu lis est automatiquement capturée, nettoyée, indexée, et rendue recherchable — sans jamais quitter ta machine.

**Aucune API externe.** Aucun Gemini, OpenAI, ou Claude. Tout tourne localement :
- Le modèle d'embeddings (`all-MiniLM-L6-v2`) est téléchargé une fois depuis HuggingFace puis mis en cache dans le navigateur.
- La base de données est un PostgreSQL embarqué (PGlite / WASM) persisté dans IndexedDB.
- La recherche vectorielle utilise un index HNSW stocké dans cette même base.

---

## 2. Stack technique

| Rôle | Technologie |
|---|---|
| Build & dev | **WXT** (framework extensions) + **Vite** |
| Langage | **TypeScript** |
| Base de données | **PGlite** (PostgreSQL en WASM) + extension **pgvector** |
| Extraction de contenu | **Readability.js** (Mozilla) + **DOMPurify** |
| Embeddings locaux | **Transformers.js** (`@huggingface/transformers`) |
| Modèle ML | `Xenova/all-MiniLM-L6-v2` quantizé q8 (384 dimensions) |
| Recherche vectorielle | Index **HNSW** via pgvector |
| Recherche textuelle | **Full-Text Search** PostgreSQL (`tsvector` + `GIN`) |
| Clustering | **ml-kmeans** (k-means++) |
| Graphe | **graphology** |
| Visualisation graphe | **Cytoscape.js** |
| Charts | **Recharts** |
| UI | **React** |

---

## 3. Structure des fichiers

```
second-brain/
│
├── wxt.config.ts              # Config WXT : manifest, permissions, CSP WASM
├── package.json
├── tsconfig.json
│
├── entrypoints/               # Points d'entrée Chrome (gérés par WXT)
│   ├── background.ts          # Service worker central — orchestrateur
│   ├── content.ts             # Injecté dans chaque page visitée
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── Popup.tsx          # Barre de recherche rapide (400px)
│   └── sidepanel/
│       ├── index.html
│       ├── main.tsx
│       └── SidePanel.tsx      # Interface principale (4 onglets)
│
├── core/                      # Logique métier pure — sans API Chrome
│   ├── types.ts               # Types partagés (ExtractedPage, StoredPage, SearchResult)
│   ├── extraction/
│   │   ├── extractContent.ts  # Wrapper Readability.js
│   │   └── sanitize.ts        # Nettoyage HTML (DOMPurify)
│   ├── indexing/
│   │   ├── keywords.ts        # Extraction TF + stopwords FR/EN
│   │   ├── embeddings.ts      # Wrapper Transformers.js (communication avec le Worker)
│   │   └── indexPage.ts       # Orchestrateur : keywords → embedding → sauvegarde
│   ├── search/
│   │   ├── keywordSearch.ts   # Recherche FTS PostgreSQL
│   │   ├── vectorSearch.ts    # Recherche cosine via pgvector
│   │   └── hybridSearch.ts    # Fusion des deux scores
│   └── graph/
│       ├── clustering.ts      # K-means sur les embeddings
│       └── buildGraph.ts      # Construction graphe + sérialisation Cytoscape
│
├── storage/                   # Seule couche qui touche la base de données
│   ├── db.ts                  # Singleton PGlite + gestion des migrations
│   ├── pagesRepository.ts     # CRUD pages (savePage, getRecentPages…)
│   ├── embeddingsRepository.ts # CRUD vecteurs (saveEmbedding, findSimilarPages)
│   ├── graphRepository.ts     # Lecture embeddings pour graphe, saveClusterIds
│   ├── statsRepository.ts     # Requêtes dashboard (totaux, activité, domaines)
│   └── migrations/
│       ├── 001_init.sql       # Tables pages + page_embeddings + index HNSW
│       ├── 002_add_keywords.sql # Colonne keywords JSONB
│       ├── 003_add_fts.sql    # Colonne tsvector + index GIN + trigger
│       └── 004_add_clusters.sql # Colonne cluster_id
│
├── messaging/
│   └── messageTypes.ts        # Contrat typé UI ↔ background (tous les types de messages)
│
├── workers/
│   └── embedding.worker.ts    # Web Worker dédié au calcul ML (ne bloque pas l'UI)
│
├── ui/
│   ├── styles/
│   │   ├── tokens.css         # Variables CSS (couleurs, typo, spacing)
│   │   └── clusterColors.ts   # Palette de couleurs par cluster
│   ├── hooks/
│   │   ├── useSearch.ts       # State + debounce pour la recherche
│   │   ├── useStats.ts        # Chargement paresseux des stats
│   │   └── useRecent.ts       # Pagination des pages récentes
│   └── components/
│       ├── SearchBar.tsx      # Input avec spinner et bouton clear
│       ├── ResultCard.tsx     # Carte de résultat avec surlignage
│       ├── EmptyState.tsx     # États vides contextuels
│       ├── RecentList.tsx     # Historique groupé par jour
│       ├── Dashboard.tsx      # Charts Recharts (activité, domaines, clusters)
│       └── GraphView.tsx      # Visualisation Cytoscape.js
│
└── public/
    ├── icons/
    └── wasm/                  # Fichiers .wasm d'onnxruntime-web (copiés au postinstall)
```

---

## 4. Architecture & communication entre modules

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                         NAVIGATEUR CHROME                       │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────────────────────────┐  │
│  │ Content      │    │         Background Service Worker     │  │
│  │ Script       │    │                                       │  │
│  │              │    │  ┌─────────┐   ┌──────────────────┐  │  │
│  │ Readability  │───▶│  │  core/  │   │    storage/      │  │  │
│  │ DOMPurify    │    │  │  search │◀─▶│  PGlite (WASM)   │  │  │
│  │              │    │  │  graph  │   │  pgvector (HNSW) │  │  │
│  │              │◀───│  │  index  │   └──────────────────┘  │  │
│  │ Widget sug.  │    │  └────▲────┘                          │  │
│  └──────────────┘    │       │ postMessage                   │  │
│                      │  ┌────┴──────────────┐                │  │
│  ┌──────────────┐    │  │  embedding.worker │                │  │
│  │   Popup      │    │  │  (Transformers.js)│                │  │
│  │  SearchBar   │    │  │  all-MiniLM-L6-v2 │                │  │
│  └──────┬───────┘    │  └───────────────────┘                │  │
│         │            └────────────▲─────────────────────────┘  │
│  ┌──────┴───────┐                 │ chrome.runtime.sendMessage  │
│  │  Side Panel  │─────────────────┘                            │
│  │  4 onglets   │                                              │
│  └──────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Règle fondamentale de communication

L'extension Chrome impose une séparation stricte entre les contextes. Les modules ne s'appellent **jamais directement** entre contextes différents :

| De | Vers | Mécanisme |
|---|---|---|
| Content script → Background | `chrome.runtime.sendMessage` |
| UI (Popup/SidePanel) → Background | `chrome.runtime.sendMessage` |
| Background → Content script | `chrome.tabs.sendMessage(tabId, …)` |
| Background → Embedding Worker | `worker.postMessage` / `worker.onmessage` |

Tous les types de messages sont centralisés dans `messaging/messageTypes.ts`. Ajouter un nouveau message = modifier uniquement ce fichier.

### Pourquoi `core/` est séparé de `storage/`

`core/` contient la logique pure : algorithmes d'extraction, de recherche, de clustering. Ces modules **n'importent jamais** `chrome.*` ni IndexedDB directement. Avantage : ils sont testables avec Vitest sans simuler un environnement d'extension.

`storage/` est la seule couche autorisée à parler à PGlite. Si demain PGlite est remplacé par Dexie ou SQLite WASM, seul ce dossier change.

---

## 5. Les trois pipelines en détail

### 5.1 Pipeline Capture — la base de tout

Déclenché automatiquement à chaque page visitée.

```
Page visitée par l'utilisateur
         │
         ▼
[content.ts] setTimeout 1500ms
  (laisse les SPA React/Vue finir leur rendu)
         │
         ▼ shouldSkip() → filtre login, chrome://, etc.
         │
         ▼
[extractContent.ts] Readability.js
  • clone du DOM (Readability mute le DOM !)
  • extraction : titre, texte propre, extrait, auteur, langue
  • si textContent < 200 chars → abandon
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
 (URL = clé unique)      │
                         └─▶ [embeddings.ts] → [embedding.worker.ts]
                                  all-MiniLM-L6-v2 (q8)
                                  text.slice(0, 2000) → vecteur 384d
                                       │
                                       ▼
                              [embeddingsRepository.ts]
                               saveEmbedding() → pgvector
                                       │
                                       ▼
                              [background.ts]
                               findSimilarPages(embedding, 4)
                               similarité > 0.65 et url ≠ page courante
                                       │
                                       ▼
                              chrome.tabs.sendMessage(tabId)
                              { type: 'SHOW_SUGGESTIONS', results }
                                       │
                                       ▼
                              [content.ts] injectSuggestionWidget()
                               Shadow DOM → widget flottant 8 secondes
```

**Points clés :**
- Le délai de 1500ms est un compromis pour les SPA. Ajuste si tu observes des captures vides sur des sites spécifiques.
- `ON CONFLICT (url) DO UPDATE` : revisiter une page met à jour son contenu, pas de doublon.
- L'embedding est retourné par `indexPage()` et réutilisé immédiatement pour les suggestions — pas de double calcul.

---

### 5.2 Pipeline Recherche

Déclenché quand l'utilisateur tape dans le popup ou le side panel.

```
Utilisateur tape une requête
         │
         ▼
[useSearch.ts] debounce 280ms
  (évite une requête à chaque frappe)
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
 → score FTS          filtre > 0.25
                      → score vectoriel
    │                    │
    └────────┬───────────┘
             ▼
    Fusion par page.id dans une Map
    score hybride = 0.6 × vectorScore + 0.4 × keywordScore
    (keywordScore normalisé par le max du batch)
             │
             ▼
    Tri par score DESC → slice(0, limit)
             │
             ▼
    { type: 'SEARCH_RESULTS', results: SearchResult[] }
             │
             ▼
[useSearch.ts] setState → re-render
[ResultCard.tsx] affichage avec surlignage des termes
```

**Pourquoi recherche hybride ?**
- La recherche vectorielle seule rate les termes techniques exacts ("JWT", "pgvector") — le modèle peut ne pas les connaître.
- La FTS seule rate les reformulations ("sécuriser une API" vs "authentification token").
- La combinaison des deux donne les meilleurs résultats en pratique.

---

### 5.3 Pipeline Graphe

Déclenché manuellement (bouton "Construire le graphe").

```
Utilisateur clique "Construire le graphe"
         │
         ▼
[SidePanel.tsx] handleBuildGraph()
sendMessage({ type: 'BUILD_GRAPH', payload: { limit: 300 } })
         │
         ▼
[background.ts] handleBuildGraph()
  Vérifie le cache en mémoire (TTL 10 min)
  Si cache valide → retourne directement
         │
    ┌────┴────────────────────────┐
    ▼                             ▼
[clustering.ts]           [buildGraph.ts]
 getGraphData(300)
  (pages récentes avec embedding)
         │
         ▼
 k = √(n/2) borné [3, 15]
 KMeans(embeddings, k, 'kmeans++')
 → cluster_id par page
         │
         ▼
 saveClusterIds() → UPDATE pages (batch unnest)
         │
         ▼
[buildGraph.ts]
 getGraphData(300)  ← récupère cluster_id mis à jour
         │
         ▼
 Pour chaque paire (i, j) :
   score = dotProduct(embedding_i, embedding_j)
   (dot product = cosine similarity car vecteurs normalisés)
   si score > 0.65 → candidat arête
   → garde top 5 voisins par page
         │
         ▼
 graphology Graph
   .addNode(id, { label, url, cluster, degree })
   .addEdge(src, tgt, { weight })
         │
         ▼
 Sérialisation → { nodes[], edges[] }
         │
         ▼
[background.ts] graphCache = { data, at: Date.now() }
{ type: 'GRAPH_DATA', graph }
         │
         ▼
[GraphView.tsx]
 cytoscape({ elements: nodes + edges })
 layout: 'cose' (physique, sans animation)
 nœuds colorés par cluster, taille ∝ degree
 clic → highlight des voisins directs
```

---

## 6. Rôle de chaque fichier

### `entrypoints/`

| Fichier | Rôle |
|---|---|
| `background.ts` | Cerveau de l'extension. Reçoit tous les messages, orchestre les appels à `core/` et `storage/`, maintient le cache du graphe. Tourne en tant que Service Worker MV3. |
| `content.ts` | Injecté dans chaque page. Extrait le contenu, envoie au background, affiche le widget de suggestions. N'a pas accès à `storage/`. |
| `popup/Popup.tsx` | Interface compacte (400px). Uniquement la recherche rapide + bouton d'ouverture du side panel. |
| `sidepanel/SidePanel.tsx` | Interface principale : 4 onglets (Recherche, Récents, Graphe, Stats). Orchestre tous les hooks. |

### `core/`

| Fichier | Rôle |
|---|---|
| `types.ts` | Source de vérité des types TypeScript. `ExtractedPage` → `StoredPage` → `SearchResult`. |
| `extraction/extractContent.ts` | Clone le DOM, passe à Readability, retourne `null` si le contenu est trop pauvre (< 200 chars). |
| `extraction/sanitize.ts` | Nettoie le HTML pour l'affichage (liste blanche de balises). Non utilisé pour l'indexation (qui travaille sur le texte brut). |
| `indexing/keywords.ts` | Tokenise, enlève les accents, filtre les stopwords FR/EN, retourne les N termes les plus fréquents. |
| `indexing/embeddings.ts` | Crée et maintient le Web Worker. Envoie les textes via `postMessage`, corrèle les réponses par UUID. Initialise le chemin WASM depuis `chrome.runtime.getURL`. |
| `indexing/indexPage.ts` | Orchestrateur : appelle keywords.ts + embeddings.ts + les deux repositories. Retourne l'embedding pour que le background puisse l'utiliser pour les suggestions sans recalcul. |
| `search/keywordSearch.ts` | Requête PostgreSQL FTS avec `websearch_to_tsquery` et `ts_rank_cd`. Normalise le score. |
| `search/vectorSearch.ts` | Génère un embedding pour la requête, appelle `findSimilarPages`, filtre les scores < 0.25. |
| `search/hybridSearch.ts` | Lance les deux recherches en parallèle (`Promise.all`), fusionne par `page.id`, calcule le score pondéré. |
| `graph/clustering.ts` | Charge les embeddings, calcule `k`, lance k-means++, sauvegarde les `cluster_id`. |
| `graph/buildGraph.ts` | Calcule les similarités pairwise en mémoire (dot product), construit le graphe graphology, sérialise pour Cytoscape. |

### `storage/`

| Fichier | Rôle |
|---|---|
| `db.ts` | Singleton PGlite avec `idb://second-brain-db`. `relaxedDurability: true` pour la perf. Lance les migrations dans l'ordre à chaque démarrage (idempotent grâce aux `IF NOT EXISTS`). |
| `pagesRepository.ts` | `savePage` (upsert sur URL), `getPageByUrl`, `countPages`, `getRecentPages` (pagination). |
| `embeddingsRepository.ts` | `saveEmbedding` (upsert), `findSimilarPages` (opérateur `<=>` pgvector, index HNSW). |
| `graphRepository.ts` | `getGraphData` (pages + embeddings pour le clustering), `saveClusterIds` (batch update via `unnest`). |
| `statsRepository.ts` | 4 requêtes parallèles : totaux, activité par jour, top domaines, distribution clusters. |
| `migrations/*.sql` | Exécutées dans l'ordre à chaque démarrage. Idempotentes (`IF NOT EXISTS`, `IF NOT NULL`). |

### `messaging/messageTypes.ts`

Contrat unique entre tous les modules. Toute la communication de l'extension passe par ce fichier.

```typescript
// Messages envoyés par l'UI → background
type ExtensionMessage =
  | { type: 'CAPTURE_PAGE'; payload: ExtractedPage }
  | { type: 'SEARCH';       payload: { query: string; limit?: number } }
  | { type: 'BUILD_GRAPH';  payload?: { limit?: number } }
  | { type: 'GET_STATS' }
  | { type: 'GET_RECENT';   payload: { limit: number; offset: number } };

// Message push background → content script (sens inverse)
type TabMessage =
  | { type: 'SHOW_SUGGESTIONS'; results: SearchResult[] };

// Réponses du background → UI
type ExtensionResponse =
  | { type: 'SEARCH_RESULTS'; results: SearchResult[] }
  | { type: 'GRAPH_DATA';     graph: SerializedGraph | null }
  | { type: 'STATS_DATA';     stats: DashboardStats }
  | { type: 'RECENT_DATA';    pages: RecentPage[] }
  | { type: 'ERROR';          message: string };
```

### `workers/embedding.worker.ts`

Isolé du thread principal pour ne jamais bloquer l'UI ni le service worker.

- Reçoit `{ type: 'INIT', wasmBaseUrl }` → configure le chemin WASM
- Reçoit `{ type: 'EMBED', id, text }` → génère l'embedding, répond avec `{ id, embedding }`
- Maintient le modèle en mémoire (singleton) → chargé une seule fois, réutilisé pour tous les textes

### `ui/`

| Fichier | Rôle |
|---|---|
| `styles/tokens.css` | Variables CSS globales. Modifie ici pour changer toute la palette. |
| `styles/clusterColors.ts` | Palette de 15 couleurs distinctes. Partagée entre GraphView et Dashboard. |
| `hooks/useSearch.ts` | Debounce 280ms, annule les requêtes périmées via `ref`, retourne `{ results, loading, error, query, search, clear }`. |
| `hooks/useStats.ts` | Charge les stats une seule fois quand l'onglet Stats devient actif. `refresh()` force un rechargement. |
| `hooks/useRecent.ts` | Pagination infinie (50 par page). Charge au premier affichage de l'onglet Récents. |
| `components/SearchBar.tsx` | Input contrôlé avec icône de recherche / spinner et bouton clear. |
| `components/ResultCard.tsx` | Affiche titre (avec surlignage regex), domaine, extrait, date relative, termes matchés (badges ambre). |
| `components/EmptyState.tsx` | Deux états : mémoire vide (premier lancement) ou aucun résultat pour la requête. |
| `components/RecentList.tsx` | Groupe les pages par jour (Aujourd'hui / Hier / date longue). Pastille colorée = cluster. Pagination "Voir plus". |
| `components/Dashboard.tsx` | AreaChart activité, BarChart horizontal domaines, barres de progression clusters. Recharts + CSS vars. |
| `components/GraphView.tsx` | Cytoscape.js dans un `useEffect`. Nœuds colorés par cluster, taille ∝ degree. Clic = highlight voisins + tooltip. Shadow DOM isolé. |

---

## 7. Installation & lancement

### Prérequis

- **Node.js** ≥ 18
- **Chrome** ≥ 114 (Side Panel API)

### Installation

```bash
# 1. Cloner le projet
git clone <repo-url>
cd second-brain

# 2. Installer les dépendances
npm install
# Le postinstall copie automatiquement les fichiers .wasm dans public/wasm/
```

### Développement (hot-reload)

```bash
npm run dev
```

WXT lance une instance Chrome avec l'extension déjà chargée et le hot-reload activé.
Chaque modification de fichier recharge automatiquement l'extension.

> **Important :** le premier lancement télécharge le modèle `all-MiniLM-L6-v2` (≈ 23 Mo quantizé q8) depuis HuggingFace. Ce téléchargement est mis en cache dans le navigateur — les lancements suivants sont instantanés.

### Build de production

```bash
npm run build
```

Génère le dossier `.output/chrome-mv3/` prêt à être soumis sur le Chrome Web Store ou chargé manuellement.

### Charger manuellement dans Chrome (sans npm run dev)

1. `npm run build`
2. Ouvrir `chrome://extensions`
3. Activer le **mode développeur** (coin supérieur droit)
4. Cliquer **"Charger l'extension non empaquetée"**
5. Sélectionner le dossier `.output/chrome-mv3/`

---

## 8. Tester le projet

### Test du pipeline de capture

1. Lance `npm run dev`
2. Visite un article de blog ou une documentation technique
3. Ouvre `chrome://extensions` → ton extension → **"Service worker"** (lien inspect)
4. Dans la console du service worker, tu dois voir :

```
[Second Brain] Page sauvegardée : "Titre de la page" (id=1)
[Second Brain] Page indexée (mots-clés + embedding)
```

5. Teste qu'une page pauvre en contenu (page de login, page 404) ne génère **aucun log**.

### Test de la recherche

Dans la console du service worker, tu peux envoyer une requête directement :

```javascript
chrome.runtime.sendMessage(
  { type: 'SEARCH', payload: { query: 'docker postgres', limit: 5 } },
  (response) => console.log(response)
);
```

Tu dois voir les résultats avec `score`, `vectorScore` et `keywordScore`.

### Test de la base de données

```javascript
// Dans la console du service worker
// Vérifie le nombre de pages capturées
const { PGlite } = await import(chrome.runtime.getURL('...'));
// Plus simple : envoie un message GET_STATS
chrome.runtime.sendMessage({ type: 'GET_STATS' }, (res) => console.log(res.stats));
```

### Test des suggestions

1. Capture 10+ pages sur un même sujet (ex : plusieurs articles sur Docker)
2. Visite une nouvelle page sur ce sujet
3. Un widget flottant doit apparaître en bas à droite avec les pages similaires déjà capturées

### Test du graphe

1. Capture au moins 10 pages variées
2. Ouvre le side panel → onglet **Graphe**
3. Clique "Construire le graphe"
4. Après quelques secondes, la constellation de pages doit apparaître

### Vérifier l'état de la base

```javascript
// Console du service worker
chrome.runtime.sendMessage({ type: 'GET_STATS' }, (r) => {
  console.log(`Pages : ${r.stats.totalPages}`);
  console.log(`Indexées : ${r.stats.indexedPages}`);
  console.log(`Sites : ${r.stats.totalSites}`);
});
```

---

## 9. Configuration & paramètres clés

Tous les paramètres ajustables sont regroupés ici avec leur impact.

### Capture

```typescript
// entrypoints/content.ts
setTimeout(capturePage, 1500);
// → Augmenter si des SPA (Notion, Linear…) donnent des captures vides
// → Diminuer pour une capture plus réactive
```

### Modèle d'embeddings

```typescript
// workers/embedding.worker.ts
pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' })
// dtype: 'q4' → plus léger, moins précis
// dtype: 'fp32' → plus précis, ~4x plus lourd
// Modèle alternatif : 'nomic-ai/nomic-embed-text-v1.5' (768d, meilleure qualité)
```

### Fenêtre de texte pour l'embedding

```typescript
// workers/embedding.worker.ts
text.slice(0, 2000)
// MiniLM gère ~256 tokens ≈ 1500-2000 caractères utiles
// Au-delà : le modèle tronque silencieusement
// Pour les très longs articles : implémenter du chunking (Phase future)
```

### Seuil de similarité pour les suggestions

```typescript
// entrypoints/background.ts
.filter((s) => s.url !== page.url && s.similarity > 0.65)
// Baisser (0.5) → plus de suggestions, moins précises
// Monter (0.8) → moins de suggestions, très précises
```

### Recherche hybride — pondération

```typescript
// core/search/hybridSearch.ts
const VECTOR_WEIGHT = 0.6;  // poids de la recherche sémantique
const KEYWORD_WEIGHT = 0.4; // poids de la recherche par mots-clés
// Si tes recherches sont très techniques (noms de lib, fonctions) → augmenter KEYWORD_WEIGHT
// Si tes recherches sont conceptuelles → augmenter VECTOR_WEIGHT
```

### Seuil de similarité pour le graphe

```typescript
// core/graph/buildGraph.ts
const SIMILARITY_THRESHOLD = 0.65;
const TOP_K_NEIGHBORS = 5;
// SIMILARITY_THRESHOLD trop haut → graphe fragmenté (îles isolées)
// SIMILARITY_THRESHOLD trop bas  → graphe trop dense, illisible
// TOP_K_NEIGHBORS → nombre max de connexions par page
```

### Cache du graphe

```typescript
// entrypoints/background.ts
const GRAPH_TTL = 10 * 60 * 1000; // 10 minutes
// Augmenter si le recalcul est trop fréquent
// Mettre à 0 pour recalculer à chaque ouverture de l'onglet (debug)
```

---

## 10. Dépannage fréquent

### Le widget de suggestions n'apparaît pas

- Vérifie que la page capturée a bien un embedding (log "Page indexée" dans la console du service worker)
- Vérifie que d'autres pages similaires existent en base (au moins 3-4 sur le même sujet)
- Le seuil de 0.65 est peut-être trop élevé pour ton corpus — essaie 0.50

### La recherche ne retourne rien

- La FTS ne fonctionne pas sur des pages sans `search_vector` → les pages capturées avant la migration 003 doivent être remises à jour : `UPDATE pages SET text_content = text_content` (déclenche le trigger)
- Vérifie que la page est bien indexée avec `GET_STATS`

### Le modèle ne se charge pas (erreur WASM)

- Vérifie que `public/wasm/` contient les fichiers `.wasm` (`npm run postinstall` pour les recopier)
- Vérifie la CSP dans `wxt.config.ts` : `'wasm-unsafe-eval'` doit être présent

### Le service worker est suspendu entre deux visites

Comportement normal avec MV3. Le service worker peut être tué par Chrome après quelques secondes d'inactivité. Au prochain message, il redémarre automatiquement. PGlite et le Web Worker sont re-initialisés via leurs singletons respectifs.

### PGlite ne persiste pas entre les sessions

Vérifie que `dataDir: 'idb://second-brain-db'` est bien présent dans `storage/db.ts`. Sans ce préfixe `idb://`, PGlite fonctionne en mémoire vive uniquement.

### Le graphe est vide après construction

- Il faut au minimum 5 pages avec embeddings
- Vérifie avec `GET_STATS` que `indexedPages > 0`
- Si `indexedPages = 0` mais `totalPages > 0` : l'embedding worker a peut-être échoué lors de l'indexation (voir console du service worker)
