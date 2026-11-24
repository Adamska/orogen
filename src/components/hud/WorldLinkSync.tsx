'use client';

import { useEffect } from 'react';
import { useWorldStore } from '@/store/useWorldStore';
import { encodeWorldLink, hasWorldLink } from '@/store/worldLink';

const WRITE_DELAY_MS = 350;

export function currentWorldUrl(): string {
  const { seed, world } = useWorldStore.getState();
  const url = new URL(window.location.href);
  url.hash = encodeWorldLink({ seed, world });
  return url.toString();
}

export function WorldLinkSync() {
  useEffect(() => {
    const applyHash = async () => {
      const hash = window.location.hash;
      if (!hasWorldLink(hash)) return;
      const { decodeWorldLink } = await import('@/store/worldLinkDecoder');
      const link = decodeWorldLink(hash);
      if (link) useWorldStore.getState().loadShared(link);
    };
    void applyHash();

    let timer = 0;
    const unsubscribe = useWorldStore.subscribe((state, previous) => {
      if (state.world === previous.world && state.seed === previous.seed) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => window.history.replaceState(window.history.state, '', currentWorldUrl()),
        WRITE_DELAY_MS,
      );
    });
    window.addEventListener('hashchange', applyHash);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
      window.removeEventListener('hashchange', applyHash);
    };
  }, []);

  return null;
}
