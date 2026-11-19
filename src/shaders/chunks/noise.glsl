float hash21(vec2 point) {
  vec3 scrambled = fract(vec3(point.xyx) * 0.1031);
  scrambled += dot(scrambled, scrambled.yzx + 33.33);
  return fract((scrambled.x + scrambled.y) * scrambled.z);
}

vec3 valueNoiseDerivative(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 fade = local * local * local * (local * (local * 6.0 - 15.0) + 10.0);
  vec2 fadeSlope = 30.0 * local * local * (local * (local - 2.0) + 1.0);
  float a = hash21(cell);
  float b = hash21(cell + vec2(1.0, 0.0));
  float c = hash21(cell + vec2(0.0, 1.0));
  float d = hash21(cell + vec2(1.0, 1.0));
  float k1 = b - a;
  float k2 = c - a;
  float k3 = a - b - c + d;
  return vec3(
    a + k1 * fade.x + k2 * fade.y + k3 * fade.x * fade.y,
    fadeSlope * vec2(k1 + k3 * fade.y, k2 + k3 * fade.x)
  );
}

float valueNoise(vec2 point) {
  return valueNoiseDerivative(point).x;
}

vec3 fbmDerivative(vec2 point) {
  const mat2 octaveRotation = mat2(1.6, 1.2, -1.2, 1.6);
  mat2 basis = mat2(1.0, 0.0, 0.0, 1.0);
  vec3 total = vec3(0.0);
  float amplitude = 0.5;
  for (int octave = 0; octave < 4; octave++) {
    vec3 sampled = valueNoiseDerivative(point);
    total.x += sampled.x * amplitude;
    total.yz += amplitude * (transpose(basis) * sampled.yz);
    amplitude *= 0.5;
    point = octaveRotation * point;
    basis = octaveRotation * basis;
  }
  return total;
}
