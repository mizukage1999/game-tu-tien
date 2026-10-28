import { useEffect, useState } from 'react';
import type { RankingCategory } from '../game/systems/rankingUi';
import { fetchLeaderboard, leaderboardError, type LeaderboardPage } from '../net/leaderboard';
import { useAccount } from '../net/session';
import { EventBus } from '../game/EventBus';
import { flushCloudSave } from '../net/cloudSave';

export function useLeaderboard(category: RankingCategory, query: string, page: number) {
  const { user } = useAccount(),
    userId = user?.id;
  const [debounced, setDebounced] = useState(query);
  const [request, setRequest] = useState({ version: 0, save: false });
  const [result, setResult] = useState<{
    key: string;
    data?: LeaderboardPage;
    error?: string;
    loading: boolean;
  }>({ key: '', loading: true });
  const key = JSON.stringify([userId, category, query.trim(), page]);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(id);
  }, [query]);
  useEffect(() => {
    if (query !== debounced) return;
    const controller = new AbortController();
    let expired = false,
      cancelled = false;
    const timeout = window.setTimeout(() => {
      expired = true;
      controller.abort();
      setResult((old) => ({
        key,
        data: old.key === key ? old.data : undefined,
        error: leaderboardError(new Error('timeout')),
        loading: false,
      }));
    }, 12000);
    setResult((old) => ({ key, loading: true, data: old.key === key ? old.data : undefined }));
    void (async () => {
      try {
        if (request.save && userId) {
          EventBus.emit('cmd:save');
          await flushCloudSave(userId);
        }
        if (controller.signal.aborted) return;
        const data = await fetchLeaderboard(category, debounced, page, controller.signal);
        if (!cancelled && !controller.signal.aborted) setResult({ key, data, loading: false });
      } catch (error) {
        if (!cancelled && (!controller.signal.aborted || expired))
          setResult((old) => ({
            key,
            data: old.key === key ? old.data : undefined,
            error: leaderboardError(error),
            loading: false,
          }));
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
    // key includes raw query so a pending search hides stale rows immediately.
  }, [key, userId, category, page, query, debounced, request]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible')
        setRequest((old) => ({ version: old.version + 1, save: false }));
    };
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  const current = result.key === key;
  return {
    data: current ? result.data : undefined,
    error: current ? result.error : undefined,
    loading: !current || result.loading,
    refresh: () => setRequest((old) => ({ version: old.version + 1, save: true })),
    userId,
  };
}
