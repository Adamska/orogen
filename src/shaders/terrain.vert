#include <common>
#include <shadowmap_pars_vertex>
#include <orogen_field>

attribute float aFromElevation;

varying vec3 vWorldPosition;

void main() {
  float elevation = mix(aFromElevation, position.y, uMorph);
  vec4 worldPosition =
    modelMatrix * vec4(position.x, elevation * uAmplitude, position.z, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;

  #if defined(USE_SHADOWMAP) && !defined(DEPTH_PASS)
    vec3 shadowNormal = fieldNormal(sampleField(worldPosition.xz));
  #endif
  #include <orogen_shadow_vertex>
}
