#include <common>
#include <packing>
#include <orogen_atmosphere>
#include <orogen_field>
#include <orogen_noise>
#include <orogen_shading>

uniform float uTime;
uniform float uSnowLine;
uniform vec3 uSandColor;
uniform vec3 uGrassColor;
uniform vec3 uRockColor;
uniform vec3 uSnowColor;
uniform vec3 uWaterDeep;
uniform float uRain;
uniform float uVolcanism;
uniform vec4 uBrush;

vec3 geologicGlow(vec2 planar, vec4 field, float shore, vec3 crisp, float relief) {
  vec2 uv = fieldUv(planar);
  float upheaval = (texture2D(uElevationTo, uv).r - texture2D(uElevationFrom, uv).r) * uAmplitude;
  float front = valueNoise(planar * 0.012 + uMorph * 3.0);
  float reshaping = smoothstep(10.0, 70.0, upheaval) * pow(sin(3.14159 * clamp(uMorph, 0.0, 1.0)), 2.0) *
    smoothstep(0.35, 0.75, front);
  float flow = valueNoise(planar * 0.03 + vec2(uTime * 0.05, -uTime * 0.03));
  float channel = field.a + (flow - 0.5) * 0.008;
  float seams = 1.0 - smoothstep(0.0, 0.07, abs(valueNoise(planar * 0.09 + flow) - 0.5));
  float core = smoothstep(0.022, 0.045, channel);
  float rivers = smoothstep(0.008, 0.024, channel) * mix(seams * 0.7, 1.0, core) *
    (1.0 - smoothstep(0.3, 0.55, field.r)) * smoothstep(0.35, 0.75, uVolcanism);
  float cracks = (1.0 - smoothstep(0.0, 0.018, abs(crisp.x - 0.47))) * smoothstep(0.1, 0.6, uVolcanism) *
    smoothstep(0.4, 0.7, relief);
  float pulse = 0.82 + 0.18 * sin(uTime * 1.7 + flow * 9.0);
  float molten = max(rivers, cracks * 0.32) * pulse * step(0.5, shore);
  vec3 lava = mix(vec3(1.7, 0.32, 0.05), vec3(2.9, 1.05, 0.22), flow) * molten;
  vec3 energy = mix(vec3(0.45, 0.7, 1.2), vec3(1.6, 0.45, 0.1), uVolcanism) * reshaping * 0.18;
  return lava + energy;
}

varying vec3 vWorldPosition;

float triplanarGrain(vec3 point, vec3 normal) {
  vec3 weights = pow(abs(normal), vec3(4.0));
  weights /= weights.x + weights.y + weights.z;
  return valueNoise(point.zy) * weights.x + valueNoise(point.xz) * weights.y +
    valueNoise(point.xy) * weights.z;
}

