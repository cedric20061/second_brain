// ui/components/ResultCard.tsx
import type { SearchResult } from '../../core/types';

interface ResultCardProps {
  result: SearchResult;
  query: string;
}

export function ResultCard({ result, query }: ResultCardProps) {
  const domain = new URL(result.url).hostname.replace('www.', '');
  const ago = formatAgo(result.capturedAt);
  const scorePercent = Math.round(result.score * 100);

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noreferrer"
      style={styles.card}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Ligne titre + score */}
      <div style={styles.header}>
        <span style={styles.title}>{highlight(result.title, query)}</span>
        <span style={styles.score} title="Score de pertinence">
          {scorePercent}
        </span>
      </div>

      {/* URL */}
      <span style={styles.url}>{domain}</span>

      {/* Extrait */}
      {result.excerpt && (
        <p style={styles.excerpt}>{result.excerpt.slice(0, 120)}…</p>
      )}

      {/* Footer : date + mots-clés matchés */}
      <div style={styles.footer}>
        <span style={styles.meta}>{ago}</span>
        {result.matchedTerms && result.matchedTerms.length > 0 && (
          <div style={styles.terms}>
            {result.matchedTerms.slice(0, 4).map((t) => (
              <span key={t} style={styles.term}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

// Surligne les termes de la requête dans le titre
function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const terms = query.trim().split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return text;

  const regex = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} style={styles.mark}>{part}</mark>
    ) : (
      part
    )
  );
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 2) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  if (h < 24) return `il y a ${h}h`;
  if (d < 7) return `il y a ${d}j`;
  return new Date(timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'block',
    padding: '10px 14px',
    textDecoration: 'none',
    color: 'inherit',
    borderBottom: '1px solid var(--border-subtle)',
    transition: 'background 0.1s',
    cursor: 'pointer',
    background: 'transparent',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 2,
  },
  title: {
    color: 'var(--text-primary)',
    fontSize: 13,
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  score: {
    fontSize: 10,
    color: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
    background: 'var(--accent-dim)',
    padding: '1px 5px',
    borderRadius: 3,
    flexShrink: 0,
  },
  url: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    display: 'block',
    marginBottom: 4,
  },
  excerpt: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    marginBottom: 6,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  } as React.CSSProperties,
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  meta: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  terms: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  term: {
    fontSize: 10,
    background: 'var(--amber-dim)',
    color: 'var(--amber)',
    padding: '1px 5px',
    borderRadius: 3,
    fontFamily: 'var(--font-mono)',
  },
  mark: {
    background: 'var(--accent-dim)',
    color: 'var(--accent)',
    borderRadius: 2,
    padding: '0 1px',
  },
};