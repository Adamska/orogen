#include <common>
#include <orogen_atmosphere>
#include <orogen_noise>

uniform float uTime;

#include <orogen_clouds>

varying vec3 vDirection;

float cirrus(vec3 direction) {
  vec2 sheet = direction.xz / (direction.y + 0.16);
  vec2 drift = vec2(uTime * 0.006, uTime * 0.002);
  float streaks = fbmDerivative(sheet * vec2(0.55, 1.7) + drift).x;
  float billow = fbmDerivative(sheet * 1.3 - drift * 1.6 + 7.3).x;
  float coverage = smoothstep(0.52 - uOvercast * 0.5, 0.8, streaks * 0.8 + billow * 0.5);
  return coverage * smoothstep(0.02, 0.16, direction.y);
}

float starField(vec3 direction) {
  vec3 point = direction * 190.0;
  vec3 cell = floor(point);
  float seed = hash21(cell.xy + cell.z * 17.31);
  vec3 jitter = vec3(hash21(cell.yz + 3.7), hash21(cell.zx + 9.1), seed) * 0.6 + 0.2;
  float distanceToStar = length(point - cell - jitter);
  float star = step(0.962, seed) * smoothstep(0.24, 0.0, distanceToStar);
  float twinkle = 0.65 + 0.35 * sin(uTime * (2.0 + seed * 3.0) + seed * 60.0);
  return star * twinkle * mix(0.8, 3.2, fract(seed * 91.7));
}

vec3 moonDisc(vec3 direction) {
  float alignment = dot(direction, uMoonDirection);
  float disc = smoothstep(0.99968, 0.99978, alignment);
  vec3 tangent = normalize(cross(uMoonDirection, vec3(0.0, 1.0, 0.0)));
  vec2 surface = vec2(dot(direction, tangent), dot(direction, cross(tangent, uMoonDirection))) * 2600.0;
  float maria = mix(0.72, 1.0, valueNoise(surface * 0.09 + 4.0));
  return vec3(0.92, 0.94, 1.0) * disc * maria * 2.4 * uNight;
}

void main() {
  vec3 direction = normalize(vDirection);
  vec3 color = skyRadiance(direction);

  float cloud = cirrus(direction);
  float forward = henyeyGreenstein(dot(direction, uSunDirection), 0.6);
  vec3 cloudColor =
    (uSkyHorizon * 0.55 + uSkyZenith * 0.25) * mix(0.06, 1.0, daylightFactor()) +
    uSunColor * (0.34 + forward * 1.8);
  color = mix(color, cloudColor, cloud * 0.7);

  vec3 cloudAmbient = (uSkyHorizon * 0.5 + uSkyZenith * 0.5) * mix(0.05, 0.9, daylightFactor());
  cloudAmbient = mix(cloudAmbient, vec3(dot(cloudAmbient, vec3(0.33))), 0.45) + vec3(0.01, 0.015, 0.03) * uNight;
  vec4 cumulus = raymarchClouds(direction, cloudAmbient);

  color += sunDisc(direction) * (1.0 - cloud * 0.6) * cumulus.a;
  float aboveHorizon = smoothstep(0.0, 0.12, direction.y);
  color += vec3(0.85, 0.9, 1.0) * starField(direction) * uNight * aboveHorizon * (1.0 - cloud);
  color += moonDisc(direction) * aboveHorizon * (1.0 - cloud * 0.8);
  color = color * cumulus.a + cumulus.rgb;
  color *= 1.0 + (hash21(gl_FragCoord.xy) - 0.5) * 0.018;
  gl_FragColor = vec4(color, 1.0);
}
