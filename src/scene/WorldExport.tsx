'use client';

import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { ElevationField } from '@/engine/elevationField';
import { useWorldStore } from '@/store/useWorldStore';
import { downloadWorldFile } from './downloadFile';

export function WorldExport({ field }: { field: ElevationField }) {
  const getThree = useThree((state) => state.get);
  const current = useRef(field);

  useEffect(() => {
    current.current = field;
  }, [field]);

  useEffect(
    () =>
      useWorldStore.subscribe((state, previous) => {
        if (state.exportToken === previous.exportToken) return;
        const { world, seed, setExporting } = state;
        import('@/export/exportWorld')
          .then(({ exportWorld }) => exportWorld(getThree().gl, current.current, { name: world.name, seed }))
          .then((blob) => downloadWorldFile(blob, 'glb'))
          .catch(() => undefined)
          .finally(() => setExporting(false));
      }),
    [getThree],
  );

  return null;
}
