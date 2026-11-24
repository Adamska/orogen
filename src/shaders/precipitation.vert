attribute vec4 aSeed;

uniform float uTime;
uniform float uIntensity;
uniform float uPointScale;

varying float vAlpha;

const vec3 EXTENT = vec3(220.0, 140.0, 220.0);

void main() {
  #ifdef SNOWFLAKES
    float speed = 15.0 + aSeed.w * 9.0;
    vec2 drift = vec2(sin(uTime * 0.7 + aSeed.w * 40.0), cos(uTime * 0.5 + aSeed.w * 23.0)) * 7.0 +
      vec2(5.0, 2.0) * uTime;
    float size = 260.0;
  #else
    float speed = 190.0 + aSeed.w * 60.0;
    vec2 drift = vec2(22.0, 9.0) * uTime;
    float size = 900.0;
  #endif

  vec3 point = aSeed.xyz * EXTENT;
  point.y -= uTime * speed;
  point.xz += drift;
  vec3 origin = cameraPosition - EXTENT * 0.5;
  point = origin + mod(point - origin, EXTENT);

  vec4 viewPosition = viewMatrix * vec4(point, 1.0);
  float depth = max(-viewPosition.z, 1.0);
  float enabled = step(aSeed.w, uIntensity);
  vAlpha = enabled * (1.0 - smoothstep(60.0, 115.0, depth)) * smoothstep(2.0, 8.0, depth);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = enabled * min(size * uPointScale / depth, 40.0);
}
