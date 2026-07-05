// storage/pagesRepository.ts
import { getDb, query } from './db';
import type { ExtractedPage, StoredPage } from '../core/types';
import type { Keyword } from '../core/indexing/keywords';

export interface RecentPage {
  id: number;
  url: string;
  title: string;
  excerpt: string | null;
  clusterId: number | null;
  capturedAt: number;
}

export async function savePage(page: ExtractedPage): Promise<StoredPage> {
  const db = await getDb();

  // ON CONFLICT : si l'URL existe déjà, on met à jour (le contenu a pu changer)
  const result = await db.query<StoredPage>(
    `INSERT INTO pages (url, title, text_content, excerpt, site_name, byline, lang, captured_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8 / 1000.0))
     ON CONFLICT (url) DO UPDATE SET
       title = EXCLUDED.title,
       text_content = EXCLUDED.text_content,
       excerpt = EXCLUDED.excerpt,
       captured_at = EXCLUDED.captured_at
     RETURNING id, url, title, text_content AS "textContent", excerpt,
               site_name AS "siteName", byline, lang,
               extract(epoch from captured_at) * 1000 AS "capturedAt"`,
    [
      page.url,
      page.title,
      page.textContent,
      page.excerpt,
      page.siteName,
      page.byline,
      page.lang,
      page.capturedAt,
    ]
  );

  const pages = await query("SELECT * FROM pages");

  console.log(result);

  return result.rows[0];
}

export async function getPageByUrl(url: string): Promise<StoredPage | null> {
  const db = await getDb();
  const result = await db.query<StoredPage>(
    `SELECT id, url, title, text_content AS "textContent", excerpt,
            site_name AS "siteName", byline, lang,
            extract(epoch from captured_at) * 1000 AS "capturedAt"
     FROM pages WHERE url = $1`,
    [url]
  );
  return result.rows[0] ?? null;
}

export async function countPages(): Promise<number> {
  const db = await getDb();
  const result = await db.query<{ count: number }>(`SELECT count(*)::int FROM pages`);
  return result.rows[0].count;
}

export async function saveKeywords(pageId: number, keywords: Keyword[]): Promise<void> {
  const db = await getDb();
  await db.query(`UPDATE pages SET keywords = $1 WHERE id = $2`, [
    JSON.stringify(keywords),
    pageId,
  ]);
}

export async function getRecentPages(limit = 50, offset = 0): Promise<RecentPage[]> {
  const db = await getDb();
  const result = await db.query<{
    id: number; url: string; title: string;
    excerpt: string | null; cluster_id: number | null; captured_at: number;
  }>(
    `SELECT id, url, title, excerpt, cluster_id,
            extract(epoch from captured_at) * 1000 AS captured_at
     FROM pages
     ORDER BY captured_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows.map((r) => ({
    id: r.id, url: r.url, title: r.title,
    excerpt: r.excerpt, clusterId: r.cluster_id, capturedAt: r.captured_at,
  }));
}