'use client';

import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { HalfFloatType } from 'three';

export function PostProcessingStack() {
  return (
    <EffectComposer multisampling={4} frameBufferType={HalfFloatType}>
      <Bloom
        mipmapBlur
        luminanceThreshold={1.05}
        luminanceSmoothing={0.18}
        intensity={0.5}
        radius={0.66}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.26} darkness={0.62} />
    </EffectComposer>
  );
}
