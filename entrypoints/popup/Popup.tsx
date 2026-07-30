// entrypoints/popup/Popup.tsx
import '../../ui/styles/tokens.css';
import { useSearch } from '../../ui/hooks/useSearch';
import { SearchBar } from '../../ui/components/SearchBar';
import { ResultCard } from '../../ui/components/ResultCard';
import { EmptyState } from '../../ui/components/EmptyState';

export default function Popup() {
  const { query, results, loading, error, search, clear } = useSearch();

  return (
    <div style={styles.shell}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.logo}>◎ Second Brain</span>
        <button
          style={styles.openPanel}
          onClick={() => browser.sidePanel.open({ windowId: browser.windows.WINDOW_ID_CURRENT })}
          title="Ouvrir l'explorateur"
        >
          ⊞
        </button>
      </div>

      {/* Search */}
      <div style={styles.searchWrapper}>
        <SearchBar
          value={query}
          onChange={search}
          onClear={clear}
          loading={loading}
          autoFocus
        />
      </div>

      {/* Results */}
      <div style={styles.results}>
        {error && <div style={styles.error}>{error}</div>}

        {!error && results.length === 0 && (
          <EmptyState query={query} />
        )}

        {results.map((r) => (
          <ResultCard key={r.id} result={r} query={query} />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    width: 400,
    maxHeight: 560,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-base)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px 6px',
    borderBottom: '1px solid var(--border)',
  },
  logo: {
    fontSize: 12,
    color: 'var(--accent)',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  openPanel: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 16,
    padding: 4,
    borderRadius: 'var(--radius-sm)',
    lineHeight: 1,
  },
  searchWrapper: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--border)',
  },
  results: {
    flex: 1,
    overflowY: 'auto',
  },
  error: {
    margin: 12,
    padding: '8px 12px',
    background: 'rgba(248, 81, 73, 0.1)',
    border: '1px solid rgba(248, 81, 73, 0.3)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--error)',
    fontSize: 12,
  },
};