// WebAudio-synthesized sound effects (research R12): nothing to download. Audio starts only after
// the first user gesture and honours the persisted mute setting (NFR-010).
import type { SoundName, SoundService } from '../app/screen';

type Ctx = AudioContext;

export class Sfx implements SoundService {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private pourGain: GainNode | null = null;
  private pourOn = false;
  private _muted: boolean;
  private lastPlay = new Map<SoundName, number>();

  constructor(muted: boolean) {
    this._muted = muted;
  }

  get muted(): boolean {
    return this._muted;
  }

  set muted(value: boolean) {
    this._muted = value;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(value ? 0 : 0.8, this.ctx.currentTime, 0.02);
  }

  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this._muted ? 0 : 0.8;
        this.master.connect(this.ctx.destination);
        this.noise = this.makeNoise(this.ctx);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  suspend(): void {
    if (this.ctx?.state === 'running') void this.ctx.suspend();
  }

  pour(active: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise) return;
    if (active === this.pourOn) return;
    this.pourOn = active;
    if (!this.pourGain) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 2400;
      band.Q.value = 0.8;
      this.pourGain = ctx.createGain();
      this.pourGain.gain.value = 0;
      src.connect(band).connect(this.pourGain).connect(this.master);
      src.start();
    }
    this.pourGain.gain.setTargetAtTime(active ? 0.09 : 0, ctx.currentTime, 0.05);
  }

  play(name: SoundName): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this._muted || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const minGap = name === 'spill' || name === 'chuff' ? 0.06 : 0.02;
    if (now - (this.lastPlay.get(name) ?? -1) < minGap) return;
    this.lastPlay.set(name, now);
    switch (name) {
      case 'click':
        this.tone('square', 1700, 1200, now, 0.05, 0.12);
        this.burst(now, 0.03, 4000, 0.15);
        break;
      case 'tap':
        this.tone('sine', 900, 700, now, 0.05, 0.08);
        break;
      case 'locked':
        this.tone('triangle', 160, 70, now, 0.16, 0.35);
        this.burst(now, 0.05, 500, 0.2);
        break;
      case 'whistle':
        this.whistle(now);
        break;
      case 'chuff':
        this.burst(now, 0.07, 700, 0.07);
        break;
      case 'spill':
        for (let i = 0; i < 3; i++) this.burst(now + i * 0.03 + Math.random() * 0.02, 0.02, 3000 + Math.random() * 2000, 0.06);
        break;
      case 'boing':
        this.tone('sine', 620, 110, now, 0.55, 0.4, 14);
        break;
      case 'pop':
        this.burst(now, 0.18, 900, 0.45);
        this.tone('sine', 220, 60, now, 0.2, 0.35);
        break;
      case 'jingle':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone('triangle', f, f, now + i * 0.11, 0.18, 0.25));
        break;
      case 'fail':
        this.tone('triangle', 392, 370, now, 0.25, 0.25);
        this.tone('triangle', 311, 290, now + 0.26, 0.45, 0.25);
        break;
      case 'star':
        this.tone('sine', 1318.5, 1318.5, now, 0.35, 0.2);
        this.tone('sine', 1975.5, 1975.5, now + 0.03, 0.3, 0.1);
        break;
      case 'secret':
        [783.99, 987.77, 1174.66, 1567.98, 1975.53].forEach((f, i) => this.tone('sine', f, f, now + i * 0.07, 0.22, 0.18));
        break;
    }
  }

  private tone(type: OscillatorType, f0: number, f1: number, at: number, dur: number, vol: number, vibrato = 0): void {
    const ctx = this.ctx as Ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
    if (vibrato > 0) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = vibrato;
      lfoGain.gain.value = f0 * 0.06;
      lfo.connect(lfoGain).connect(osc.frequency);
      lfo.start(at);
      lfo.stop(at + dur);
    }
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain).connect(this.master as GainNode);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  private burst(at: number, dur: number, freq: number, vol: number): void {
    const ctx = this.ctx as Ctx;
    if (!this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter).connect(gain).connect(this.master as GainNode);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.02);
  }

  private whistle(at: number): void {
    for (const f of [880, 1108.73]) {
      this.tone('sine', f * 0.97, f, at, 0.25, 0.12, 7);
      this.tone('sine', f, f * 0.99, at + 0.3, 0.45, 0.12, 7);
    }
    this.burst(at, 0.7, 2500, 0.05);
  }

  private makeNoise(ctx: Ctx): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}
