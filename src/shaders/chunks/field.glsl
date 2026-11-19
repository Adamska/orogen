uniform sampler2D uElevationFrom;
uniform sampler2D uElevationTo;
uniform float uMorph;
uniform float uAmplitude;
uniform float uWaterLevel;
uniform float uTerrainSize;
uniform float uFieldResolution;

vec4 sampleField(vec2 planar) {
  vec2 uv = (planar / uTerrainSize + 0.5) * (uFieldResolution - 1.0) + 0.5;
  uv = clamp(uv / uFieldResolution, 0.0, 1.0);
  return mix(texture2D(uElevationFrom, uv), texture2D(uElevationTo, uv), uMorph);
}

vec3 fieldNormal(vec4 field) {
  return normalize(vec3(-field.g * uAmplitude, 1.0, -field.b * uAmplitude));
}
