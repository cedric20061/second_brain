// core/graph/buildGraph.ts
import Graph from 'graphology';
import { getGraphData } from '../../storage/graphRepository';

export interface SerializedGraph {
  nodes: Array<{
    id: string;
    label: string;
    url: string;
    cluster: number;
    degree: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
  }>;
}

interface NodeAttributes {
  label: string;
  url: string;
  cluster: number;
}

const SIMILARITY_THRESHOLD = 0.65; // en dessous → pas d'arête
const TOP_K_NEIGHBORS = 5;          // au plus 5 voisins par page

export async function buildKnowledgeGraph(limit = 300): Promise<SerializedGraph | null> {
  const pages = await getGraphData(limit);
  if (pages.length < 3) return null;

  const graph = new Graph({ type: 'undirected', multi: false });

  // Ajout des noeuds
  for (const page of pages) {
    graph.addNode(String(page.id), {
      label: page.title.slice(0, 50),
      url: page.url,
      cluster: page.clusterId ?? 0,
    });
  }

  // Calcul des arêtes par similarité cosine
  // Les embeddings MiniLM sont normalisés → dot product = cosine similarity
  for (let i = 0; i < pages.length; i++) {
    const source = pages[i];
    const neighbors: { pageId: number; score: number }[] = [];

    for (let j = 0; j < pages.length; j++) {
      if (i === j) continue;
      const score = dotProduct(source.embedding, pages[j].embedding);
      if (score > SIMILARITY_THRESHOLD) {
        neighbors.push({ pageId: pages[j].id, score });
      }
    }

    // Garde uniquement les TOP_K les plus similaires
    neighbors
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K_NEIGHBORS)
      .forEach(({ pageId, score }) => {
        const src = String(source.id);
        const tgt = String(pageId);
        if (!graph.hasEdge(src, tgt)) {
          graph.addEdge(src, tgt, { weight: Math.round(score * 100) / 100 });
        }
      });
  }

  // Sérialisation vers le format attendu par GraphView
  return {
    nodes: graph.nodes().map((id) => {
      const attrs = graph.getNodeAttributes(id) as NodeAttributes;

      return {
        id,
        label: attrs.label,
        url: attrs.url,
        cluster: attrs.cluster,
        degree: graph.degree(id),
      };
    }),

    edges: graph.edges().map((edge) => ({
      source: graph.source(edge),
      target: graph.target(edge),
      weight: graph.getEdgeAttribute(edge, 'weight'),
    })),
  };
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}