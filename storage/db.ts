// storage/db.ts
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';

let dbInstance: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

export async function getDb(): Promise<PGlite> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = initDb();
  dbInstance = await initPromise;
  return dbInstance;
}

async function initDb(): Promise<PGlite> {
  const db = await PGlite.create({
    dataDir: 'idb://second-brain-db', // persistance dans IndexedDB
    relaxedDurability: true,           // ne bloque pas chaque requête sur le flush disque
    extensions: { vector },
  });

  await runMigrations(db);
  return db;
}

const migrations = [
  () => import('./migrations/001_init.sql?raw'),
  () => import('./migrations/002_add_keywords.sql?raw'),
  () => import('./migrations/003_add_fts.sql?raw'),
  () => import('./migrations/004_add_clusters.sql?raw'), // ← nouveau
];

async function runMigrations(db: PGlite) {
  for (const load of migrations) {
    const mod = await load();
    await db.exec(mod.default);
  }
}

export async function query(sql: string) {
  const db = await getDb();
  const result = await db.query(sql);

  console.table(result.rows);

  return result.rows;
}