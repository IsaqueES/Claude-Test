// Animação procedural: locomoção + ações por quadros-chave sobrepostos.
import { clamp, easeInOut, easeOutCubic } from '../core/math.js';

const HUMANOID_BONES = ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'shoulderL', 'elbowL', 'handL', 'shoulderR', 'elbowR', 'handR', 'thighL', 'kneeL', 'footL', 'thighR', 'kneeR', 'footR'];
const UPPER = new Set(['spine', 'chest', 'neck', 'head', 'shoulderL', 'elbowL', 'handL', 'shoulderR', 'elbowR', 'handR']);

// Ações: dur (s), mask ('upper' | 'full'), keys [[t, pose]], hit [t0,t1] janela ativa, release t (efeito)
export const ACTIONS = {
  attack1: {
    dur: 0.5, mask: 'upper', hit: [0.3, 0.52],
    keys: [
      [0.22, { shoulderR: [-1.3, -1.15, -0.3], elbowR: [-0.7, 0, 0], spine: [0.05, -0.5, 0], chest: [0, -0.25, 0], shoulderL: [-0.4, 0.3, 0.35] }],
      [0.52, { shoulderR: [-1.4, 0.95, 0], elbowR: [-0.1, 0, 0], spine: [0.12, 0.45, 0], chest: [0, 0.3, 0], shoulderL: [0.25, 0, 0.35] }],
      [0.75, { shoulderR: [-1.0, 0.7, 0], elbowR: [-0.3, 0, 0], spine: [0.08, 0.3, 0], chest: [0, 0.15, 0] }],
    ],
  },
  attack2: {
    dur: 0.5, mask: 'upper', hit: [0.3, 0.52],
    keys: [
      [0.22, { shoulderR: [-0.9, 1.05, 0.2], elbowR: [-1.3, 0, 0], spine: [0.05, 0.42, 0], chest: [0, 0.25, 0], shoulderL: [0.2, 0, 0.3] }],
      [0.52, { shoulderR: [-1.7, -1.05, -0.2], elbowR: [-0.12, 0, 0], spine: [0.08, -0.45, 0], chest: [0, -0.3, 0], shoulderL: [-0.5, 0.3, 0.3] }],
      [0.75, { shoulderR: [-1.3, -0.8, -0.2], elbowR: [-0.3, 0, 0], spine: [0.05, -0.3, 0] }],
    ],
  },
  attack3: {
    dur: 0.68, mask: 'full', hit: [0.4, 0.6], lunge: 1,
    keys: [
      [0.3, { shoulderR: [-2.95, 0.15, 0], elbowR: [-1.0, 0, 0], shoulderL: [-2.7, -0.2, 0], elbowL: [-1.0, 0, 0], spine: [-0.28, 0, 0], head: [-0.15, 0, 0], thighL: [-0.2, 0, 0], thighR: [0.1, 0, 0] }],
      [0.55, { shoulderR: [-0.65, 0.15, 0], elbowR: [-0.1, 0, 0], shoulderL: [-0.7, -0.45, 0], elbowL: [-0.4, 0, 0], spine: [0.5, 0, 0], head: [-0.3, 0, 0], thighL: [-0.75, 0, 0], kneeL: [0.6, 0, 0], thighR: [0.45, 0, 0], kneeR: [0.7, 0, 0], hipsY: [-0.18] }],
      [0.8, { shoulderR: [-0.6, 0.1, 0], elbowR: [-0.2, 0, 0], shoulderL: [-0.5, -0.3, 0], spine: [0.35, 0, 0], thighL: [-0.6, 0, 0], kneeL: [0.5, 0, 0], thighR: [0.35, 0, 0], kneeR: [0.6, 0, 0], hipsY: [-0.14] }],
    ],
  },
  cast: {
    dur: 0.45, mask: 'upper', release: 0.32,
    keys: [
      [0.18, { shoulderL: [-1.0, 0.4, 0.3], elbowL: [-1.4, 0, 0], spine: [0, 0.25, 0] }],
      [0.35, { shoulderL: [-1.62, -0.14, 0], elbowL: [-0.05, 0, 0], spine: [0.08, -0.22, 0], chest: [0, -0.1, 0], shoulderR: [-0.3, -0.2, -0.4] }],
      [0.7, { shoulderL: [-1.5, -0.1, 0], elbowL: [-0.1, 0, 0], spine: [0.05, -0.15, 0] }],
    ],
  },
  castBoth: {
    dur: 0.7, mask: 'full', release: 0.55,
    keys: [
      [0.35, { shoulderL: [-2.7, 0, 0.35], shoulderR: [-2.7, 0, -0.35], elbowL: [-0.35, 0, 0], elbowR: [-0.35, 0, 0], spine: [-0.22, 0, 0], head: [-0.35, 0, 0] }],
      [0.55, { shoulderL: [-0.9, 0, 0.55], shoulderR: [-0.9, 0, -0.55], elbowL: [-0.1, 0, 0], elbowR: [-0.1, 0, 0], spine: [0.4, 0, 0], head: [0.05, 0, 0], thighL: [-0.4, 0, 0], kneeL: [0.7, 0, 0], thighR: [-0.4, 0, 0], kneeR: [0.7, 0, 0], hipsY: [-0.2] }],
      [0.8, { shoulderL: [-0.7, 0, 0.5], shoulderR: [-0.7, 0, -0.5], spine: [0.3, 0, 0], thighL: [-0.3, 0, 0], kneeL: [0.5, 0, 0], thighR: [-0.3, 0, 0], kneeR: [0.5, 0, 0], hipsY: [-0.12] }],
    ],
  },
  castSelf: {
    dur: 0.65, mask: 'upper', release: 0.45,
    keys: [
      [0.3, { shoulderL: [-0.5, 0, 0.5], shoulderR: [-0.5, 0, -0.5], elbowL: [-1.4, 0, 0], elbowR: [-1.4, 0, 0], head: [0.25, 0, 0] }],
      [0.55, { shoulderL: [-0.4, 0, 1.3], shoulderR: [-0.4, 0, -1.3], elbowL: [-0.3, 0, 0], elbowR: [-0.3, 0, 0], head: [-0.4, 0, 0], spine: [-0.12, 0, 0] }],
      [0.8, { shoulderL: [-0.3, 0, 1.1], shoulderR: [-0.3, 0, -1.1], head: [-0.3, 0, 0] }],
    ],
  },
  hit: {
    dur: 0.35, mask: 'upper',
    keys: [
      [0.2, { spine: [-0.35, 0.1, 0], head: [-0.35, 0, 0], shoulderL: [0.4, 0, 0.6], shoulderR: [0.4, 0, -0.6] }],
    ],
  },
  interact: {
    dur: 0.8, mask: 'full', release: 0.5,
    keys: [
      [0.4, { thighL: [-1.0, 0, 0], kneeL: [1.4, 0, 0], thighR: [-0.4, 0, 0], kneeR: [1.2, 0, 0], spine: [0.55, 0, 0], shoulderR: [-1.1, 0, 0], elbowR: [-0.3, 0, 0], hipsY: [-0.32] }],
      [0.65, { thighL: [-1.0, 0, 0], kneeL: [1.4, 0, 0], thighR: [-0.4, 0, 0], kneeR: [1.2, 0, 0], spine: [0.5, 0, 0], shoulderR: [-1.0, 0, 0], hipsY: [-0.32] }],
    ],
  },
  roar: {
    dur: 1.2, mask: 'full',
    keys: [
      [0.3, { shoulderL: [-0.6, 0, 1.2], shoulderR: [-0.6, 0, -1.2], elbowL: [-0.8, 0, 0], elbowR: [-0.8, 0, 0], spine: [-0.3, 0, 0], head: [-0.4, 0, 0] }],
      [0.8, { shoulderL: [-0.7, 0, 1.3], shoulderR: [-0.7, 0, -1.3], elbowL: [-0.9, 0, 0], elbowR: [-0.9, 0, 0], spine: [-0.35, 0, 0], head: [-0.45, 0, 0] }],
    ],
  },
  slam: {
    dur: 1.1, mask: 'full', hit: [0.5, 0.62], release: 0.52,
    keys: [
      [0.4, { shoulderL: [-2.9, 0, 0.2], shoulderR: [-2.9, 0, -0.2], elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0], spine: [-0.3, 0, 0], head: [-0.2, 0, 0] }],
      [0.55, { shoulderL: [-0.6, 0, 0.1], shoulderR: [-0.6, 0, -0.1], elbowL: [0, 0, 0], elbowR: [0, 0, 0], spine: [0.75, 0, 0], thighL: [-0.6, 0, 0], kneeL: [0.9, 0, 0], thighR: [-0.6, 0, 0], kneeR: [0.9, 0, 0], hipsY: [-0.3] }],
      [0.8, { shoulderL: [-0.5, 0, 0.1], shoulderR: [-0.5, 0, -0.1], spine: [0.6, 0, 0], thighL: [-0.5, 0, 0], kneeL: [0.8, 0, 0], thighR: [-0.5, 0, 0], kneeR: [0.8, 0, 0], hipsY: [-0.25] }],
    ],
  },
  punch: {
    dur: 0.6, mask: 'upper', hit: [0.32, 0.48],
    keys: [
      [0.28, { shoulderR: [-0.6, -0.4, -0.4], elbowR: [-1.8, 0, 0], spine: [0, -0.45, 0] }],
      [0.42, { shoulderR: [-1.6, 0.25, 0], elbowR: [-0.05, 0, 0], spine: [0.15, 0.4, 0], shoulderL: [0.3, 0, 0.3] }],
    ],
  },
  stab: {
    dur: 0.45, mask: 'upper', hit: [0.28, 0.45],
    keys: [
      [0.22, { shoulderR: [-0.7, -0.2, -0.3], elbowR: [-1.8, 0, 0], spine: [0, -0.3, 0] }],
      [0.4, { shoulderR: [-1.55, 0.1, 0], elbowR: [-0.05, 0, 0], spine: [0.2, 0.25, 0] }],
    ],
  },
  shoot: {
    dur: 0.9, mask: 'upper', release: 0.7,
    keys: [
      [0.3, { shoulderL: [-1.55, -0.1, 0], elbowL: [0, 0, 0], shoulderR: [-1.5, 0.5, 0], elbowR: [-2.0, 0, 0], spine: [0, 0.6, 0], head: [0, -0.5, 0] }],
      [0.68, { shoulderL: [-1.55, -0.1, 0], shoulderR: [-1.45, 0.8, 0], elbowR: [-2.4, 0, 0], spine: [0, 0.65, 0], head: [0, -0.55, 0] }],
      [0.75, { shoulderL: [-1.5, -0.1, 0], shoulderR: [-1.0, 0.2, -0.6], elbowR: [-0.8, 0, 0], spine: [0, 0.6, 0], head: [0, -0.5, 0] }],
    ],
  },
  wave: {
    dur: 1.4, mask: 'upper',
    keys: [
      [0.2, { shoulderR: [-0.2, 0, -2.6], elbowR: [-0.6, 0, 0] }],
      [0.4, { shoulderR: [-0.2, 0, -2.6], elbowR: [-0.1, 0, 0] }],
      [0.6, { shoulderR: [-0.2, 0, -2.6], elbowR: [-0.7, 0, 0] }],
      [0.8, { shoulderR: [-0.2, 0, -2.6], elbowR: [-0.1, 0, 0] }],
    ],
  },
  cheer: {
    dur: 1.0, mask: 'upper',
    keys: [
      [0.3, { shoulderL: [-2.9, 0, 0.3], shoulderR: [-2.9, 0, -0.3], elbowL: [-0.2, 0, 0], elbowR: [-0.2, 0, 0], head: [-0.3, 0, 0] }],
      [0.7, { shoulderL: [-2.8, 0, 0.4], shoulderR: [-2.8, 0, -0.4], head: [-0.3, 0, 0] }],
    ],
  },
};

