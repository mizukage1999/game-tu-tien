import { useEffect } from 'react';
import { EventBus } from '../game/EventBus';
import { useAccount } from '../net/session';
import { openRankedArena } from '../net/socialBridge';
import { rankedAction, rankedStore, resetRanked } from '../net/ranked';
import { socialStore } from '../store/socialStore';
import { gameStore } from '../store/gameStore';
import { activityAction, activityStore } from '../net/worldActivities';
export function CompetitiveWatcher() {
  const user = useAccount().user?.id;
  useEffect(() => {
    resetRanked();
    activityStore.setState({ synced: false, error: '', offset: 0, winner: null });
    if (!user) return;
    let alive = true,
      polling = false,
      opening: string | null = null;
    const submitted = new Set<string>();
    const reports = new Map<string, string | null>();
    let leaving = false;
    const poll = async () => {
      if (polling || !rankedStore.getState().searching) return;
      polling = true;
      try {
        const report = reports.entries().next().value as [string, string | null] | undefined;
        const page = leaving
          ? await rankedAction('leave')
          : report
            ? await rankedAction('report', { id: report[0], winner: report[1] })
            : await rankedAction('poll');
        if (page) {
          if (report) reports.delete(report[0]);
          if (leaving) leaving = false;
        }
        if (!alive || !page) return;
        const current = socialStore.getState().duel,
          result = page.result;
        if (
          result &&
          current?.rankedId === result.id &&
          (!result.winner || [current.a.userId, current.b.userId].includes(result.winner))
        ) {
          submitted.add(result.id);
          reports.delete(result.id);
          const winner = result.status === 'finished' ? result.winner : null;
          if (current.snapshot.phase !== 'finished' || current.snapshot.winner !== winner) {
            socialStore
              .getState()
              .setDuel({
                ...current,
                snapshot: {
                  ...current.snapshot,
                  phase: 'finished',
                  winner,
                  reason:
                    result.status === 'expired'
                      ? 'Trận đã hết thời gian xác nhận.'
                      : result.status === 'disputed'
                        ? 'Kết quả hai bên chưa thống nhất.'
                        : 'Kết quả đã được server xác nhận.',
                },
              });
          }
        }
        if (!page.match) return;
        if (!socialStore.getState().duel && opening !== page.match.id) {
          if (openRankedArena(page.match)) {
            opening = page.match.id;
            void rankedAction('ready', { id: page.match.id });
          } else {
            await rankedAction('leave');
            gameStore
              .getState()
              .toast('Không thể vào tỷ võ lúc này. Hãy hoàn thành hoạt động đang diễn ra.', 'warn');
          }
        }
      } finally {
        polling = false;
      }
    };
    const unsubscribe = socialStore.subscribe((s) => {
      const d = s.duel;
      if (!d?.rankedId || d.snapshot.phase !== 'finished' || submitted.has(d.rankedId)) return;
      submitted.add(d.rankedId);
      reports.set(d.rankedId, d.snapshot.winner);
      void poll();
    });
    const leave = EventBus.on('ranked:leave', () => {
      leaving = true;
      void poll();
    });
    const timer = setInterval(() => void poll(), 2000);
    const sync = () => {
      if (!document.hidden) void activityAction('treasure');
    };
    sync();
    const clock = setInterval(sync, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
      clearInterval(clock);
      unsubscribe();
      leave();
      resetRanked();
    };
  }, [user]);
  return null;
}
