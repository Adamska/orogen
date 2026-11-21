'use client';

import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useWorldStore } from '@/store/useWorldStore';
import { AtmosphereRig } from './AtmosphereRig';
import { BiomeScatter } from './BiomeScatter';
import { PostProcessingStack } from './PostProcessingStack';
import { TerrainWorld } from './TerrainWorld';
import { useTerrainSurface } from './useTerrainSurface';
import { frameStats } from './frameStats';
import { stepWorld, syncWorldTargets } from './worldRuntime';

const ORBIT_TARGET: [number, number, number] = [0, 58, 0];

export function WorldScene() {
  const surface = useTerrainSurface();
  const autoOrbit = useWorldStore((state) => state.autoOrbit);
  const info = useThree((state) => state.gl.info);

  useEffect(() => {
    syncWorldTargets(useWorldStore.getState().world);
    return useWorldStore.subscribe((state, previous) => {
      if (state.world !== previous.world) syncWorldTargets(state.world);
    });
  }, []);

  useFrame((_, delta) => {
    frameStats.frameCount += 1;
    frameStats.triangles = info.render.triangles;
    frameStats.drawCalls = info.render.calls;
    info.reset();
    stepWorld(delta);
  }, -1);

  return (
    <>
      <AtmosphereRig />
      <TerrainWorld surface={surface} />
      <BiomeScatter field={surface.field} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        autoRotate={autoOrbit}
        autoRotateSpeed={0.32}
        minDistance={220}
        maxDistance={1500}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI * 0.478}
        target={ORBIT_TARGET}
      />
      <PostProcessingStack />
    </>
  );
}