const tmpA = [0, 0, 0];

function getTrack(def, bone) {
  if (!def._tracks) def._tracks = {};
  if (def._tracks[bone] !== undefined) return def._tracks[bone];
  const tr = [];
  for (const [kt, pose] of def.keys) if (pose[bone]) tr.push([kt, pose[bone]]);
  def._tracks[bone] = tr.length ? tr : null;
  return def._tracks[bone];
}

// Amostra a trilha de um osso; devolve o peso da sobreposição (0..1).
function sampleTrack(tr, p, out) {
  const n = out.length;
  if (p <= tr[0][0]) {
    const v = tr[0][1];
    for (let j = 0; j < n; j++) out[j] = v[j] ?? 0;
    return easeInOut(clamp(p / tr[0][0], 0, 1));
  }
  for (let i = 0; i < tr.length - 1; i++) {
    const t0 = tr[i][0], v0 = tr[i][1], t1 = tr[i + 1][0], v1 = tr[i + 1][1];
    if (p <= t1) {
      const f = easeInOut(clamp((p - t0) / (t1 - t0), 0, 1));
      for (let j = 0; j < n; j++) out[j] = (v0[j] ?? 0) + ((v1[j] ?? 0) - (v0[j] ?? 0)) * f;
      return 1;
    }
  }
  const v = tr[tr.length - 1][1];
  for (let j = 0; j < n; j++) out[j] = v[j] ?? 0;
  return 1;
}

