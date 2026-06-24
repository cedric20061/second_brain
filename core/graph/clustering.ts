// core/graph/clustering.ts
import { kmeans } from 'ml-kmeans';
import { getGraphData, saveClusterIds } from '../../storage/graphRepository';

export async function runClustering(limit = 300): Promise<Map<number, number>> {
  const pages = await getGraphData(limit);

  if (pages.length < 5) {
    console.warn('[Clustering] Pas assez de pages pour clusteriser');
    return new Map();
  }

  // k = √(n/2), borné entre 3 et 15
  const k = Math.min(15, Math.max(3, Math.round(Math.sqrt(pages.length / 2))));
  const matrix = pages.map((p) => p.embedding);

  console.log(`[Clustering] ${pages.length} pages → ${k} clusters`);

  const result = kmeans(matrix, k, {
    initialization: 'kmeans++',
    maxIterations: 150,
    tolerance: 1e-6,
  });

  const assignments = new Map<number, number>();
  pages.forEach((page, i) => {
    assignments.set(page.id, result.clusters[i]);
  });

  await saveClusterIds(assignments);
  console.log('[Clustering] Cluster IDs sauvegardés');

  return assignments;
}