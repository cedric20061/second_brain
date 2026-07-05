// ui/hooks/useRecent.ts
import { useState, useEffect, useCallback } from 'react';
import { sendMessage } from '../../messaging/messageTypes';
import type { RecentPage } from '../../storage/pagesRepository';

const PAGE_SIZE = 50;

export function useRecent(active: boolean) {
  const [pages, setPages] = useState<RecentPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const res = await sendMessage({
      type: 'GET_RECENT',
      payload: { limit: PAGE_SIZE, offset: pages.length },
    });
    if (res.type === 'RECENT_DATA') {
      setPages((prev) => [...prev, ...res.pages]);
      setHasMore(res.pages.length === PAGE_SIZE);
    }
    setLoading(false);
  }, [loading, hasMore, pages.length]);

  useEffect(() => {
    if (active && pages.length === 0) loadMore();
  }, [active]);

  return { pages, loading, hasMore, loadMore };
}