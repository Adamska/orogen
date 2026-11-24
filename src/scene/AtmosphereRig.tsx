'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BackSide, ShaderMaterial, type DirectionalLight, type HemisphereLight } from 'three';
import { useQualityProfile } from '@/store/useQualityStore';
import { TERRAIN_SIZE } from '@/engine/worldConfig';
import { skyShader } from '@/shaders';
import { worldUniforms } from './worldUniforms';

const SUN_DISTANCE = 1800;
const SHADOW_EXTENT = TERRAIN_SIZE * 0.74;

export function AtmosphereRig() {
  const sunRef = useRef<DirectionalLight>(null);
  const fillRef = useRef<HemisphereLight>(null);
  const { shadowMapSize } = useQualityProfile();

  useEffect(() => {
    const shadow = sunRef.current?.shadow;
    if (!shadow || shadow.mapSize.x === shadowMapSize) return;
    shadow.mapSize.set(shadowMapSize, shadowMapSize);
    shadow.map?.dispose();
    shadow.map = null;
  }, [shadowMapSize]);

  const skyMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyShader.vertex,
        fragmentShader: skyShader.fragment,
        uniforms: { ...worldUniforms },
        side: BackSide,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => () => skyMaterial.dispose(), [skyMaterial]);

  useFrame(() => {
    const sun = sunRef.current;
    const fill = fillRef.current;
    if (!sun || !fill) return;

    const radiance = worldUniforms.uLightColor.value;
    const intensity = Math.max(radiance.r, radiance.g, radiance.b);
    sun.position.copy(worldUniforms.uLightDirection.value).multiplyScalar(SUN_DISTANCE);
    sun.intensity = intensity;
    if (intensity > 1e-4) sun.color.copy(radiance).multiplyScalar(1 / intensity);
    sun.castShadow = intensity > 1e-3;

    fill.color.copy(worldUniforms.uSkyZenith.value);
    fill.groundColor.copy(worldUniforms.uSkyHorizon.value);
  });

  return (
    <>
      <mesh material={skyMaterial} frustumCulled={false} renderOrder={10}>
        <icosahedronGeometry args={[1, 5]} />
      </mesh>
      <hemisphereLight ref={fillRef} intensity={0.6} />
      <directionalLight
        ref={sunRef}
        castShadow
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-bias={-0.0006}
        shadow-normalBias={1.6}
        shadow-radius={3.5}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-SHADOW_EXTENT, SHADOW_EXTENT, SHADOW_EXTENT, -SHADOW_EXTENT, 100, SUN_DISTANCE * 2]}
        />
      </directionalLight>
    </>
  );
}
