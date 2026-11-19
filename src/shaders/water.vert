#include <common>
#include <shadowmap_pars_vertex>
#include <orogen_field>

uniform float uTime;

varying vec3 vWorldPosition;

float swell(vec2 planar) {
  return sin(dot(planar, vec2(0.021, 0.013)) + uTime * 0.55) * 0.5 +
    sin(dot(planar, vec2(-0.012, 0.027)) + uTime * 0.43) * 0.32 +
    sin(dot(planar, vec2(0.034, -0.019)) + uTime * 0.71) * 0.18;
}

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  float range = length(worldPosition.xz - cameraPosition.xz);
  float calm = 1.0 - smoothstep(700.0, 2600.0, range);
  worldPosition.y = uWaterLevel * uAmplitude + swell(worldPosition.xz) * 0.42 * calm;
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;

  #if defined(USE_SHADOWMAP) && !defined(DEPTH_PASS)
    vec3 shadowNormal = vec3(0.0, 1.0, 0.0);
  #endif
  #include <orogen_shadow_vertex>
}
