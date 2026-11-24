'use client';

import { useEffect } from 'react';
import { useWorldStore } from '@/store/useWorldStore';
import { GlassPanel } from './GlassPanel';
import { CameraIcon, CloseIcon } from './icons';

export function PhotoToolbar() {
  const setPhotoMode = useWorldStore((state) => state.setPhotoMode);
  const requestCapture = useWorldStore((state) => state.requestCapture);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPhotoMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setPhotoMode]);

  return (
    <GlassPanel className="flex items-center gap-2 rounded-full p-1.5 pl-4">
      <span className="hidden text-xs text-white/60 sm:inline">Drag to frame your shot</span>
      <button
        type="button"
        onClick={requestCapture}
        className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-slate-900 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-white/70"
      >
        <CameraIcon />
        Capture 4K
      </button>
      <button
        type="button"
        onClick={() => setPhotoMode(false)}
        aria-label="Exit photo mode"
        title="Exit photo mode"
        className="flex size-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-white/70"
      >
        <CloseIcon />
      </button>
    </GlassPanel>
  );
}