export class HumanoidAnimator {
  constructor(built, opts = {}) {
    this.bones = built.bones;
    this.t = Math.random() * 10;
    this.phase = Math.random() * 6;
    this.action = null;
    this.style = opts.style || 'normal'; // normal | mage | heavy | doodle | skeleton | float
    this.blockW = 0; this.airW = 0; this.aimW = 0; this.talkW = 0; this.sitW = 0;
    this.pose = {};
    for (const n of HUMANOID_BONES) this.pose[n] = [0, 0, 0];
    this.hipsBase = this.bones.hips ? this.bones.hips.position.y : 1;
    this.squash = 1;
    this.rootRotX = 0;
    this.deadT = 0;
    this.dead = false;
    this.speedMul = opts.speedMul ?? 1;
    this.strideMul = opts.strideMul ?? 1;
  }

  play(name, opts = {}) {
    const def = ACTIONS[name];
    if (!def) return null;
    this.action = { name, def, t: 0, dur: (opts.dur ?? def.dur) / (opts.speed ?? 1), fired: false, hitDone: false };
    return this.action;
  }

  stop() { this.action = null; }

  get progress() { return this.action ? clamp(this.action.t / this.action.dur, 0, 1) : 0; }

  inHitWindow() {
    const a = this.action;
    if (!a || !a.def.hit) return false;
    const p = a.t / a.dur;
    return p >= a.def.hit[0] && p <= a.def.hit[1];
  }

