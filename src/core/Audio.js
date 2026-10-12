// Áudio procedural com Web Audio: efeitos sintetizados e música generativa medieval.
import { G } from './context.js';

const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Escalas (intervalos em semitons)
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  whole: [0, 2, 4, 6, 8, 10],
};

// Clima musical: tempo, tônica, escala, progressão (graus), instrumentos
const MOODS = {
  title: { bpm: 64, root: 50, scale: 'dorian', prog: [0, 6, 5, 6], lute: 0.5, flute: 0.6, pad: 0.5, drum: 0, bass: 0, choir: 0.2 },
  village: { bpm: 96, root: 55, scale: 'mixolydian', prog: [0, 3, 6, 0, 4, 3, 0, 4], lute: 0.9, flute: 0.7, pad: 0.25, drum: 0.25, bass: 0.3, tamb: 0.35 },
  wild: { bpm: 78, root: 57, scale: 'minor', prog: [0, 5, 2, 6], lute: 0.7, flute: 0.35, pad: 0.45, drum: 0, bass: 0.15 },
  forest: { bpm: 70, root: 52, scale: 'dorian', prog: [0, 3, 0, 6], lute: 0.5, flute: 0.4, pad: 0.55, drum: 0, bass: 0 },
  night: { bpm: 58, root: 50, scale: 'minor', prog: [0, 5, 3, 4], lute: 0.35, flute: 0.25, pad: 0.6, drum: 0, bass: 0 },
  combat: { bpm: 126, root: 50, scale: 'phrygian', prog: [0, 1, 0, 6], lute: 0.6, flute: 0, pad: 0.35, drum: 0.8, bass: 0.7, tamb: 0.3 },
  boss: { bpm: 138, root: 48, scale: 'harmonic', prog: [0, 5, 4, 4, 0, 5, 6, 4], lute: 0.7, flute: 0, pad: 0.4, drum: 1, bass: 0.9, choir: 0.7, tamb: 0.4 },
  rift: { bpm: 54, root: 49, scale: 'whole', prog: [0, 1, 0, 2], lute: 0.4, flute: 0, pad: 0.7, drum: 0, bass: 0.2, choir: 0.5, bells: true },
  castle: { bpm: 82, root: 45, scale: 'minor', prog: [0, 5, 6, 4], lute: 0.5, flute: 0.4, pad: 0.6, drum: 0.2, bass: 0.3, choir: 0.3 },
  temple: { bpm: 72, root: 50, scale: 'phrygian', prog: [0, 1, 6, 0], lute: 0.6, flute: 0.5, pad: 0.5, drum: 0.1, bass: 0.2 },
  toon: { bpm: 144, root: 60, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], lute: 0.9, flute: 0.8, pad: 0.15, drum: 0.5, bass: 0.6, tamb: 0.6 },
  ending: { bpm: 62, root: 53, scale: 'major', prog: [0, 5, 3, 4], lute: 0.6, flute: 0.7, pad: 0.6, drum: 0, bass: 0.2, choir: 0.3 },
  dark: { bpm: 60, root: 46, scale: 'harmonic', prog: [0, 5, 1, 4], lute: 0.4, flute: 0.2, pad: 0.7, drum: 0.3, bass: 0.4, choir: 0.6 },
};

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.mood = null;
    this.pluckCache = new Map();
    this.lastPlay = {};
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { console.warn('Sem áudio', e); return; }
    const c = this.ctx;
    this.master = c.createGain();
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -16; this.comp.ratio.value = 4;
    this.master.connect(this.comp).connect(c.destination);
    this.musicBus = c.createGain();
    this.sfxBus = c.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    // reverberação
    this.reverb = c.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.6, 2.2);
    this.revGain = c.createGain();
    this.revGain.gain.value = 0.35;
    this.reverb.connect(this.revGain).connect(this.master);
    this.musicRev = c.createGain(); this.musicRev.gain.value = 0.5; this.musicRev.connect(this.reverb);
    this.sfxRev = c.createGain(); this.sfxRev.gain.value = 0.25; this.sfxRev.connect(this.reverb);
    // ruído
    const nb = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    this.applyVolumes();
    this.ready = true;
    // sequenciador
    this.seq = { nextTime: 0, step: 0, bar: 0, melodyNote: 0 };
    this.timer = setInterval(() => this.schedule(), 25);
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(G.settings.musicVolume * 0.5, this.ctx.currentTime, 0.1);
    this.sfxBus.gain.setTargetAtTime(G.settings.sfxVolume * 0.9, this.ctx.currentTime, 0.05);
  }

  makeImpulse(dur, decay) {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // Karplus-Strong pré-calculado (alaúde)
  pluckBuffer(note, bright = 0.5) {
    const key = note + '_' + bright;
    if (this.pluckCache.has(key)) return this.pluckCache.get(key);
    const c = this.ctx;
    const sr = c.sampleRate;
    const freq = midiToHz(note);
    const len = Math.floor(sr * 2.2);
    const buf = c.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const N = Math.max(2, Math.round(sr / freq));
    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    let idx = 0;
    const damp = 0.996 - (note > 70 ? 0.004 : 0);
    for (let i = 0; i < len; i++) {
      const a = ring[idx], b = ring[(idx + 1) % N];
      const v = (a * (0.5 + bright * 0.2) + b * (0.5 - bright * 0.2)) * damp;
      ring[idx] = v;
      d[i] = a;
      idx = (idx + 1) % N;
    }
    this.pluckCache.set(key, buf);
    return buf;
  }

  // ------------------------------- Primitivas -------------------------------
  out(opts = {}) {
    // cria cadeia gain(+pan) -> sfxBus (+reverb)
    const c = this.ctx;
    const g = c.createGain();
    let node = g;
    let vol = opts.vol ?? 1;
    if (opts.pos && G.camera) {
      const cam = G.camera.position;
      const dx = opts.pos.x - cam.x, dy = (opts.pos.y ?? cam.y) - cam.y, dz = opts.pos.z - cam.z;
      const dist = Math.hypot(dx, dy, dz);
      vol *= 1 / (1 + Math.max(0, dist - 4) / 10);
      if (vol < 0.02) return null;
      if (c.createStereoPanner) {
        const p = c.createStereoPanner();
        const yaw = G.cameraRig ? G.cameraRig.yaw : 0;
        const rx = Math.cos(yaw), rz = -Math.sin(yaw);
        p.pan.value = Math.max(-1, Math.min(1, (dx * rx + dz * rz) / (dist + 0.01)));
        g.connect(p);
        node = p;
      }
    }
    node.connect(opts.music ? this.musicBus : this.sfxBus);
    if (opts.rev !== false) node.connect(opts.music ? this.musicRev : this.sfxRev);
    g.gain.value = vol;
    return g;
  }

  noise(o) {
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const out = this.out(o);
    if (!out) return;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f0 || 1000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    f.Q.value = o.q ?? 1;
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(o.gain ?? 0.5, t + (o.attack ?? 0.005));
    env.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f).connect(env).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + o.dur + 0.05);
  }

  tone(o) {
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const out = this.out(o);
    if (!out) return;
    const osc = c.createOscillator();
    osc.type = o.wave || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) {
      if (o.linear) osc.frequency.linearRampToValueAtTime(o.f1, t + o.dur);
      else osc.frequency.exponentialRampToValueAtTime(Math.max(10, o.f1), t + o.dur);
    }
    if (o.detune) osc.detune.value = o.detune;
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(o.gain ?? 0.3, t + (o.attack ?? 0.005));
    env.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node = osc;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
    node.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  pluck(note, o = {}) {
    const c = this.ctx, t = o.time ?? c.currentTime;
    const out = this.out({ ...o, music: o.music });
    if (!out) return;
    const src = c.createBufferSource();
    src.buffer = this.pluckBuffer(Math.round(note), o.bright ?? 0.5);
    const env = c.createGain();
    env.gain.setValueAtTime(o.gain ?? 0.35, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + (o.dur || 1.6));
    src.connect(env).connect(out);
    src.start(t);
    src.stop(t + (o.dur || 1.6) + 0.05);
  }

  // ------------------------------- Efeitos -------------------------------
  play(name, opts = {}) {
    if (!this.ready || !this.ctx) return;
    // limita repetições muito rápidas
    const now = this.ctx.currentTime;
    if (this.lastPlay[name] && now - this.lastPlay[name] < 0.03) return;
    this.lastPlay[name] = now;
    const o = opts;
    const r = (a, b) => a + Math.random() * (b - a);
    switch (name) {
      case 'step': this.noise({ ...o, type: 'lowpass', f0: r(300, 500), dur: 0.08, gain: 0.25 * (o.vol ?? 0.3), rev: false, vol: 1 }); break;
      case 'splashStep': this.noise({ ...o, type: 'bandpass', f0: 1200, f1: 600, q: 0.8, dur: 0.18, gain: 0.25 }); break;
      case 'jump': this.noise({ type: 'lowpass', f0: 600, f1: 300, dur: 0.12, gain: 0.25 }); break;
      case 'roll': this.noise({ type: 'lowpass', f0: 500, f1: 200, dur: 0.35, gain: 0.35 }); break;
      case 'swing': this.noise({ type: 'bandpass', f0: r(900, 1200), f1: 3200, q: 2.2, dur: 0.18, gain: 0.45, attack: 0.04 }); break;
      case 'swingHeavy': this.noise({ type: 'bandpass', f0: 500, f1: 2400, q: 2, dur: 0.3, gain: 0.55, attack: 0.08 }); break;
      case 'hit':
        this.noise({ ...o, type: 'lowpass', f0: 1800, f1: 300, dur: 0.12, gain: 0.7 });
        this.tone({ ...o, wave: 'triangle', f0: r(150, 200), f1: 60, dur: 0.12, gain: 0.45 });
        break;
      case 'hitStone':
        this.noise({ ...o, type: 'bandpass', f0: 2500, f1: 800, q: 3, dur: 0.15, gain: 0.6 });
        this.tone({ ...o, wave: 'square', f0: 320, f1: 180, dur: 0.08, gain: 0.15, lp: 1500 });
        break;
      case 'block':
        this.tone({ wave: 'triangle', f0: 880, dur: 0.25, gain: 0.25 }); this.tone({ wave: 'sine', f0: 1320, dur: 0.18, gain: 0.15 });
        this.noise({ type: 'highpass', f0: 3000, dur: 0.08, gain: 0.3 });
        break;
      case 'parry':
        [1200, 1800, 2400].forEach((f, i) => this.tone({ wave: 'sine', f0: f, dur: 0.6, gain: 0.2, delay: i * 0.02 }));
        this.noise({ type: 'highpass', f0: 4000, dur: 0.2, gain: 0.35 });
        break;
      case 'playerDeath': this.tone({ wave: 'sawtooth', f0: 220, f1: 55, dur: 1.6, gain: 0.25, lp: 900 }); break;
      case 'pickup': this.tone({ wave: 'triangle', f0: 660, f1: 990, dur: 0.15, gain: 0.25 }); break;
      case 'coin': this.tone({ wave: 'square', f0: 1568, dur: 0.06, gain: 0.08, lp: 4000 }); this.tone({ wave: 'square', f0: 2093, dur: 0.18, gain: 0.08, lp: 4000, delay: 0.06 }); break;
      case 'drink': for (let i = 0; i < 3; i++) this.tone({ wave: 'sine', f0: r(400, 700), f1: r(200, 300), dur: 0.08, gain: 0.2, delay: i * 0.1 }); break;
      case 'equip': this.noise({ type: 'bandpass', f0: 2500, q: 4, dur: 0.12, gain: 0.3 }); this.tone({ wave: 'triangle', f0: 523, dur: 0.12, gain: 0.15 }); break;
      case 'upgrade': [523, 659, 784, 1047].forEach((f, i) => this.tone({ wave: 'triangle', f0: f, dur: 0.3, gain: 0.18, delay: i * 0.07 })); break;
      case 'denied': this.tone({ wave: 'square', f0: 180, dur: 0.12, gain: 0.1, lp: 800 }); break;
      case 'click': this.tone({ wave: 'triangle', f0: 900, dur: 0.04, gain: 0.12, rev: false }); break;
      case 'book': this.noise({ type: 'bandpass', f0: 1500, f1: 3000, q: 1, dur: 0.25, gain: 0.25 }); break;
      case 'dialogue': this.tone({ wave: 'sine', f0: r(600, 700), dur: 0.05, gain: 0.05, rev: false }); break;
      case 'questStart': [440, 554, 659].forEach((f, i) => this.pluck(57 + [0, 4, 7][i] + 12, { gain: 0.4, time: this.ctx.currentTime + i * 0.12 })); break;
      case 'questUpdate': this.pluck(69, { gain: 0.35 }); this.pluck(76, { gain: 0.3, time: this.ctx.currentTime + 0.1 }); break;
      case 'questDone': [0, 4, 7, 12, 16].forEach((s, i) => this.pluck(60 + s, { gain: 0.4, time: this.ctx.currentTime + i * 0.1, dur: 2 })); break;
      case 'levelup':
        [0, 4, 7, 12].forEach((s, i) => this.tone({ wave: 'triangle', f0: midiToHz(60 + s), dur: 0.9, gain: 0.18, delay: i * 0.12 }));
        [0, 7, 12].forEach((s) => this.tone({ wave: 'sawtooth', f0: midiToHz(48 + s), dur: 1.4, gain: 0.08, attack: 0.1, lp: 1800, delay: 0.5 }));
        break;
      case 'awaken':
        this.tone({ wave: 'sine', f0: 110, f1: 440, dur: 2.0, gain: 0.25, attack: 0.5 });
        [0, 7, 12, 19].forEach((s, i) => this.tone({ wave: 'triangle', f0: midiToHz(62 + s), dur: 2, gain: 0.12, delay: 0.4 + i * 0.15 }));
        break;
      case 'explosion':
        this.noise({ ...o, type: 'lowpass', f0: 2500, f1: 120, dur: 0.9, gain: 0.9 });
        this.tone({ ...o, wave: 'sine', f0: 90, f1: 35, dur: 0.6, gain: 0.6 });
        break;
      case 'eruption':
        this.noise({ ...o, type: 'lowpass', f0: 800, f1: 3000, dur: 0.6, gain: 0.6, attack: 0.1 });
        this.noise({ ...o, type: 'lowpass', f0: 3000, f1: 150, dur: 1.4, gain: 0.7, delay: 0.3 });
        this.tone({ ...o, wave: 'sine', f0: 70, f1: 30, dur: 1.2, gain: 0.6 });
        break;
      case 'steam': this.noise({ ...o, type: 'highpass', f0: 2000, f1: 5000, dur: 0.8, gain: 0.3, attack: 0.05 }); break;
      case 'spike': this.noise({ ...o, type: 'lowpass', f0: 1200, f1: 200, dur: 0.25, gain: 0.5 }); this.tone({ ...o, wave: 'square', f0: 140, f1: 60, dur: 0.15, gain: 0.15, lp: 600 }); break;
      case 'thunder':
        this.noise({ ...o, type: 'highpass', f0: 3000, dur: 0.1, gain: 0.8 });
        this.noise({ ...o, type: 'lowpass', f0: 1200, f1: 80, dur: 1.6, gain: 0.8, delay: 0.05 });
        break;
      case 'whistle': this.tone({ wave: 'sine', f0: 2200, f1: 500, dur: 0.75, gain: 0.25, linear: true }); break;
      case 'anvil':
        [1, 2.76, 5.4, 8.9].forEach((m, i) => this.tone({ ...o, wave: 'sine', f0: 280 * m, dur: 1.2 - i * 0.2, gain: 0.3 / (i + 1) }));
        this.noise({ ...o, type: 'lowpass', f0: 1500, f1: 200, dur: 0.3, gain: 0.7 });
        this.tone({ ...o, wave: 'sine', f0: 600, f1: 1400, dur: 0.4, gain: 0.15, delay: 0.25, linear: true }); // "boing"
        break;
      case 'mallet':
        this.tone({ ...o, wave: 'sine', f0: 200, f1: 60, dur: 0.3, gain: 0.7 });
        this.noise({ ...o, type: 'lowpass', f0: 2000, f1: 200, dur: 0.25, gain: 0.6 });
        this.tone({ ...o, wave: 'sine', f0: 300, f1: 1200, dur: 0.5, gain: 0.18, delay: 0.1 });
        break;
      case 'comic': this.tone({ wave: 'square', f0: r(500, 700), f1: r(900, 1200), dur: 0.12, gain: 0.06, lp: 3000 }); break;
      case 'thud': this.tone({ ...o, wave: 'sine', f0: 120, f1: 40, dur: 0.35, gain: 0.6 }); this.noise({ ...o, type: 'lowpass', f0: 600, f1: 100, dur: 0.3, gain: 0.5 }); break;
      case 'bow': this.noise({ ...o, type: 'bandpass', f0: 1800, f1: 600, q: 3, dur: 0.15, gain: 0.35 }); this.tone({ ...o, wave: 'triangle', f0: 180, f1: 120, dur: 0.15, gain: 0.15 }); break;
      case 'darkOrb': this.tone({ ...o, wave: 'sawtooth', f0: 300, f1: 120, dur: 0.5, gain: 0.12, lp: 900 }); break;
      case 'slam': this.tone({ ...o, wave: 'sine', f0: 80, f1: 30, dur: 0.8, gain: 0.8 }); this.noise({ ...o, type: 'lowpass', f0: 900, f1: 80, dur: 0.9, gain: 0.8 }); break;
      case 'bossRoar':
        this.tone({ wave: 'sawtooth', f0: 90, f1: 60, dur: 2.0, gain: 0.3, lp: 700, attack: 0.2 });
        this.tone({ wave: 'sawtooth', f0: 93, f1: 58, dur: 2.0, gain: 0.25, lp: 600, attack: 0.25 });
        this.noise({ type: 'bandpass', f0: 400, f1: 200, q: 1, dur: 2.0, gain: 0.35, attack: 0.2 });
        break;
      case 'travel': this.tone({ wave: 'sine', f0: 200, f1: 1600, dur: 1.2, gain: 0.25, attack: 0.3 }); this.noise({ type: 'bandpass', f0: 500, f1: 4000, q: 2, dur: 1.2, gain: 0.25, attack: 0.3 }); break;
      case 'rest': [0, 4, 7, 11, 12].forEach((s, i) => this.pluck(55 + s, { gain: 0.3, time: this.ctx.currentTime + i * 0.25, dur: 2.5 })); break;
      case 'barrier': this.tone({ wave: 'sine', f0: 140, f1: 900, dur: 1.5, gain: 0.3, attack: 0.2 }); this.noise({ type: 'highpass', f0: 1000, f1: 6000, dur: 1.5, gain: 0.3 }); break;
      case 'memory': [0, 7, 12, 16, 19, 24].forEach((s, i) => this.tone({ wave: 'sine', f0: midiToHz(72 + s), dur: 1.6, gain: 0.08, delay: i * 0.11 })); break;
      case 'castStart': {
        const s = o.school;
        if (s === 'toon') this.tone({ wave: 'sine', f0: 400, f1: 900, dur: 0.2, gain: 0.15 });
        else if (s === 'sombra' || s === 'psiquico') this.tone({ wave: 'sine', f0: 300, f1: 600, dur: 0.3, gain: 0.12, detune: 20 });
        else this.noise({ type: 'bandpass', f0: 600, f1: 1500, q: 2, dur: 0.25, gain: 0.2, attack: 0.05 });
        break;
      }
      default:
        this.playFamily(name, o);
    }
  }

  playFamily(name, o) {
    const r = (a, b) => a + Math.random() * (b - a);
    // Poderes
    if (name.startsWith('power_')) {
      const id = name.slice(6);
      switch (id) {
        case 'bola_fogo': this.noise({ type: 'lowpass', f0: 400, f1: 2500, dur: 0.35, gain: 0.45, attack: 0.03 }); break;
        case 'lanca_agua': this.noise({ type: 'bandpass', f0: 2500, f1: 800, q: 1.5, dur: 0.35, gain: 0.4 }); break;
        case 'mare_curativa': this.noise({ type: 'lowpass', f0: 300, f1: 1800, dur: 1.0, gain: 0.4, attack: 0.2 }); [0, 4, 7].forEach((s, i) => this.tone({ wave: 'sine', f0: midiToHz(67 + s), dur: 1, gain: 0.1, delay: i * 0.1 })); break;
        case 'lanca_solar': this.tone({ wave: 'sawtooth', f0: 1200, f1: 2400, dur: 0.3, gain: 0.12, lp: 5000 }); this.tone({ wave: 'sine', f0: 1800, dur: 0.4, gain: 0.12 }); break;
        case 'clarao_sagrado': [0, 4, 7, 12].forEach((s) => this.tone({ wave: 'sine', f0: midiToHz(72 + s), dur: 1.2, gain: 0.1 })); this.noise({ type: 'highpass', f0: 3000, dur: 0.6, gain: 0.3 }); break;
        case 'espinhos_pedra': this.noise({ type: 'lowpass', f0: 800, f1: 150, dur: 0.6, gain: 0.5 }); break;
        case 'pele_pedra': this.noise({ type: 'lowpass', f0: 200, f1: 800, dur: 0.6, gain: 0.5 }); this.tone({ wave: 'sine', f0: 90, dur: 0.6, gain: 0.3 }); break;
        case 'lamina_vento': this.noise({ type: 'bandpass', f0: 1500, f1: 5000, q: 3, dur: 0.25, gain: 0.4 }); break;
        case 'tempestade': this.noise({ type: 'lowpass', f0: 300, f1: 120, dur: 2.5, gain: 0.4, attack: 0.5 }); break;
        case 'telecinese': this.tone({ wave: 'sine', f0: 200, f1: 800, dur: 0.9, gain: 0.2, detune: 15 }); this.tone({ wave: 'sine', f0: 203, f1: 806, dur: 0.9, gain: 0.15 }); break;
        case 'dominio_mental': [0, 3, 6, 9].forEach((s, i) => this.tone({ wave: 'sine', f0: midiToHz(64 + s), dur: 0.9, gain: 0.1, delay: i * 0.08 })); break;
        case 'bigorna': break; // som no impacto
        case 'marreta': this.noise({ type: 'bandpass', f0: 500, f1: 2000, q: 2, dur: 0.3, gain: 0.4 }); break;
        case 'passo_sombrio': this.noise({ type: 'bandpass', f0: 3000, f1: 300, q: 2, dur: 0.35, gain: 0.45 }); this.tone({ wave: 'sine', f0: 600, f1: 150, dur: 0.35, gain: 0.15 }); break;
        case 'drenar_vida': this.tone({ wave: 'sawtooth', f0: 220, f1: 110, dur: 1.0, gain: 0.12, lp: 700 }); break;
      }
      return;
    }
    // Criaturas: <som><Attack|Hurt|Death>
    const m = /^(\w+?)(Attack|Hurt|Death)$/.exec(name);
    if (!m) return;
    const [, kind, act] = m;
    const vol = (o.vol ?? 1) * (act === 'Death' ? 1 : 0.7);
    const P = { pos: o.pos, vol };
    switch (kind) {
      case 'wolf': case 'growl':
        if (act === 'Attack') this.tone({ ...P, wave: 'sawtooth', f0: r(150, 190), f1: 90, dur: 0.35, gain: 0.25, lp: 900 });
        else if (act === 'Hurt') this.tone({ ...P, wave: 'triangle', f0: r(700, 900), f1: 400, dur: 0.2, gain: 0.25 });
        else this.tone({ ...P, wave: 'triangle', f0: 600, f1: 200, dur: 0.6, gain: 0.25 });
        break;
      case 'grunt':
        if (act === 'Attack') this.tone({ ...P, wave: 'sawtooth', f0: r(110, 140), f1: 90, dur: 0.18, gain: 0.18, lp: 700 });
        else if (act === 'Hurt') this.tone({ ...P, wave: 'sawtooth', f0: r(160, 200), f1: 110, dur: 0.15, gain: 0.2, lp: 800 });
        else this.tone({ ...P, wave: 'sawtooth', f0: 180, f1: 70, dur: 0.6, gain: 0.22, lp: 700 });
        break;
      case 'bones':
        for (let i = 0; i < (act === 'Death' ? 6 : 2); i++) this.noise({ ...P, type: 'bandpass', f0: r(2000, 4000), q: 6, dur: 0.05, gain: 0.4, delay: i * 0.05 });
        break;
      case 'wisp':
        if (act === 'Death') this.tone({ ...P, wave: 'sine', f0: 900, f1: 120, dur: 0.8, gain: 0.2 });
        else this.tone({ ...P, wave: 'sine', f0: r(400, 600), f1: r(200, 300), dur: 0.3, gain: 0.12, detune: 30 });
        break;
      case 'doodle':
        if (act === 'Attack') this.tone({ ...P, wave: 'square', f0: 300, f1: 600, dur: 0.12, gain: 0.08, lp: 2000 });
        else if (act === 'Hurt') this.tone({ ...P, wave: 'sine', f0: 900, f1: 500, dur: 0.15, gain: 0.15 });
        else { this.tone({ ...P, wave: 'sine', f0: 300, f1: 1500, dur: 0.35, gain: 0.18 }); this.noise({ ...P, type: 'highpass', f0: 2000, dur: 0.15, gain: 0.3, delay: 0.3 }); }
        break;
      case 'stone':
        this.noise({ ...P, type: 'lowpass', f0: act === 'Death' ? 1500 : 800, f1: 100, dur: act === 'Death' ? 1.0 : 0.3, gain: 0.5 });
        break;
      case 'boss':
        this.play('bossRoar');
        break;
    }
  }

  // ------------------------------- Música -------------------------------
  setMood(name) {
    if (!this.ready || this.mood === name) return;
    this.mood = name;
    const c = this.ctx;
    const g = this.musicBus.gain;
    const target = G.settings.musicVolume * 0.5;
    g.cancelScheduledValues(c.currentTime);
    g.setValueAtTime(g.value, c.currentTime);
    g.linearRampToValueAtTime(0.0001, c.currentTime + 0.8);
    setTimeout(() => {
      this.cur = MOODS[name] || MOODS.wild;
      this.seq.step = 0; this.seq.bar = 0;
      this.seq.nextTime = this.ctx.currentTime + 0.05;
      g.cancelScheduledValues(this.ctx.currentTime);
      g.setValueAtTime(0.0001, this.ctx.currentTime);
      g.linearRampToValueAtTime(target, this.ctx.currentTime + 1.5);
    }, 850);
  }

  schedule() {
    if (!this.cur || !this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx;
    const M = this.cur;
    const stepDur = 60 / M.bpm / 2; // colcheias
    while (this.seq.nextTime < c.currentTime + 0.15) {
      this.playStep(this.seq.step, this.seq.nextTime, M, stepDur);
      this.seq.nextTime += stepDur;
      this.seq.step++;
      if (this.seq.step % 8 === 0) this.seq.bar++;
    }
  }

  degree(M, deg, oct = 0) {
    const sc = SCALES[M.scale];
    const n = sc.length;
    const o = Math.floor(deg / n);
    const d = ((deg % n) + n) % n;
    return M.root + sc[d] + 12 * (o + oct);
  }

  playStep(step, t, M, sd) {
    const bar = Math.floor(step / 8);
    const inBar = step % 8;
    const chordDeg = M.prog[bar % M.prog.length];
    const chord = [chordDeg, chordDeg + 2, chordDeg + 4];
    const r = Math.random;
    // Pad / drone no início do compasso
    if (inBar === 0 && M.pad > 0) {
      for (const dg of [chord[0], chord[2]]) {
        const f = midiToHz(this.degree(M, dg, -1));
        this.padNote(f, t, sd * 8.2, M.pad * 0.06, M.choir);
      }
    }
    // Alaúde: arpejo
    if (M.lute > 0) {
      const pattern = [0, 1, 2, 1, 2, 1, 0, 2];
      const busy = M.bpm > 110 ? 1 : 0.75;
      if (r() < busy || inBar % 2 === 0) {
        const dg = chord[pattern[inBar]] + (inBar >= 4 && r() < 0.3 ? 7 : 0);
        const note = this.degree(M, dg, 0);
        if (M.bells) this.bell(midiToHz(note + 12), t, M.lute * 0.05);
        else this.pluck(note, { time: t, gain: M.lute * (inBar === 0 ? 0.32 : 0.22), music: true, dur: 1.8, bright: 0.45 });
      }
    }
    // Baixo
    if (M.bass > 0 && (inBar === 0 || inBar === 4 || (M.bpm > 120 && inBar % 2 === 0))) {
      this.pluck(this.degree(M, chord[0], -2), { time: t, gain: M.bass * 0.4, music: true, dur: 1.2, bright: 0.2 });
    }
    // Flauta: melodia em frases
    if (M.flute > 0) {
      const phrasePos = bar % 4;
      const play = phrasePos < 3 && (inBar % 2 === 0 ? r() < 0.75 : r() < 0.25);
      if (play) {
        let n = this.seq.melodyNote;
        if (inBar === 0) n = chord[Math.floor(r() * 3)] + 7;
        else n += r() < 0.5 ? (r() < 0.5 ? 1 : -1) : (r() < 0.5 ? 2 : -2);
        n = Math.max(5, Math.min(16, n));
        this.seq.melodyNote = n;
        const len = sd * (inBar % 2 === 0 && r() < 0.4 ? 3 : 1.8);
        this.flute(midiToHz(this.degree(M, n, 0)), t, len, M.flute * 0.07);
      }
    }
    // Percussão
    if (M.drum > 0) {
      if (inBar === 0 || inBar === 4 || (M.bpm > 120 && inBar === 6 && r() < 0.5)) this.drum(t, M.drum * 0.5, inBar === 0 ? 70 : 90);
      if (M.bpm > 120 && (inBar === 2 || inBar === 6)) this.drum(t, M.drum * 0.28, 160);
    }
    if (M.tamb && inBar % 2 === 1) this.tamb(t, M.tamb * 0.12);
  }

  padNote(f, t, dur, gain, choir = 0) {
    const c = this.ctx;
    const out = this.out({ music: true, vol: 1 });
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + dur * 0.3);
    env.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lp = c.createBiquadFilter();
    lp.type = choir > 0.3 ? 'bandpass' : 'lowpass';
    lp.frequency.value = choir > 0.3 ? 800 : 900;
    lp.Q.value = choir > 0.3 ? 2 : 0.5;
    lp.connect(env).connect(out);
    for (const det of [-7, 7]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(lp);
      o.start(t); o.stop(t + dur + 0.1);
    }
  }

  flute(f, t, dur, gain) {
    const c = this.ctx;
    const out = this.out({ music: true, vol: 1 });
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const vib = c.createOscillator();
    vib.frequency.value = 5.2;
    const vg = c.createGain();
    vg.gain.value = f * 0.008;
    vib.connect(vg).connect(o.frequency);
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.06);
    env.gain.setValueAtTime(gain * 0.85, t + dur * 0.7);
    env.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(env).connect(out);
    o.start(t); o.stop(t + dur + 0.05);
    vib.start(t); vib.stop(t + dur + 0.05);
  }

  bell(f, t, gain) {
    const c = this.ctx;
    const out = this.out({ music: true, vol: 1 });
    for (const [m, g] of [[1, 1], [2.4, 0.4], [5.1, 0.2]]) {
      const o = c.createOscillator();
      o.frequency.value = f * m;
      const env = c.createGain();
      env.gain.setValueAtTime(gain * g, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
      o.connect(env).connect(out);
      o.start(t); o.stop(t + 2.6);
    }
  }

  drum(t, gain, f0) {
    const c = this.ctx;
    const out = this.out({ music: true, vol: 1, rev: true });
    const o = c.createOscillator();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.5, t + 0.25);
    const env = c.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(env).connect(out);
    o.start(t); o.stop(t + 0.4);
  }

  tamb(t, gain) {
    const c = this.ctx;
    const out = this.out({ music: true, vol: 1, rev: false });
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 6000;
    const env = c.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    src.connect(f).connect(env).connect(out);
    src.start(t, Math.random()); src.stop(t + 0.1);
  }
}
