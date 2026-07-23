// ui/components/SearchBar.tsx
import { useRef, useEffect } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (q: string) => void;
  onClear: () => void;
  loading: boolean;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChange, onClear, loading, autoFocus }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div style={styles.wrapper}>
      <span style={styles.icon}>
        {loading ? <Spinner /> : <SearchIcon />}
      </span>

      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher dans ta mémoire…"
        style={styles.input}
        spellCheck={false}
      />

      {value && (
        <button onClick={onClear} style={styles.clear} title="Effacer">
          ✕
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    transition: 'border-color 0.15s',
  },
  icon: {
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: 14,
    fontFamily: 'var(--font-ui)',
    padding: '10px 0',
  },
  clear: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 11,
    padding: 4,
    borderRadius: 'var(--radius-sm)',
    lineHeight: 1,
  },
};

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398l3.85 3.85a1 1 0 0 0 1.415-1.415l-3.868-3.833zm-5.242 1.156a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="var(--border)" strokeWidth="1.5"/>
      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="0.7s" repeatCount="indefinite"/>
      </path>
    </svg>
  );
}