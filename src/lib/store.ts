import { useEffect, useState } from 'react';
import { CHALLENGES } from './curriculum';
import type { MasteryLevel, ProgressState } from './types';

const KEY = 'gittrainer-progress-v1';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fresh(): ProgressState {
  return {
    completed: {},
    conceptStats: {},
    streakDays: 0,
    lastVisit: '',
    minutes: 0,
    diagnosticDone: false,
    diagnosticLevel: 'Sin diagnosticar',
    startedAt: new Date().toISOString(),
  };
}

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    return { ...fresh(), ...(JSON.parse(raw) as ProgressState) };
  } catch {
    return fresh();
  }
}

export function masteryLevel(correct: number, total: number): MasteryLevel {
  if (total === 0) return 'Nuevo';
  const rate = correct / total;
  if (correct >= 4 && rate >= 0.8) return 'Dominado';
  if (correct >= 2 && rate >= 0.6) return 'Familiar';
  return 'Practicando';
}

export function useProgress() {
  const [state, setState] = useState<ProgressState>(load);

  // racha + persistencia
  useEffect(() => {
    setState((prev) => {
      const t = today();
      if (prev.lastVisit === t) return prev;
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const streak = prev.lastVisit === yesterday ? prev.streakDays + 1 : prev.lastVisit === '' ? 1 : 1;
      const next = { ...prev, lastVisit: t, streakDays: streak };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const recordAttempt = (challengeId: string, concept: string, solved: boolean, hintsUsed: number) => {
    setState((prev) => {
      const prevRec = prev.completed[challengeId] ?? { attempts: 0, hintsUsed: 0, solved: false, bestAttempts: 99 };
      const attempts = prevRec.attempts + 1;
      const rec = {
        attempts,
        hintsUsed: Math.max(prevRec.hintsUsed, hintsUsed),
        solved: prevRec.solved || solved,
        bestAttempts: solved ? Math.min(prevRec.bestAttempts, attempts) : prevRec.bestAttempts,
      };
      const cs = prev.conceptStats[concept] ?? { correct: 0, total: 0 };
      const conceptStats = {
        ...prev.conceptStats,
        [concept]: { correct: cs.correct + (solved ? 1 : 0), total: cs.total + 1 },
      };
      return { ...prev, completed: { ...prev.completed, [challengeId]: rec }, conceptStats };
    });
  };

  const solvedCount = Object.values(state.completed).filter((r) => r.solved).length;
  const totalCount = CHALLENGES.length;
  const pct = Math.round((solvedCount / totalCount) * 100);
  const dominated = Object.entries(state.conceptStats).filter(([ , s]) => masteryLevel(s.correct, s.total) === 'Dominado').length;

  const resetAll = () => {
    const f = fresh();
    f.lastVisit = today();
    f.streakDays = 1;
    setState(f);
  };

  return { state, setState, recordAttempt, solvedCount, totalCount, pct, dominated, resetAll };
}

export type ProgressApi = ReturnType<typeof useProgress>;
