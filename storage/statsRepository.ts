// storage/statsRepository.ts
import { getDb } from './db';

export interface DashboardStats {
  totalPages: number;
  totalSites: number;
  indexedPages: number;   // pages avec embedding
  pagesPerDay: Array<{ date: string; count: number }>;
  topDomains: Array<{ domain: string; count: number }>;
  clusterDistribution: Array<{ clusterId: number; count: number; color: string }>;
}

export async function getStats(): Promise<DashboardStats> {
  const db = await getDb();

  const [totals, perDay, domains, clusters] = await Promise.all([
    // Totaux
    db.query<{ total: number; indexed: number; sites: number }>(`
      SELECT
        (SELECT count(*)::int FROM pages) AS total,
        (SELECT count(*)::int FROM page_embeddings) AS indexed,
        (SELECT count(DISTINCT regexp_replace(url, '^https?://(?:www\\.)?([^/?#]+).*', '\\1'))::int
         FROM pages) AS sites
    `),

    // Pages par jour (14 derniers jours)
    db.query<{ date: string; count: number }>(`
      SELECT
        to_char(date_trunc('day', captured_at), 'YYYY-MM-DD') AS date,
        count(*)::int AS count
      FROM pages
      WHERE captured_at >= now() - interval '14 days'
      GROUP BY date_trunc('day', captured_at)
      ORDER BY date_trunc('day', captured_at)
    `),

    // Top 8 domaines
    db.query<{ domain: string; count: number }>(`
      SELECT
        regexp_replace(url, '^https?://(?:www\\.)?([^/?#]+).*', '\\1') AS domain,
        count(*)::int AS count
      FROM pages
      GROUP BY domain
      ORDER BY count DESC
      LIMIT 8
    `),

    // Distribution des clusters
    db.query<{ cluster_id: number; count: number }>(`
      SELECT cluster_id, count(*)::int AS count
      FROM pages
      WHERE cluster_id IS NOT NULL
      GROUP BY cluster_id
      ORDER BY count DESC
      LIMIT 10
    `),
  ]);

  const { CLUSTER_COLORS } = await import('../ui/styles/clusterColors');

  return {
    totalPages: totals.rows[0].total,
    totalSites: totals.rows[0].sites,
    indexedPages: totals.rows[0].indexed,
    pagesPerDay: perDay.rows,
    topDomains: domains.rows,
    clusterDistribution: clusters.rows.map((r) => ({
      clusterId: r.cluster_id,
      count: r.count,
      color: CLUSTER_COLORS[r.cluster_id % CLUSTER_COLORS.length],
    })),
  };
}