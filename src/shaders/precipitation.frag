#include <common>
#include <orogen_atmosphere>

uniform vec3 uLightColor;

varying float vAlpha;

void main() {
  vec2 sprite = gl_PointCoord - 0.5;
  #ifdef SNOWFLAKES
    float shape = 1.0 - smoothstep(0.12, 0.5, length(sprite));
    vec3 tint = vec3(0.96, 0.97, 1.0);
    float opacity = 0.85;
  #else
    float shape = (1.0 - smoothstep(0.0, 0.05, abs(sprite.x + sprite.y * 0.12))) *
      (1.0 - smoothstep(0.25, 0.5, abs(sprite.y)));
    vec3 tint = vec3(0.72, 0.78, 0.88);
    float opacity = 0.5;
  #endif
  if (shape * vAlpha < 0.01) discard;
  vec3 sky = (uSkyZenith * 0.6 + uSkyHorizon * 0.4) * mix(0.12, 1.0, daylightFactor());
  vec3 light = sky / (1.0 + dot(sky, vec3(0.2126, 0.7152, 0.0722))) + uLightColor * 0.3;
  gl_FragColor = vec4(tint * light, shape * vAlpha * opacity);
}
