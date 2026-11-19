#include <common>
#include <orogen_atmosphere>
#include <orogen_noise>

uniform float uTime;

varying vec3 vDirection;

float cirrus(vec3 direction) {
  vec2 sheet = direction.xz / (direction.y + 0.16);
  vec2 drift = vec2(uTime * 0.006, uTime * 0.002);
  float streaks = fbmDerivative(sheet * vec2(0.55, 1.7) + drift).x;
  float billow = fbmDerivative(sheet * 1.3 - drift * 1.6 + 7.3).x;
  float coverage = smoothstep(0.52, 0.8, streaks * 0.8 + billow * 0.5);
  return coverage * smoothstep(0.02, 0.16, direction.y);
}

void main() {
  vec3 direction = normalize(vDirection);
  vec3 color = skyRadiance(direction);

  float cloud = cirrus(direction);
  float forward = henyeyGreenstein(dot(direction, uSunDirection), 0.6);
  vec3 cloudColor =
    (uSkyHorizon * 0.55 + uSkyZenith * 0.25) * mix(0.25, 1.0, daylightFactor()) +
    uSunColor * (0.34 + forward * 1.8);
  color = mix(color, cloudColor, cloud * 0.7);

  color += sunDisc(direction) * (1.0 - cloud * 0.6);
  color *= 1.0 + (hash21(gl_FragCoord.xy) - 0.5) * 0.018;
  gl_FragColor = vec4(color, 1.0);
}
