// ui/hooks/useSearch.ts
import { useState, useCallback, useRef } from 'react';
import { sendMessage } from '../../messaging/messageTypes';
import type { SearchResult } from '../../core/types';

interface SearchState {
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  query: string;
}

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    loading: false,
    error: null,
    query: '',
  });

  // Ref pour éviter les race conditions si l'utilisateur tape vite
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    setState((prev) => ({ ...prev, query }));

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim()) {
      setState((prev) => ({ ...prev, results: [], loading: false, error: null }));
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await sendMessage({ type: 'SEARCH', payload: { query, limit: 15 } });
        if (response.type === 'SEARCH_RESULTS') {
          setState((prev) => ({ ...prev, results: response.results, loading: false }));
        } else {
          setState((prev) => ({ ...prev, error: response.message, loading: false }));
        }
      } catch (err) {
        setState((prev) => ({ ...prev, error: 'Connexion au moteur impossible.', loading: false }));
      }
    }, 280); // debounce 280ms — assez réactif, pas trop de requêtes
  }, []);

  const clear = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setState({ results: [], loading: false, error: null, query: '' });
  }, []);

  return { ...state, search, clear };
}