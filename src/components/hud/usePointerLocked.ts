import { useSyncExternalStore } from 'react';

const subscribe = (notify: () => void) => {
  document.addEventListener('pointerlockchange', notify);
  return () => document.removeEventListener('pointerlockchange', notify);
};

export function usePointerLocked(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.pointerLockElement !== null,
    () => false,
  );
}
