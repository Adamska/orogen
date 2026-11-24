#include <common>
#include <shadowmap_pars_vertex>
#include <orogen_field>
#include <orogen_noise>

attribute float aCanopy;

uniform float uTime;
uniform float uFoliageScale;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vShade;

void main() {
  vec2 anchor = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
  float ground = sampleField(anchor).r;
  vec2 variation = vec2(hash21(anchor * 0.37 + 11.3), hash21(anchor * 0.71 - 4.9));
  float presence = smoothstep(0.25, 1.0, uFoliageScale);
  #ifdef SCATTER_SWAY
    presence *= smoothstep(1.0, 4.5, (ground - uWaterLevel) * uAmplitude);
  #endif

  vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position * presence, 1.0);
  worldPosition.y += ground * uAmplitude;

  #ifdef SCATTER_SWAY
    float phase = uTime * 1.35 + variation.x * 6.283 + worldPosition.x * 0.031 +
      worldPosition.z * 0.023;
    float gust = sin(phase) + sin(phase * 2.3 + 1.7) * 0.4;
    worldPosition.xz += vec2(0.8, 0.45) * gust * position.y * position.y * 0.34 * presence;
  #endif

  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vShade = vec3(aCanopy, variation.y, position.y);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;

  #if defined(USE_SHADOWMAP) && !defined(DEPTH_PASS)
    vec3 shadowNormal = vNormal;
  #endif
  #include <orogen_shadow_vertex>
}
