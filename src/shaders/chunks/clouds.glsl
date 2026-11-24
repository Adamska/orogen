uniform float uCloudCover;
uniform float uCloudSteps;

const float CLOUD_BASE = 1500.0;
const float CLOUD_TOP = 2400.0;
const int MAX_CLOUD_STEPS = 16;
const float MAX_CLOUD_SPAN = 2600.0;
const float CLOUD_FADE_START = 9000.0;
const float CLOUD_FADE_END = 26000.0;

float cloudDensity(vec3 point) {
  vec2 drift = vec2(uTime * 2.4, uTime * 0.9);
  float shape = fbmDerivative((point.xz + drift) * 0.00042).x;
  float detail = valueNoise((point.xz - drift * 1.6) * 0.0031 + point.y * 0.0016);
  float height = clamp((point.y - CLOUD_BASE) / (CLOUD_TOP - CLOUD_BASE), 0.0, 1.0);
  float profile = smoothstep(0.0, 0.12, height) * (1.0 - smoothstep(0.3, 1.0, height));
  float coverage = shape + detail * 0.22 - mix(0.92, 0.3, uCloudCover);
  return clamp((coverage - height * 0.28) * profile * 4.0, 0.0, 1.0);
}

vec4 raymarchClouds(vec3 direction, vec3 ambient) {
  if (direction.y < 0.015 || cameraPosition.y > CLOUD_BASE) return vec4(0.0, 0.0, 0.0, 1.0);
  float entry = (CLOUD_BASE - cameraPosition.y) / direction.y;
  float exit = (CLOUD_TOP - cameraPosition.y) / direction.y;
  float span = min(exit - entry, MAX_CLOUD_SPAN);
  float stride = span / uCloudSteps;
  float jitter = 0.5 + (hash21(gl_FragCoord.xy) - 0.5) * 0.3;
  float phase = mix(0.6, 1.8, henyeyGreenstein(dot(direction, uSunDirection), 0.55) * 4.0);

  vec3 scattered = vec3(0.0);
  float transmittance = 1.0;
  for (int index = 0; index < MAX_CLOUD_STEPS; index++) {
    if (float(index) >= uCloudSteps || transmittance < 0.04) break;
    vec3 point = cameraPosition + direction * (entry + (float(index) + jitter) * stride);
    float density = cloudDensity(point);
    if (density < 0.005) continue;
    float occlusion = cloudDensity(point + uSunDirection * 140.0) + cloudDensity(point + uSunDirection * 380.0) * 0.6;
    float sunlit = exp(-occlusion * 2.4) * (1.0 - exp(-density * 4.0));
    vec3 radiance = uSunColor * sunlit * phase * 1.3 + ambient * mix(0.55, 1.0, point.y / CLOUD_TOP);
    float absorbed = exp(-density * stride * 0.011);
    scattered += transmittance * (1.0 - absorbed) * radiance;
    transmittance *= absorbed;
  }

  float fade = smoothstep(0.015, 0.11, direction.y) *
    (1.0 - smoothstep(CLOUD_FADE_START, CLOUD_FADE_END, entry));
  return vec4(scattered * fade, mix(1.0, transmittance, fade));
}
