import { ShaderMaterial, UniformsLib, UniformsUtils, type Side } from 'three';
import { depthFragment } from '@/shaders';
import { worldUniforms } from './worldUniforms';

interface ShaderSource {
  readonly vertex: string;
  readonly fragment: string;
}

interface WorldMaterialOptions {
  defines?: Record<string, string>;
  transparent?: boolean;
  side?: Side;
}

export function createLitMaterial(
  shader: ShaderSource,
  options: WorldMaterialOptions = {},
): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: shader.vertex,
    fragmentShader: shader.fragment,
    uniforms: { ...UniformsUtils.clone(UniformsLib.lights), ...worldUniforms },
    lights: true,
    ...options,
  });
}

export function createDepthMaterial(
  vertexShader: string,
  defines: Record<string, string> = {},
): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader: depthFragment,
    uniforms: { ...worldUniforms },
    defines: { ...defines, DEPTH_PASS: '' },
  });
}
