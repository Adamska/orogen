#include <common>
#include <packing>
#include <orogen_atmosphere>
#include <orogen_shading>

uniform vec3 uGrassColor;
uniform vec3 uRockColor;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vShade;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 view = normalize(cameraPosition - vWorldPosition);
  float shadow = sunShadow();

  #ifdef SCATTER_SWAY
    vec3 canopy = mix(uGrassColor * vec3(0.4, 0.5, 0.42), uGrassColor * vec3(0.72, 0.9, 0.5), vShade.y);
    canopy *= mix(0.5, 1.15, vShade.z);
    vec3 albedo = mix(vec3(0.13, 0.09, 0.065), canopy, vShade.x);
    normal = normalize(mix(normal, vec3(0.0, 1.0, 0.0), 0.3));
    float diffuse = clamp((dot(normal, uLightDirection) + 0.35) / 1.35, 0.0, 1.0);
    float backlight = pow(max(dot(view, -uLightDirection), 0.0), 3.0) * vShade.x * 0.35;
    float occlusion = mix(0.45, 1.0, vShade.z);
  #else
    vec3 albedo = uRockColor * mix(0.62, 1.12, vShade.y) * mix(0.8, 1.05, vShade.z + 0.5);
    float diffuse = max(dot(normal, uLightDirection), 0.0);
    float backlight = 0.0;
    float occlusion = mix(0.55, 1.0, normal.y * 0.5 + 0.5);
  #endif

  vec3 lit = albedo *
    (uLightColor * (diffuse + backlight) * shadow + ambientLight(normal) * occlusion);
  gl_FragColor = vec4(applyAtmosphere(lit, vWorldPosition), 1.0);
}
