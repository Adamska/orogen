#include <common>
#include <packing>
#include <orogen_atmosphere>
#include <orogen_field>
#include <orogen_noise>
#include <orogen_shading>

uniform float uTime;
uniform vec3 uWaterShallow;
uniform vec3 uWaterDeep;

varying vec3 vWorldPosition;

vec2 waveSlope(vec2 planar, float sharpness) {
  vec2 slope = vec2(0.0);
  float frequency = 0.09;
  float amplitude = 0.22;
  float angle = 0.6;
  for (int wave = 0; wave < 6; wave++) {
    vec2 direction = vec2(cos(angle), sin(angle));
    float phase = dot(planar, direction) * frequency + uTime * (0.9 + 0.3 * float(wave));
    slope += direction * frequency * amplitude * cos(phase);
    planar += direction * sin(phase) * amplitude * 1.4 + 3.1;
    angle += 2.4;
    frequency *= 1.5;
    amplitude *= mix(0.52, 0.7, sharpness);
  }
  float gust = mix(0.4, 1.25, valueNoise(planar * 0.011 + uTime * 0.02));
  return slope * gust;
}

void main() {
  vec2 planar = vWorldPosition.xz;
  vec3 view = cameraPosition - vWorldPosition;
  float range = length(view);
  view /= range;
  float detail = 1.0 - smoothstep(250.0, 2400.0, range);

  float depth = vWorldPosition.y - sampleField(planar).r * uAmplitude;
  float open = smoothstep(0.0, 22.0, depth);

  vec2 currents = valueNoiseDerivative(planar * 0.0045 + 3.0).yz * 70.0;
  vec2 slope = waveSlope(planar + currents, detail) * mix(0.3, 1.0, open) * mix(0.3, 1.0, detail);
  vec3 rippleA = valueNoiseDerivative(planar * 0.85 + vec2(uTime * 0.55, uTime * 0.3));
  vec3 rippleB = valueNoiseDerivative(planar * 1.9 - vec2(uTime * 0.45, -uTime * 0.38));
  slope += (rippleA.yz * 0.032 + rippleB.yz * 0.024) * detail;
  vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));

  float facing = max(dot(normal, view), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
  vec3 reflected = reflect(-view, normal);
  reflected.y = abs(reflected.y);
  vec3 reflection = skyRadiance(reflected);

  float shadow = sunShadow();
  float alignment = max(dot(reflected, uLightDirection), 0.0);
  float glint = pow(alignment, 1100.0) * 60.0 + pow(alignment, 90.0) * 0.9;
  vec3 specular = uLightColor * glint * shadow;

  float absorption = 1.0 - exp(-max(depth, 0.0) * 0.05);
  vec3 body = mix(uWaterShallow, uWaterDeep, absorption);
  vec3 illumination = ambientLight(vec3(0.0, 1.0, 0.0)) * 1.5 +
    uLightColor * (0.22 + max(uLightDirection.y, 0.0) * 0.6) * mix(0.45, 1.0, shadow);
  float scatter = pow(max(dot(view, -uLightDirection) * 0.5 + 0.5, 0.0), 4.0) * (1.0 - facing);
  body += uWaterShallow * scatter * 0.25 * shadow;
  vec3 color = mix(body * illumination, reflection, fresnel) + specular;

  float churn = valueNoise(planar * 0.34 + uTime * 0.11);
  float fizz = valueNoise(planar * 2.6 - uTime * 0.2);
  float shoreFoam = 1.0 - smoothstep(0.0, 0.45 + churn * 1.5, depth);
  float lapping = sin(depth * 1.5 - uTime * 1.25 + churn * 5.5) * 0.5 + 0.5;
  float bands = smoothstep(0.78, 1.0, lapping) * (1.0 - smoothstep(1.0, 7.5, depth)) *
    smoothstep(0.35, 0.7, churn);
  float foam = clamp(shoreFoam * 0.9 + bands * 0.6, 0.0, 1.0) *
    smoothstep(0.25, 0.75, fizz + shoreFoam * 0.4);
  vec3 foamColor = vec3(0.94) *
    (ambientLight(vec3(0.0, 1.0, 0.0)) * 1.3 + uLightColor * max(uLightDirection.y, 0.06) * shadow);
  color = mix(color, foamColor, foam * 0.85);

  float clarity = exp(-max(depth, 0.0) * 0.2) * (1.0 - fresnel);
  float alpha = max(1.0 - clarity * 0.9, foam);

  gl_FragColor = vec4(applyAtmosphere(color, vWorldPosition), alpha);
}
