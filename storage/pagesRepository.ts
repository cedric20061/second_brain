// storage/pagesRepository.ts
import { getDb, query } from './db';
import type { ExtractedPage, StoredPage } from '../core/types';
import type { Keyword } from '../core/indexing/keywords';

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