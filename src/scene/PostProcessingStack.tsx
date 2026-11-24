'use client';

import { useFrame } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, GodRays, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, KernelSize, ToneMappingMode } from 'postprocessing';
import { useRef, type RefObject } from 'react';
import { HalfFloatType, type Mesh, type MeshBasicMaterial } from 'three';
import { QUALITY_PROFILES, useQualityStore } from '@/store/useQualityStore';
import { useWorldStore } from '@/store/useWorldStore';
import { ORBIT_TARGET } from './orbitRig';
import { worldUniforms } from './worldUniforms';

const BEACON_DISTANCE = 7000;
const BEACON_RADIUS = 120;

function SunBeacon({ beaconRef }: { beaconRef: RefObject<Mesh | null> }) {
  useFrame(() => {
    const beacon = beaconRef.current;
    if (!beacon) return;
    const direction = worldUniforms.uSunDirection.value;
    beacon.position.copy(direction).multiplyScalar(BEACON_DISTANCE);
    beacon.visible = direction.y > -0.02;
    (beacon.material as MeshBasicMaterial).color.copy(worldUniforms.uSunColor.value).multiplyScalar(1.4);
  });

  return (
    <mesh ref={beaconRef} frustumCulled={false}>
      <sphereGeometry args={[BEACON_RADIUS, 24, 12]} />
      <meshBasicMaterial transparent depthWrite={false} toneMapped={false} fog={false} />
    </mesh>
  );
}

export function PostProcessingStack() {
  const multisampling = useQualityStore((state) => QUALITY_PROFILES[state.baseline].multisampling);
  const photoMode = useWorldStore((state) => state.photoMode);
  const beaconRef = useRef<Mesh>(null);

  return (
    <>
      <SunBeacon beaconRef={beaconRef} />
      <EffectComposer multisampling={multisampling} frameBufferType={HalfFloatType}>
        <>
          {photoMode && (
            <GodRays
              sun={beaconRef as RefObject<Mesh>}
              blendFunction={BlendFunction.SCREEN}
              samples={60}
              density={0.94}
              decay={0.93}
              weight={0.32}
              exposure={0.5}
              clampMax={1}
              kernelSize={KernelSize.SMALL}
              blur
            />
          )}
          {photoMode && <DepthOfField target={ORBIT_TARGET} worldFocusRange={520} bokehScale={3.2} />}
          <Bloom mipmapBlur luminanceThreshold={1.05} luminanceSmoothing={0.18} intensity={0.5} radius={0.66} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette offset={0.26} darkness={photoMode ? 0.72 : 0.62} />
        </>
      </EffectComposer>
    </>
  );
}