  // Retorna true uma vez quando a ação passa do ponto de liberação
  consumeRelease() {
    const a = this.action;
    if (!a || a.fired || a.def.release === undefined) return false;
    if (a.t / a.dur >= a.def.release) { a.fired = true; return true; }
    return false;
  }

  die() { this.dead = true; this.deadT = 0; this.action = null; }
  revive() { this.dead = false; this.deadT = 0; this.rootRotX = 0; }

  update(dt, st = {}) {
    const B = this.bones;
    const P = this.pose;
    this.t += dt;
    for (const n of HUMANOID_BONES) { const p = P[n]; p[0] = 0; p[1] = 0; p[2] = 0; }
    let hipsY = 0;
    const style = this.style;
    const speed = st.speed || 0;

    // ---- Respiração / postura base ----
    const br = Math.sin(this.t * 1.8);
    P.chest[0] += br * 0.025;
    P.shoulderL[2] = 0.09 + br * 0.015;
    P.shoulderR[2] = -0.09 - br * 0.015;
    P.elbowL[0] = -0.18; P.elbowR[0] = -0.18;
    if (style === 'mage') { P.elbowR[0] = -0.5; P.shoulderR[0] = -0.2; }
    if (style === 'heavy') { P.shoulderL[2] = 0.25; P.shoulderR[2] = -0.25; P.spine[0] = 0.15; P.head[0] = -0.1; }
    if (style === 'skeleton') { P.spine[0] = 0.12; P.head[0] = -0.05; P.shoulderL[2] = 0.15; P.shoulderR[2] = -0.15; }
    if (st.weaponReady) { P.shoulderR[0] = -0.35; P.elbowR[0] = -0.6; P.shoulderR[1] = 0.1; }

    // ---- Locomoção ----
    const walk = clamp(speed / 3.5, 0, 1), run = clamp((speed - 4.5) / 4, 0, 1);
    this.phase += dt * speed * 2.0 * this.speedMul / this.strideMul;
    const s = Math.sin(this.phase), c = Math.cos(this.phase);
    const amp = (walk * 0.55 + run * 0.35) * (style === 'heavy' ? 0.7 : 1);
    if (style !== 'float') {
      P.thighL[0] += -s * amp; P.thighR[0] += s * amp;
      P.kneeL[0] += Math.max(0, c) * (0.9 * walk + 0.5 * run) + 0.08 * walk;
      P.kneeR[0] += Math.max(0, -c) * (0.9 * walk + 0.5 * run) + 0.08 * walk;
      P.footL[0] += -P.thighL[0] * 0.3 - P.kneeL[0] * 0.3;
      P.footR[0] += -P.thighR[0] * 0.3 - P.kneeR[0] * 0.3;
      hipsY += -Math.abs(s) * 0.045 * amp + (Math.abs(c)) * 0.02 * run;
    }
    P.shoulderL[0] += s * amp * 0.85; P.shoulderR[0] += -s * amp * 0.85;
    P.elbowL[0] += -run * 0.9; P.elbowR[0] += -run * 0.9;
    P.spine[0] += run * 0.2 + walk * 0.04;
    P.spine[1] += s * 0.08 * amp; P.chest[1] += -s * 0.07 * amp;
    P.head[0] += -(run * 0.2 + walk * 0.04) * 0.7;

    if (style === 'doodle') {
      // quique cartunesco
      const bounce = Math.abs(Math.sin(this.phase * 0.5 + this.t * (speed < 0.5 ? 3 : 0)));
      this.squash = 1 + (bounce - 0.5) * (speed > 0.5 ? 0.22 : 0.08);
    } else this.squash = 1;

    // ---- Estado no ar ----
    this.airW += ((st.grounded === false ? 1 : 0) - this.airW) * clamp(dt * 10, 0, 1);
    if (this.airW > 0.01) {
      const w = this.airW;
      const rising = (st.vy || 0) > 0 ? 1 : 0;
      mixInto(P.thighL, [-0.7 - rising * 0.3, 0, 0], w); mixInto(P.kneeL, [1.1, 0, 0], w);
      mixInto(P.thighR, [-0.2, 0, 0], w); mixInto(P.kneeR, [0.6, 0, 0], w);
      mixInto(P.shoulderL, [-0.6, 0, 0.6], w); mixInto(P.shoulderR, [-0.5, 0, -0.6], w);
    }

    // ---- Bloqueio (escudo à esquerda) ----
    this.blockW += ((st.block ? 1 : 0) - this.blockW) * clamp(dt * 14, 0, 1);
    if (this.blockW > 0.01) {
      const w = this.blockW;
      mixInto(P.shoulderL, [-1.35, -0.75, 0.1], w);
      mixInto(P.elbowL, [-1.45, 0, 0], w);
      mixInto(P.shoulderR, [-0.5, 0.2, -0.3], w);
      mixInto(P.elbowR, [-0.9, 0, 0], w);
      P.spine[0] += 0.12 * w; hipsY -= 0.08 * w;
      P.kneeL[0] += 0.2 * w; P.kneeR[0] += 0.2 * w; P.thighL[0] -= 0.15 * w; P.thighR[0] -= 0.1 * w;
    }

    // ---- Mirar (braço estendido) ----
    this.aimW += ((st.aim ? 1 : 0) - this.aimW) * clamp(dt * 12, 0, 1);
    if (this.aimW > 0.01) {
      mixInto(P.shoulderL, [-1.5, -0.1, 0], this.aimW);
      mixInto(P.elbowL, [-0.1, 0, 0], this.aimW);
    }

    // ---- Conversa (gestos) ----
    this.talkW += ((st.talk ? 1 : 0) - this.talkW) * clamp(dt * 4, 0, 1);
    if (this.talkW > 0.01) {
      const w = this.talkW;
      const g1 = Math.sin(this.t * 2.3), g2 = Math.sin(this.t * 1.7 + 1);
      P.shoulderR[0] += (-0.5 + g1 * 0.25) * w; P.elbowR[0] += (-0.9 + g2 * 0.3) * w; P.shoulderR[1] += 0.3 * w;
      P.shoulderL[0] += (-0.2 + g2 * 0.15) * w; P.elbowL[0] += (-0.5 + g1 * 0.2) * w;
      P.head[0] += Math.sin(this.t * 3.1) * 0.06 * w; P.head[1] += Math.sin(this.t * 0.9) * 0.15 * w;
    }

    // ---- Sentado ----
    this.sitW += ((st.sit ? 1 : 0) - this.sitW) * clamp(dt * 4, 0, 1);
    if (this.sitW > 0.01) {
      const w = this.sitW;
      mixInto(P.thighL, [-1.5, 0, 0], w); mixInto(P.thighR, [-1.5, 0, 0], w);
      mixInto(P.kneeL, [1.5, 0, 0], w); mixInto(P.kneeR, [1.5, 0, 0], w);
      hipsY -= 0.42 * w;
    }

    // ---- Ação por quadros-chave ----
    const a = this.action;
    if (a) {
      a.t += dt;
      const p = a.t / a.dur;
      if (p >= 1) { this.action = null; }
      else {
        const fadeOut = p > 0.82 ? 1 - (p - 0.82) / 0.18 : 1;
        const full = a.def.mask === 'full';
        for (const n of HUMANOID_BONES) {
          if (!full && !UPPER.has(n)) continue;
          const tr = getTrack(a.def, n);
          if (!tr) continue;
          const w = sampleTrack(tr, p, tmpA) * fadeOut;
          mixInto(P[n], tmpA, w);
        }
        const htr = getTrack(a.def, 'hipsY');
        if (htr) { const hy = [0]; const w = sampleTrack(htr, p, hy); hipsY += hy[0] * w * fadeOut; }
      }
    }

    // ---- Rolamento ----
    let rootRot = 0, rootLift = 0;
    if (st.rolling !== undefined && st.rolling >= 0) {
      const rp = st.rolling;
      rootRot = rp * Math.PI * 2;
      const tuck = Math.sin(rp * Math.PI);
      mixInto(P.thighL, [-2.1, 0, 0], tuck); mixInto(P.thighR, [-2.0, 0, 0], tuck);
      mixInto(P.kneeL, [2.5, 0, 0], tuck); mixInto(P.kneeR, [2.5, 0, 0], tuck);
      mixInto(P.spine, [1.0, 0, 0], tuck); mixInto(P.chest, [0.4, 0, 0], tuck); mixInto(P.head, [0.6, 0, 0], tuck);
      mixInto(P.shoulderL, [-1.2, 0, 0.2], tuck); mixInto(P.shoulderR, [-1.2, 0, -0.2], tuck);
      mixInto(P.elbowL, [-1.6, 0, 0], tuck); mixInto(P.elbowR, [-1.6, 0, 0], tuck);
      hipsY -= 0.35 * tuck;
      rootLift = 0.5 * tuck;
    }

    // ---- Morte ----
    if (this.dead) {
      this.deadT += dt;
      const d = easeOutCubic(clamp(this.deadT / 0.7, 0, 1));
      rootRot = -d * Math.PI / 2;
      rootLift = d * 0.18;
      mixInto(P.shoulderL, [-0.3, 0, 1.2], d); mixInto(P.shoulderR, [-0.3, 0, -1.2], d);
      mixInto(P.head, [-0.3, 0.4, 0], d);
      mixInto(P.kneeL, [0.4, 0, 0], d);
    }

    // ---- Aplicar aos ossos ----
    for (const n of HUMANOID_BONES) {
      const b = B[n];
      if (!b || n === 'root') continue;
      const p = P[n];
      b.rotation.x = p[0]; b.rotation.y = p[1]; b.rotation.z = p[2];
    }
    if (B.hips) B.hips.position.y = this.hipsBase + hipsY;
    if (B.root) {
      // rotação de rolamento em torno do centro do corpo
      const pivot = this.hipsBase * 0.62;
      B.root.rotation.x = rootRot;
      if (this.dead) {
        B.root.position.set(0, rootLift, 0);
      } else if (rootRot !== 0) {
        B.root.position.set(0, pivot - Math.cos(rootRot) * pivot + rootLift * 0.3, -Math.sin(rootRot) * pivot);
      } else B.root.position.set(0, 0, 0);
      const sq = this.squash;
      B.root.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    }
  }
}

