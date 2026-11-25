import type { Mount } from './characterFlight';

let current: Mount | null = null;
const listeners = new Set<() => void>();

export function publishFlightStatus(mount: Mount | null): void {
  if (mount === current) return;
  current = mount;
  queueMicrotask(() => {
    for (const listener of listeners) listener();
  });
}

export function subscribeFlightStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readFlightStatus(): Mount | null {
  return current;
}
