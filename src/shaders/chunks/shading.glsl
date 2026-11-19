uniform bool receiveShadow;

#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

vec3 ambientLight(vec3 normal) {
  vec3 skyFill = uSkyZenith * 1.5 + uSkyHorizon * 0.22 + 0.03;
  vec3 groundFill = uSkyHorizon * 0.24 + uSkyZenith * 0.2 + 0.012;
  float hemisphere = normal.y * 0.5 + 0.5;
  return mix(groundFill, skyFill, hemisphere) * mix(0.22, 1.0, daylightFactor());
}

float sunShadow() {
  return getShadowMask();
}