function mixInto(dst, src, w) {
  dst[0] += (src[0] - dst[0]) * w;
  dst[1] += (src[1] - dst[1]) * w;
  dst[2] += (src[2] - dst[2]) * w;
}

// ======================= Quadrúpede =======================
export class QuadAnimator {
  constructor(built) {
    this.bones = built.bones;
    this.t = Math.random() * 10;
    this.phase = 0;
    this.action = null;
    this.dead = false; this.deadT = 0;
    this.bodyBase = this.bones.body.position.y;
  }
  play(name, opts = {}) {
    const durs = { bite: 0.55, pounce: 0.8, howl: 1.6, hit: 0.3 };
    this.action = { name, t: 0, dur: (opts.dur ?? durs[name] ?? 0.5), fired: false };
    return this.action;
  }
  inHitWindow() {
    const a = this.action; if (!a) return false;
    const p = a.t / a.dur;
    if (a.name === 'bite') return p > 0.35 && p < 0.6;
    if (a.name === 'pounce') return p > 0.3 && p < 0.75;
    return false;
  }
  consumeRelease() { return false; }
  get progress() { return this.action ? this.action.t / this.action.dur : 0; }
  die() { this.dead = true; this.deadT = 0; this.action = null; }
  revive() { this.dead = false; }
  update(dt, st = {}) {
    const B = this.bones;
    this.t += dt;
    const speed = st.speed || 0;
    this.phase += dt * speed * 2.6;
    const s = Math.sin(this.phase), c = Math.cos(this.phase);
    const amp = clamp(speed / 5, 0, 1) * 0.6;
    // trote: diagonais em fase
    B.legFL.rotation.x = -s * amp; B.legBR.rotation.x = -s * amp;
    B.legFR.rotation.x = s * amp; B.legBL.rotation.x = s * amp;
    B.lowFL.rotation.x = Math.max(0, -c) * amp * 1.2; B.lowBR.rotation.x = -Math.max(0, -c) * amp * 0.8;
    B.lowFR.rotation.x = Math.max(0, c) * amp * 1.2; B.lowBL.rotation.x = -Math.max(0, c) * amp * 0.8;
    B.body.position.y = this.bodyBase + Math.abs(s) * 0.04 * amp;
    B.body.rotation.x = 0; B.body.rotation.z = 0;
    B.neck.rotation.x = 0.15 + Math.sin(this.t * 1.2) * 0.04;
    B.head.rotation.x = -0.1; B.head.rotation.y = 0;
    B.jaw.rotation.x = st.pant ? Math.abs(Math.sin(this.t * 8)) * 0.25 : 0.05;
    B.tail1.rotation.x = 0.4 + Math.sin(this.t * 3) * 0.1;
    B.tail1.rotation.y = Math.sin(this.t * (speed > 1 ? 9 : 2)) * 0.3;
    B.tail2.rotation.x = -0.2;
    const a = this.action;
    if (a) {
      a.t += dt;
      const p = a.t / a.dur;
      if (p >= 1) this.action = null;
      else if (a.name === 'bite') {
        const k = Math.sin(clamp(p, 0, 1) * Math.PI);
        B.neck.rotation.x = 0.15 - k * 0.5; B.jaw.rotation.x = k * 0.6; B.body.rotation.x = k * 0.12;
        B.legFL.rotation.x -= k * 0.3; B.legFR.rotation.x -= k * 0.3;
      } else if (a.name === 'pounce') {
        const k = Math.sin(clamp(p, 0, 1) * Math.PI);
        B.body.rotation.x = -k * 0.4; B.legFL.rotation.x = -1.0 * k; B.legFR.rotation.x = -1.0 * k;
        B.legBL.rotation.x = 0.8 * k; B.legBR.rotation.x = 0.8 * k; B.jaw.rotation.x = k * 0.5;
      } else if (a.name === 'howl') {
        const k = Math.sin(clamp(p, 0, 1) * Math.PI);
        B.neck.rotation.x = 0.15 - k * 1.1; B.head.rotation.x = -k * 0.4; B.jaw.rotation.x = k * 0.4;
        B.body.rotation.x = -k * 0.15;
      } else if (a.name === 'hit') {
        const k = Math.sin(clamp(p, 0, 1) * Math.PI);
        B.body.rotation.z = k * 0.2; B.neck.rotation.x = 0.4 * k;
      }
    }
    if (this.dead) {
      this.deadT += dt;
      const d = easeOutCubic(clamp(this.deadT / 0.6, 0, 1));
      B.root.rotation.z = d * Math.PI / 2;
      B.root.position.y = d * 0.15;
    } else { B.root.rotation.z = 0; B.root.position.y = 0; }
  }
}

