import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'orogen.onboarded.v1';
const listeners = new Set<() => void>();

function readOnboarded(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFirstVisit(): readonly [boolean, () => void] {
  const onboarded = useSyncExternalStore(subscribe, readOnboarded, () => true);
  const complete = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      return;
    } finally {
      for (const listener of listeners) listener();
    }
  }, []);
  return [!onboarded, complete] as const;
}
