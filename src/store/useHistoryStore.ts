import { create } from 'zustand';
import type { WorldConfig } from '@/engine/worldConfig';
import { encodeWorldLink } from './worldLink';

export interface HistoryEntry {
  readonly id: string;
  readonly seed: number;
  readonly world: WorldConfig;
  readonly thumbnail: string;
}

interface StoredEntry {
  readonly link: string;
  readonly thumbnail: string;
}

interface HistoryStore {
  entries: readonly HistoryEntry[];
  hydrate: () => Promise<void>;
  record: (entry: Omit<HistoryEntry, 'id'>) => void;
}

const STORAGE_KEY = 'orogen.history.v1';
const HISTORY_LIMIT = 8;

const entryId = (seed: number, world: WorldConfig) => `${seed}:${world.name}`;

function persist(entries: readonly HistoryEntry[]): void {
  try {
    const stored: StoredEntry[] = entries.map(({ seed, world, thumbnail }) => ({
      link: encodeWorldLink({ seed, world }),
      thumbnail,
    }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    return;
  }
}

async function restore(): Promise<HistoryEntry[]> {
  try {
    const { decodeWorldLink } = await import('./worldLinkDecoder');
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const stored: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(stored)) return [];
    return stored.flatMap((item: Partial<StoredEntry>) => {
      const link = typeof item.link === 'string' ? decodeWorldLink(item.link) : null;
      if (link === null || typeof item.thumbnail !== 'string' || !item.thumbnail.startsWith('data:image/')) return [];
      return [{ ...link, id: entryId(link.seed, link.world), thumbnail: item.thumbnail }];
    });
  } catch {
    return [];
  }
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  entries: [],
  hydrate: async () => set({ entries: await restore() }),
  record: (entry) => {
    const id = entryId(entry.seed, entry.world);
    const entries = [{ ...entry, id }, ...get().entries.filter((item) => item.id !== id)].slice(0, HISTORY_LIMIT);
    set({ entries });
    persist(entries);
  },
}));
