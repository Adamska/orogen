export interface AmbienceLevels {
  wind: number;
  surf: number;
  rain: number;
  rumble: number;
  birds: number;
}

interface NoiseLayer {
  readonly gain: GainNode;
  readonly filter: BiquadFilterNode;
}

const MASTER_LEVEL = 0.55;
const FADE_SECONDS = 1.2;
const PARAMETER_GLIDE = 0.8;
const NOISE_SECONDS = 3;

export class Ambience {
  private readonly context: AudioContext;
  private readonly master: GainNode;
  private readonly layers: Record<'wind' | 'surf' | 'rain' | 'rumble', NoiseLayer>;
  private birdLevel = 0;
  private birdTimer = 0;
  private gustTimer = 0;
  private running = false;

  constructor() {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.context.destination);
    const noise = this.createNoise();
    this.layers = {
      wind: this.createLayer(noise, 'bandpass', 620, 0.7),
      surf: this.createLayer(noise, 'lowpass', 480, 0.5),
      rain: this.createLayer(noise, 'highpass', 2600, 0.4),
      rumble: this.createLayer(noise, 'lowpass', 110, 0.9),
    };
  }

  async start(): Promise<void> {
    this.running = true;
    await this.context.resume();
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(MASTER_LEVEL, now, FADE_SECONDS / 3);
    this.scheduleGust();
    this.scheduleBird();
  }

  async stop(): Promise<void> {
    this.running = false;
    window.clearTimeout(this.gustTimer);
    window.clearTimeout(this.birdTimer);
    this.master.gain.setTargetAtTime(0, this.context.currentTime, FADE_SECONDS / 3);
    await new Promise((resolve) => window.setTimeout(resolve, FADE_SECONDS * 1000));
    if (!this.running) await this.context.suspend();
  }

  dispose(): void {
    window.clearTimeout(this.gustTimer);
    window.clearTimeout(this.birdTimer);
    void this.context.close();
  }

  update(levels: AmbienceLevels): void {
    const now = this.context.currentTime;
    this.layers.wind.gain.gain.setTargetAtTime(levels.wind * 0.22, now, PARAMETER_GLIDE);
    this.layers.surf.gain.gain.setTargetAtTime(levels.surf * 0.3, now, PARAMETER_GLIDE);
    this.layers.rain.gain.gain.setTargetAtTime(levels.rain * 0.16, now, PARAMETER_GLIDE);
    this.layers.rumble.gain.gain.setTargetAtTime(levels.rumble * 0.5, now, PARAMETER_GLIDE);
    this.birdLevel = levels.birds;
  }

  private createNoise(): AudioBufferSourceNode {
    const length = this.context.sampleRate * NOISE_SECONDS;
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    let brown = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      brown = (brown + white * 0.02) / 1.02;
      samples[index] = white * 0.55 + brown * 3.2;
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.start();
    return source;
  }

  private createLayer(noise: AudioNode, type: BiquadFilterType, frequency: number, q: number): NoiseLayer {
    const filter = this.context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = this.context.createGain();
    gain.gain.value = 0;
    noise.connect(filter).connect(gain).connect(this.master);
    return { gain, filter };
  }

  private scheduleGust(): void {
    const now = this.context.currentTime;
    const wind = this.layers.wind.filter.frequency;
    wind.setTargetAtTime(380 + Math.random() * 700, now, 1.4);
    const surf = this.layers.surf.filter.frequency;
    surf.setTargetAtTime(300 + Math.random() * 420, now, 2.2);
    this.gustTimer = window.setTimeout(() => this.scheduleGust(), 1800 + Math.random() * 2600);
  }

  private scheduleBird(): void {
    if (this.birdLevel > 0.05 && Math.random() < this.birdLevel) this.chirp();
    this.birdTimer = window.setTimeout(() => this.scheduleBird(), 900 + Math.random() * 3200);
  }

  private chirp(): void {
    const start = this.context.currentTime + 0.02;
    const notes = 2 + Math.floor(Math.random() * 4);
    const pitch = 2400 + Math.random() * 2200;
    const pan = this.context.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    pan.connect(this.master);
    for (let note = 0; note < notes; note += 1) {
      const at = start + note * (0.08 + Math.random() * 0.05);
      const oscillator = this.context.createOscillator();
      const envelope = this.context.createGain();
      oscillator.frequency.setValueAtTime(pitch * (1 + Math.random() * 0.15), at);
      oscillator.frequency.exponentialRampToValueAtTime(pitch * (1.25 + Math.random() * 0.3), at + 0.06);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(0.05 * this.birdLevel, at + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.075);
      oscillator.connect(envelope).connect(pan);
      oscillator.start(at);
      oscillator.stop(at + 0.09);
    }
  }
}
