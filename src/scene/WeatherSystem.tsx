'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, ShaderMaterial, Sphere, Vector3, type Points } from 'three';
import { mulberry32 } from '@/engine/random';
import { precipitationShader } from '@/shaders';
import { useQualityProfile } from '@/store/useQualityStore';
import { worldUniforms } from './worldUniforms';

const PARTICLE_CAPACITY = 42000;
const MIN_VISIBLE_INTENSITY = 0.005;

function createSeedGeometry(salt: number): BufferGeometry {
  const random = mulberry32(salt);
  const seeds = new Float32Array(PARTICLE_CAPACITY * 4);
  for (let index = 0; index < seeds.length; index += 1) seeds[index] = random();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(PARTICLE_CAPACITY * 3), 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 4));
  geometry.boundingSphere = new Sphere(new Vector3(), Infinity);
  return geometry;
}

function createPrecipitationMaterial(snow: boolean): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: precipitationShader.vertex,
    fragmentShader: precipitationShader.fragment,
    uniforms: { ...worldUniforms, uIntensity: { value: 0 }, uPointScale: { value: 1 } },
    defines: snow ? { SNOWFLAKES: '' } : {},
    transparent: true,
    depthWrite: false,
  });
}

export function WeatherSystem() {
  const rainRef = useRef<Points>(null);
  const snowRef = useRef<Points>(null);
  const { foliageScale } = useQualityProfile();
  const assets = useMemo(
    () => ({
      rainGeometry: createSeedGeometry(911),
      snowGeometry: createSeedGeometry(1777),
      rainMaterial: createPrecipitationMaterial(false),
      snowMaterial: createPrecipitationMaterial(true),
    }),
    [],
  );

  useEffect(
    () => () => {
      for (const asset of Object.values(assets)) asset.dispose();
    },
    [assets],
  );

  useFrame(({ gl }) => {
    const pointScale = gl.getPixelRatio();
    const layers = [
      [rainRef.current, assets.rainMaterial, worldUniforms.uRain.value],
      [snowRef.current, assets.snowMaterial, worldUniforms.uSnowfall.value],
    ] as const;
    for (const [points, material, amount] of layers) {
      if (!points) continue;
      points.visible = amount > MIN_VISIBLE_INTENSITY;
      material.uniforms.uIntensity.value = amount * (0.4 + foliageScale * 0.6);
      material.uniforms.uPointScale.value = pointScale;
    }
  });

  return (
    <>
      <points ref={rainRef} geometry={assets.rainGeometry} material={assets.rainMaterial} frustumCulled={false} renderOrder={20} />
      <points ref={snowRef} geometry={assets.snowGeometry} material={assets.snowMaterial} frustumCulled={false} renderOrder={20} />
    </>
  );
}