void main() {
  vec2 planar = vWorldPosition.xz;
  vec4 field = sampleField(planar);
  vec3 macroNormal = fieldNormal(field);
  vec3 view = cameraPosition - vWorldPosition;
  float range = length(view);
  view /= range;
  float detail = 1.0 - smoothstep(140.0, 1300.0, range);

  float closeness = 1.0 - smoothstep(60.0, 620.0, range);
  vec3 relief = fbmDerivative(planar * 0.045);
  vec3 crisp = fbmDerivative(planar * 0.23 + 41.0);
  vec3 fine = valueNoiseDerivative(planar * 0.5);
  float patches = valueNoise(planar * 0.011 + 31.0);
  float breakup = relief.x * 2.2 - 1.0;

  float height = field.r * uAmplitude;
  float shore = height - uWaterLevel * uAmplitude;
  float altitude = field.r + breakup * 0.045;
  float steepness = 1.0 - macroNormal.y;

  vec2 bump = relief.yz * 0.26 + crisp.yz * 0.3 * closeness;
  vec3 normal = normalize(
    macroNormal - vec3(bump.x, 0.0, bump.y) * detail * (0.3 + steepness * 1.6)
  );
  float slope = mix(macroNormal.y, normal.y, 0.35);

  float strataWarp = relief.x * 2.4 + patches * 5.0;
  float strata = valueNoise(vec2(height * 0.085 + strataWarp, 3.7));
  float seams = valueNoise(vec2(height * 0.52 + strataWarp * 1.7, 9.1));
  float grain = triplanarGrain(vWorldPosition * 0.55, macroNormal);
  float crags = triplanarGrain(vWorldPosition * 0.085, macroNormal);
  vec3 rock = uRockColor * mix(0.74, 1.12, strata * 0.6 + seams * 0.4) * mix(0.8, 1.16, grain) *
    mix(0.72, 1.12, crags);
  rock = mix(rock, rock * vec3(1.14, 0.98, 0.86), patches * 0.6);
  float fissures = smoothstep(0.0, 0.16, abs(crisp.x - 0.47));
  rock *= mix(1.0, mix(0.62, 1.0, fissures), closeness);

  vec3 grass = uGrassColor * mix(0.68, 1.22, valueNoise(planar * 0.12 + 17.0));
  grass = mix(grass, uGrassColor * vec3(1.3, 1.12, 0.66), smoothstep(0.45, 0.8, patches) * 0.5);
  float tundra = smoothstep(uSnowLine - 0.36, uSnowLine - 0.08, altitude);
  grass = mix(grass, mix(uGrassColor, uRockColor, 0.6) * vec3(1.12, 1.0, 0.82), tundra * 0.85);

  float wetness = 1.0 - smoothstep(0.0, 2.8, shore);
  vec3 sand = uSandColor * mix(0.84, 1.1, fine.x) * mix(1.0, 0.5, wetness);
  vec3 seabed = mix(uSandColor * 0.5, uWaterDeep * 1.5, 0.5) * mix(0.75, 1.15, relief.x);
  vec3 snow = uSnowColor * mix(0.93, 1.0, fine.x);

  float rockMask = 1.0 - smoothstep(0.64, 0.8, slope + breakup * 0.05);
  rockMask = max(rockMask, smoothstep(uSnowLine - 0.18, uSnowLine, altitude) * 0.9);
  float sandMask = (1.0 - smoothstep(2.5, 9.0, shore + breakup * 2.5)) * smoothstep(0.6, 0.86, slope);
  float drift = altitude + (crisp.x - 0.47) * 0.07;
  float snowMask = smoothstep(uSnowLine - 0.012, uSnowLine + 0.026, drift) *
    smoothstep(0.5, 0.64, slope + (crisp.x - 0.47) * 0.12);
  float seabedMask = smoothstep(-3.0, -18.0, shore) * smoothstep(0.35, 0.8, slope);

  vec3 albedo = mix(grass, rock, rockMask);
  albedo = mix(albedo, sand, sandMask);
  albedo = mix(albedo, snow, snowMask);
  albedo = mix(albedo, seabed, seabedMask);

  float near = 1.0 - smoothstep(6.0, 48.0, range);
  if (near > 0.0) {
    vec3 micro = valueNoiseDerivative(planar * 2.4 + 7.0);
    float speckle = triplanarGrain(vWorldPosition * 2.1, macroNormal);
    normal = normalize(normal - vec3(micro.y, 0.0, micro.z) * 0.07 * near * (1.0 - snowMask * 0.7));
    albedo *= mix(1.0, mix(0.8, 1.14, speckle * 0.6 + micro.x * 0.4), near);
  }

  float soaked = uRain * (1.0 - snowMask) * smoothstep(0.55, 0.9, slope + 0.2);
  albedo *= 1.0 - soaked * 0.32;
  wetness = max(wetness, soaked * 0.8);

  float occlusion = clamp(1.0 - field.a * uAmplitude * 0.05, 0.28, 1.0);
  float shadow = sunShadow();
  float diffuse = max(dot(normal, uLightDirection), 0.0);
  vec3 lit = albedo * (uLightColor * diffuse * shadow + ambientLight(normal) * occlusion);

  vec3 halfVector = normalize(view + uLightDirection);
  float highlight = max(dot(normal, halfVector), 0.0);
  float wetSheen = pow(highlight, 90.0) * wetness * max(sandMask, soaked) * 1.2;
  float sparkle = step(0.986, hash21(floor(planar * 2.5))) * pow(highlight, 20.0) * snowMask *
    detail * 3.0;
  lit += uLightColor * (wetSheen + sparkle) * shadow;

  float depth = max(-shore, 0.0);
  vec2 causticPoint = planar * 0.17;
  float caustic = 1.0 - abs(
    valueNoise(causticPoint + uTime * 0.32) - valueNoise(causticPoint * 1.35 - uTime * 0.26 + 9.0)
  ) * 2.4;
  caustic = pow(clamp(caustic, 0.0, 1.0), 9.0);
  lit += albedo * uLightColor * caustic * shadow * detail * smoothstep(0.0, 2.0, depth) *
    exp(-depth * 0.07) * max(uLightDirection.y, 0.0) * 1.6;

  lit += geologicGlow(planar, field, shore, crisp, relief.x);
  float brushDistance = length(planar - uBrush.xy);
  float ring = 1.0 - smoothstep(0.0, 1.1 + range * 0.0025, abs(brushDistance - uBrush.z));
  float disc = (1.0 - smoothstep(uBrush.z * 0.9, uBrush.z, brushDistance)) * 0.06;
  lit = mix(lit, vec3(0.95, 0.97, 1.0), (ring * 0.75 + disc) * uBrush.w);
  gl_FragColor = vec4(applyAtmosphere(lit, vWorldPosition), 1.0);
}
