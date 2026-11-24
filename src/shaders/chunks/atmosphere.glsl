uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform float uFogDensity;
uniform vec3 uMoonDirection;
uniform float uNight;

const float FOG_HEIGHT_FALLOFF = 0.011;
const float FOG_BASE_DENSITY = 0.0034;
const float HORIZON_FADE_START = 2600.0;
const float HORIZON_FADE_END = 7800.0;

float henyeyGreenstein(float cosTheta, float anisotropy) {
  float squared = anisotropy * anisotropy;
  return (1.0 - squared) / (12.566 * pow(1.0 + squared - 2.0 * anisotropy * cosTheta, 1.5));
}

float daylightFactor() {
  return smoothstep(-0.14, 0.03, uSunDirection.y);
}

vec3 skyGradient(vec3 direction) {
  float cosTheta = dot(direction, uSunDirection);
  float altitude = clamp(direction.y, 0.0, 1.0);
  float airMass = 1.0 / (altitude + 0.085);
  float haze = pow(clamp((1.0 - exp(-airMass * 0.16) - 0.137) / 0.711, 0.0, 1.0), 1.35);

  vec3 rayleigh = mix(uSkyZenith, uSkyHorizon, haze) * (0.8 + 0.2 * cosTheta * cosTheta);
  rayleigh *= mix(0.12, 1.0, daylightFactor());
  vec3 nightSky = mix(vec3(0.004, 0.008, 0.024), vec3(0.016, 0.026, 0.06), haze);
  return mix(rayleigh, nightSky, uNight * 0.9);
}

vec3 sunHalo(vec3 direction) {
  float cosTheta = dot(direction, uSunDirection);
  float altitude = clamp(direction.y, 0.0, 1.0);
  float haze = 1.0 - smoothstep(0.0, 0.55, altitude);
  float lowSun = 1.0 - smoothstep(0.0, 0.5, uSunDirection.y);
  float mie = henyeyGreenstein(cosTheta, 0.86) * 0.08 + henyeyGreenstein(cosTheta, 0.6) * 0.1;
  return uSunColor * mie * mix(0.4, 1.0, haze) * (1.0 + lowSun * 0.6);
}

vec3 moonGlow(vec3 direction) {
  float alignment = max(dot(direction, uMoonDirection), 0.0);
  return vec3(0.5, 0.6, 0.85) * (pow(alignment, 900.0) * 0.5 + pow(alignment, 40.0) * 0.05) * uNight;
}

vec3 skyRadiance(vec3 direction) {
  return skyGradient(direction) + sunHalo(direction) + moonGlow(direction);
}

vec3 sunDisc(vec3 direction) {
  float cosTheta = dot(direction, uSunDirection);
  float disc = smoothstep(0.99972, 0.99988, cosTheta);
  float limb = mix(0.6, 1.0, smoothstep(0.99972, 0.99998, cosTheta));
  return uSunColor * disc * limb * 9.0;
}

float fogAmount(vec3 direction, float range) {
  float slope = direction.y * FOG_HEIGHT_FALLOFF;
  float span = abs(slope) > 1e-5 ? (1.0 - exp(-range * slope)) / slope : range;
  float opticalDepth =
    uFogDensity * FOG_BASE_DENSITY * exp(-cameraPosition.y * FOG_HEIGHT_FALLOFF) * span;
  float fog = 1.0 - exp(-opticalDepth);
  return max(fog, smoothstep(HORIZON_FADE_START, HORIZON_FADE_END, range));
}

vec3 applyAtmosphere(vec3 color, vec3 worldPosition) {
  vec3 ray = worldPosition - cameraPosition;
  float range = length(ray);
  vec3 direction = ray / range;
  float horizonFade = smoothstep(HORIZON_FADE_START, HORIZON_FADE_END, range);
  float lift = max(direction.y, 0.0) * 0.35 + mix(0.11, 0.0, horizonFade);
  vec3 hazeDirection = normalize(vec3(direction.x, lift, direction.z));
  vec3 fogColor = skyGradient(hazeDirection) + sunHalo(hazeDirection) * mix(0.4, 1.0, horizonFade);
  return mix(color, fogColor, fogAmount(direction, range));
}
