'use client';

import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { MOUSE } from 'three';
import { useWorldStore } from '@/store/useWorldStore';
import { AdaptiveQuality } from './AdaptiveQuality';
import { AtmosphereRig } from './AtmosphereRig';
import { BiomeScatter } from './BiomeScatter';
import { CinematicDirector } from './CinematicDirector';
import { FlightControls } from './FlightControls';
import { HistoryCapture } from './HistoryCapture';
import { PhotoCapture } from './PhotoCapture';
import { SculptTool } from './SculptTool';
import { PostProcessingStack } from './PostProcessingStack';
import { TerrainWorld } from './TerrainWorld';
import { useSceneReady } from './useSceneReady';
import { useTerrainSurface } from './useTerrainSurface';
import { WalkMode } from './WalkMode';
import { WeatherSystem } from './WeatherSystem';
import { frameStats } from './frameStats';
import { ORBIT_TARGET } from './orbitRig';
import { beginDayCycle, endDayCycle } from './dayCycle';
import { stepWorld, syncWorldTargets, worldRuntime } from './worldRuntime';

const ORBIT_BUTTONS = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
const SCULPT_BUTTONS = { MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE };

export function WorldScene({ onReady }: { onReady?: () => void }) {
  const surface = useTerrainSurface();
  useSceneReady(surface !== null, onReady);
  const autoOrbit = useWorldStore((state) => state.autoOrbit);
  const photoMode = useWorldStore((state) => state.photoMode);
  const flightMode = useWorldStore((state) => state.flightMode);
  const walkMode = useWorldStore((state) => state.walkMode);
  const piloted = flightMode || walkMode;
  const sculpting = useWorldStore((state) => state.sculptMode !== 'off');
  const info = useThree((state) => state.gl.info);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      useWorldStore.getState().setAutoOrbit(false);
    }
  }, []);

  useEffect(() => {
    syncWorldTargets(useWorldStore.getState().world);
    return useWorldStore.subscribe((state, previous) => {
      if (state.world !== previous.world) syncWorldTargets(state.world);
      if (state.timeLapse !== previous.timeLapse) {
        if (state.timeLapse) {
          beginDayCycle({ elevation: worldRuntime.sunElevation, azimuth: worldRuntime.sunAzimuth });
        } else {
          endDayCycle();
        }
      }
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
      <AdaptiveQuality />
      <AtmosphereRig />
      {surface && <TerrainWorld surface={surface} />}
      {surface && <BiomeScatter field={surface.field} />}
      <OrbitControls
        makeDefault
        enabled={!piloted}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        autoRotate={autoOrbit && !photoMode && !sculpting}
        mouseButtons={sculpting ? SCULPT_BUTTONS : ORBIT_BUTTONS}
        autoRotateSpeed={0.32}
        minDistance={220}
        maxDistance={1500}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI * 0.478}
        target={ORBIT_TARGET}
      />
      <WeatherSystem />
      {flightMode && surface && <FlightControls field={surface.field} />}
      {walkMode && surface && <WalkMode surface={surface} />}
      {sculpting && surface && <SculptTool surface={surface} />}
      <CinematicDirector enabled={!piloted} />
      <HistoryCapture />
      <PhotoCapture />
      <PostProcessingStack />
    </>
  );
}