// ======================= Espectro =======================
export class WispAnimator {
  constructor(built) {
    this.bones = built.bones;
    this.t = Math.random() * 10;
    this.action = null; this.dead = false; this.deadT = 0;
    this.bodyBase = this.bones.body.position.y;
  }
  play(name, opts = {}) {
    this.action = { name, t: 0, dur: opts.dur ?? (name === 'cast' ? 0.8 : 0.55), fired: false };
    return this.action;
  }
  inHitWindow() { const a = this.action; if (!a || a.name !== 'claw') return false; const p = a.t / a.dur; return p > 0.35 && p < 0.65; }
  consumeRelease() { const a = this.action; if (!a || a.fired || a.name !== 'cast') return false; if (a.t / a.dur > 0.6) { a.fired = true; return true; } return false; }
  get progress() { return this.action ? this.action.t / this.action.dur : 0; }
  die() { this.dead = true; this.deadT = 0; }
  revive() { this.dead = false; }
  update(dt, st = {}) {
    const B = this.bones;
    this.t += dt;
    const bob = Math.sin(this.t * 2.2) * 0.12;
    B.body.position.y = this.bodyBase + bob;
    B.body.rotation.x = clamp((st.speed || 0) * 0.06, 0, 0.45);
    B.tail1.rotation.x = 0.3 + Math.sin(this.t * 3) * 0.2; B.tail1.rotation.z = Math.sin(this.t * 2.3) * 0.25;
    B.tail2.rotation.x = 0.3 + Math.sin(this.t * 3 + 1) * 0.3;
    B.shoulderL.rotation.set(-0.3 + Math.sin(this.t * 2.5) * 0.2, 0, 0.5);
    B.shoulderR.rotation.set(-0.3 + Math.sin(this.t * 2.5 + 1) * 0.2, 0, -0.5);
    B.elbowL.rotation.x = -0.6; B.elbowR.rotation.x = -0.6;
    B.head.rotation.x = Math.sin(this.t * 1.3) * 0.1;
    const a = this.action;
    if (a) {
      a.t += dt;
      const p = a.t / a.dur;
      if (p >= 1) this.action = null;
      else if (a.name === 'claw') {
        const k = Math.sin(p * Math.PI);
        B.shoulderR.rotation.set(-0.3 - k * 1.5, k * 0.6, -0.5 + k * 0.3);
        B.shoulderL.rotation.set(-0.3 - k * 1.5, -k * 0.6, 0.5 - k * 0.3);
        B.body.rotation.x = 0.3 * k;
      } else if (a.name === 'cast') {
        const k = Math.sin(p * Math.PI);
        B.shoulderR.rotation.set(-k * 2.2, 0, -0.5); B.shoulderL.rotation.set(-k * 2.2, 0, 0.5);
        B.head.rotation.x = -0.3 * k;
      }
    }
    if (this.dead) {
      this.deadT += dt;
      B.root.scale.setScalar(Math.max(0.01, 1 - this.deadT * 1.5));
      B.root.position.y = -this.deadT * 0.5;
    }
  }
}
