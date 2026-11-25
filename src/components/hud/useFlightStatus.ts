import { useSyncExternalStore } from 'react';
import type { Mount } from '@/scene/characterFlight';
import { readFlightStatus, subscribeFlightStatus } from '@/scene/flightStatus';

export function useFlightStatus(): Mount | null {
  return useSyncExternalStore(subscribeFlightStatus, readFlightStatus, () => null);
}
