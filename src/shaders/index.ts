import atmosphereChunk from './chunks/atmosphere.glsl';
import fieldChunk from './chunks/field.glsl';
import noiseChunk from './chunks/noise.glsl';
import shadingChunk from './chunks/shading.glsl';
import shadowVertexChunk from './chunks/shadow_vertex.glsl';
import depthFrag from './depth.frag';
import scatterFrag from './scatter.frag';
import scatterVert from './scatter.vert';
import skyFrag from './sky.frag';
import skyVert from './sky.vert';
import terrainFrag from './terrain.frag';
import terrainVert from './terrain.vert';
import waterFrag from './water.frag';
import waterVert from './water.vert';

const CHUNKS: Readonly<Record<string, string>> = {
  atmosphere: atmosphereChunk,
  field: fieldChunk,
  noise: noiseChunk,
  shading: shadingChunk,
  shadow_vertex: shadowVertexChunk,
};

const INCLUDE_PATTERN = /^[ \t]*#include <orogen_(\w+)>/gm;

function resolveIncludes(source: string): string {
  return source.replace(INCLUDE_PATTERN, (directive, name: string) => {
    const chunk = CHUNKS[name];
    if (chunk === undefined) throw new Error(`Unknown shader chunk: ${directive.trim()}`);
    return chunk;
  });
}

export const skyShader = {
  vertex: resolveIncludes(skyVert),
  fragment: resolveIncludes(skyFrag),
} as const;

export const terrainShader = {
  vertex: resolveIncludes(terrainVert),
  fragment: resolveIncludes(terrainFrag),
} as const;

export const waterShader = {
  vertex: resolveIncludes(waterVert),
  fragment: resolveIncludes(waterFrag),
} as const;

export const scatterShader = {
  vertex: resolveIncludes(scatterVert),
  fragment: resolveIncludes(scatterFrag),
} as const;

export const depthFragment = depthFrag;
