// ui/components/EmptyState.tsx
interface EmptyStateProps {
  query: string;
  totalPages?: number;
}

export function EmptyState({ query, totalPages }: EmptyStateProps) {
  if (!query) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.icon}>◎</div>
        <p style={styles.title}>
          {totalPages ? `${totalPages} pages en mémoire` : 'Mémoire vide'}
        </p>
        <p style={styles.sub}>
          Navigue normalement — les pages sont capturées automatiquement.
        </p>
      </div>
    );
  }
  return (
    <div style={styles.wrapper}>
      <div style={styles.icon}>∅</div>
      <p style={styles.title}>Aucun résultat pour « {query} »</p>
      <p style={styles.sub}>Essaie des termes différents ou plus généraux.</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '40px 20px',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  icon: { fontSize: 28, marginBottom: 4, opacity: 0.4 },
  title: { fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 },
  sub: { fontSize: 12, lineHeight: 1.6, maxWidth: 220 },
};