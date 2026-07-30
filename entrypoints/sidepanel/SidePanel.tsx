// entrypoints/sidepanel/SidePanel.tsx
import '../../ui/styles/tokens.css';
import { useState, useCallback } from 'react';
import { useSearch } from '../../ui/hooks/useSearch';
import { useStats } from '../../ui/hooks/useStats';
import { useRecent } from '../../ui/hooks/useRecent';
import { SearchBar } from '../../ui/components/SearchBar';
import { ResultCard } from '../../ui/components/ResultCard';
import { EmptyState } from '../../ui/components/EmptyState';
import { GraphView } from '../../ui/components/GraphView';
import { Dashboard } from '../../ui/components/Dashboard';
import { RecentList } from '../../ui/components/RecentList';
import { sendMessage } from '../../messaging/messageTypes';
import type { SerializedGraph } from '../../core/graph/buildGraph';

type Tab = 'search' | 'recent' | 'graph' | 'stats';

export default function SidePanel() {
  const [tab, setTab] = useState<Tab>('search');
  const { query, results, loading: searchLoading, error, search, clear } = useSearch();
  const { stats, loading: statsLoading, refresh: refreshStats } = useStats(tab === 'stats');
  const { pages, loading: recentLoading, hasMore, loadMore } = useRecent(tab === 'recent');
  const [graphData, setGraphData] = useState<SerializedGraph | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);

  const handleBuildGraph = useCallback(async () => {
    setGraphLoading(true);
    const res = await sendMessage({ type: 'BUILD_GRAPH', payload: { limit: 300 } });
    setGraphLoading(false);
    if (res.type === 'GRAPH_DATA') setGraphData(res.graph);
  }, []);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'search', label: 'Recherche' },
    { id: 'recent', label: 'Récents' },
    { id: 'graph',  label: 'Graphe' },
    { id: 'stats',  label: 'Stats' },
  ];

  return (
    <div style={s.shell}>
      <div style={s.header}>
        <span style={s.logo}>◎ Second Brain</span>
        <nav style={s.tabs}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                ...s.tabBtn,
                color: tab === id ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'search' && (
        <>
          <div style={s.searchBox}>
            <SearchBar value={query} onChange={search} onClear={clear} loading={searchLoading} autoFocus />
            {results.length > 0 && (
              <p style={s.count}>{results.length} résultat{results.length > 1 ? 's' : ''}</p>
            )}
          </div>
          <div style={s.scroll}>
            {error && <div style={s.error}>{error}</div>}
            {!error && results.length === 0 && <EmptyState query={query} />}
            {results.map((r) => <ResultCard key={r.id} result={r} query={query} />)}
          </div>
        </>
      )}

      {tab === 'recent' && (
        <RecentList
          pages={pages}
          loading={recentLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      )}

      {tab === 'graph' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <GraphView data={graphData} loading={graphLoading} onBuild={handleBuildGraph} />
        </div>
      )}

      {tab === 'stats' && (
        <Dashboard stats={stats} loading={statsLoading} onRefresh={refreshStats} />
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex', flexDirection: 'column',
    height: '100vh', background: 'var(--bg-base)', overflow: 'hidden',
  },
  header: { padding: '12px 14px 0', borderBottom: '1px solid var(--border)' },
  logo: { fontSize: 12, color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: 10 },
  tabs: { display: 'flex', gap: 2 },
  tabBtn: {
    background: 'none', border: 'none', padding: '6px 8px',
    fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-ui)',
    transition: 'color 0.1s, border-color 0.1s',
  },
  searchBox: { padding: '10px 12px 6px', borderBottom: '1px solid var(--border)' },
  count: { fontSize: 11, color: 'var(--text-muted)', marginTop: 6, paddingLeft: 2 },
  scroll: { flex: 1, overflowY: 'auto' },
  error: {
    margin: 12, padding: '8px 12px',
    background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
    borderRadius: 'var(--radius-sm)', color: 'var(--error)', fontSize: 12,
  },
};