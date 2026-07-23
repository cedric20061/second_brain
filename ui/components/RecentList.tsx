// ui/components/RecentList.tsx
import { clusterColor } from '../styles/clusterColors';
import type { RecentPage } from '../../storage/pagesRepository';

interface RecentListProps {
  pages: RecentPage[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function RecentList({ pages, loading, hasMore, onLoadMore }: RecentListProps) {
  if (!loading && pages.length === 0) {
    return (
      <div style={s.empty}>
        <p style={s.emptyTitle}>Aucune page récente</p>
        <p style={s.emptyHint}>Les pages capturées apparaîtront ici.</p>
      </div>
    );
  }

  // Groupe par jour
  const groups = groupByDay(pages);

  return (
    <div style={s.scroll}>
      {groups.map(({ label, items }) => (
        <div key={label}>
          <div style={s.dayLabel}>{label}</div>
          {items.map((page) => (
            <RecentRow key={page.id} page={page} />
          ))}
        </div>
      ))}

      {hasMore && (
        <div style={s.loadMore}>
          <button style={s.loadMoreBtn} onClick={onLoadMore} disabled={loading}>
            {loading ? 'Chargement…' : 'Voir plus'}
          </button>
        </div>
      )}
    </div>
  );
}

function RecentRow({ page }: { page: RecentPage }) {
  const domain = new URL(page.url).hostname.replace('www.', '');
  const time = new Date(page.capturedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <a
      href={page.url}
      target="_blank"
      rel="noreferrer"
      style={s.row}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Pastille cluster */}
      <div style={{ ...s.dot, background: clusterColor(page.clusterId) }} />

      <div style={s.rowBody}>
        <p style={s.rowTitle}>{page.title}</p>
        <div style={s.rowMeta}>
          <span style={s.rowDomain}>{domain}</span>
          <span style={s.rowTime}>{time}</span>
        </div>
      </div>
    </a>
  );
}

function groupByDay(pages: RecentPage[]) {
  const groups: { label: string; items: RecentPage[] }[] = [];
  const map = new Map<string, RecentPage[]>();

  for (const page of pages) {
    const key = dayLabel(page.capturedAt);
    if (!map.has(key)) { map.set(key, []); groups.push({ label: key, items: map.get(key)! }); }
    map.get(key)!.push(page);
  }
  return groups;
}

function dayLabel(timestamp: number): string {
  const d = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(d, today)) return "Aujourd'hui";
  if (isSameDay(d, yesterday)) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

const s: Record<string, React.CSSProperties> = {
  scroll: { overflowY: 'auto', flex: 1 },
  dayLabel: {
    fontSize: 10, color: 'var(--text-muted)', padding: '10px 14px 4px',
    position: 'sticky', top: 0, background: 'var(--bg-base)', zIndex: 1,
    letterSpacing: '0.04em',
  },
  row: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '8px 14px', textDecoration: 'none', color: 'inherit',
    borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s',
  },
  dot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 5 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontSize: 12, color: 'var(--text-primary)', fontWeight: 500,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    marginBottom: 2,
  },
  rowMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  rowDomain: { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  rowTime: { fontSize: 10, color: 'var(--text-muted)' },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '60%', padding: 32, textAlign: 'center',
  },
  emptyTitle: { fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 },
  emptyHint: { fontSize: 12, color: 'var(--text-muted)' },
  loadMore: { display: 'flex', justifyContent: 'center', padding: 16 },
  loadMoreBtn: {
    background: 'none', border: '1px solid var(--border)',
    color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
    padding: '5px 14px', borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-ui)',
  },
};