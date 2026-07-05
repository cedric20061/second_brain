// ui/hooks/useStats.ts
import { useState, useEffect } from 'react';
import { sendMessage } from '../../messaging/messageTypes';
import type { DashboardStats } from '../../storage/statsRepository';

export function useStats(active: boolean) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || stats) return; // charge une seule fois tant que l'onglet est actif
    setLoading(true);
    sendMessage({ type: 'GET_STATS' }).then((res) => {
      if (res.type === 'STATS_DATA') setStats(res.stats);
      setLoading(false);
    });
  }, [active]);

  const refresh = () => {
    setStats(null); // force un rechargement au prochain rendu
  };

  return { stats, loading, refresh };
}