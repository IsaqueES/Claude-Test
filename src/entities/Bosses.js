// Chefes, aliados, objetos destrutíveis e ovelhas.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { events } from '../core/Events.js';
import { rand, clamp, lerp, angleDiff, pick, easeInCubic, easeOutCubic } from '../core/math.js';
import { Entity } from './Entity.js';
import { Enemy } from './Enemy.js';
import { buildSheep } from './Models.js';
import { isHostile } from './Entities.js';

const ALL_TYPES = ['physical', 'fire', 'water', 'light', 'earth', 'wind', 'lightning', 'psychic', 'toon', 'shadow', 'rift'];
const _v = new THREE.Vector3();

// ======================================================================
// OBJETOS DESTRUTÍVEIS (raízes, pilares, cristais, braseiros)
// ======================================================================
export class WorldObject extends Entity {
  constructor(o) {
    super({ kind: 'object', team: 'object', x: o.x, z: o.z, radius: o.radius ?? 1.0, height: o.height ?? 2.5, hp: o.hp ?? 50, id: o.id, name: o.name });
    this.type = o.type;
    this.xp = o.xp || 0;
    this.flag = o.flag;
    this.fixed = true; this.immovable = true; this.mass = 1e6;
    this.resist = {};
    for (const t of ALL_TYPES) this.resist[t] = o.resist?.[t] ?? o.defaultResist ?? 1;
    this.immortal = !!o.immortal;
    this.onFire = o.onFire;
    this.onDestroy = o.onDestroy;
    this.level = o.level || 1;
    this.fleshy = false;
    this.mesh = makeObjectMesh(o.model);
    this.object.add(this.mesh);
    this.shakeT = 0;
    this.t = Math.random() * 10;
    this.col = G.world.collision.addCircle(this.pos.x, this.pos.z, this.radius * 0.8, { y0: this.pos.y - 1, y1: this.pos.y + this.height });
  }

  onHit(info, dmg) {
    this.shakeT = 0.25;
    if (info.type === 'fire' && this.onFire) this.onFire(this);
    if (this.immortal) this.hp = this.maxHp;
    const c = this.center;
    G.fx.emit({ x: c.x, y: c.y, z: c.z, count: 8, color: this.type === 'pilar' ? 0xd080ff : this.type === 'cristal' ? 0xa0fff0 : 0x6a3a8a, color2: 0x200830, size: 0.3, life: 0.5, speed: 5 });
  }

  die() {
    this.alive = false;
    const c = this.center;
    G.fx.burst(this.type === 'cristal' ? 'wind' : this.type === 'pilar' ? 'rift' : 'shadow', c.x, c.y, c.z, 1.4);
    if (this.type === 'raiz') G.fx.burst('fire', c.x, c.y, c.z, 1);
    G.world.collision.remove(this.col);
    if (this.flag) G.story.set(this.flag);
    this.onDestroy?.(this);
    G.audio?.play(this.type === 'cristal' ? 'block' : 'explosion', { pos: this.pos });
    this.deadT = 0;
  }

  update(dt) {
    this.t += dt;
    if (!this.alive) {
      this.deadT += dt;
      this.mesh.scale.setScalar(Math.max(0.01, 1 - this.deadT * 2));
      if (this.deadT > 0.6) this.remove();
      return;
    }
    if (this.shakeT > 0) { this.shakeT -= dt; this.mesh.position.x = Math.sin(this.t * 60) * 0.08; } else this.mesh.position.x = 0;
    if (this.type === 'cristal') { this.mesh.rotation.y += dt * 2; this.mesh.position.y = Math.sin(this.t * 2) * 0.3; }
    if (this.type === 'pilar') this.mesh.rotation.y += dt * 0.3;
    if (this.type === 'raiz' && Math.random() < dt * 3) G.fx.trail('rift', this.pos.x + rand(-0.8, 0.8), this.pos.y + rand(0.5, 2.5), this.pos.z + rand(-0.8, 0.8));
    this.object.position.copy(this.pos);
  }
}

function makeObjectMesh(model) {
  const g = new THREE.Group();
  if (model === 'root') {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a1a30, emissive: 0x4a1060, emissiveIntensity: 0.6, flatShading: true, roughness: 0.8 });
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.35, 3 + Math.random() * 1.5, 5), mat);
      const a = (i / 6) * Math.PI * 2;
      m.position.set(Math.cos(a) * 0.6, 1.3, Math.sin(a) * 0.6);
      m.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
      m.castShadow = true;
      g.add(m);
    }
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.4, 2.2) }));
    core.position.y = 1.2;
    g.add(core);
  } else if (model === 'pillar') {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a1a5a, emissive: 0x8a30ff, emissiveIntensity: 0.9, flatShading: true, roughness: 0.3 });
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), mat);
    m.scale.set(1, 3.2, 1);
    m.position.y = 4.5;
    m.castShadow = true;
    g.add(m);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 1, 7), new THREE.MeshStandardMaterial({ color: 0x241830, flatShading: true }));
    base.position.y = 0.4;
    g.add(base);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 60, 6, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.4, 2.0), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.y = 34;
    g.add(beam);
  } else if (model === 'crystal') {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), new THREE.MeshStandardMaterial({ color: 0x9affe8, emissive: 0x40c0a0, emissiveIntensity: 1, flatShading: true, roughness: 0.2, transparent: true, opacity: 0.9 }));
    m.position.y = 1.6;
    m.scale.y = 1.6;
    g.add(m);
  } else if (model === 'dummy') {
    // nada — boneco já faz parte do cenário
  }
  return g;
}

// ======================================================================
// OVELHAS
// ======================================================================
export class Sheep extends Entity {
  constructor(o) {
    super({ kind: 'critter', team: 'neutral', x: o.x, z: o.z, radius: 0.45, height: 0.9, hp: 9999, id: o.id, name: o.name });
    const m = buildSheep();
    this.setModel(m);
    this.anim = m.anim;
    this.state = o.penned ? 'penned' : 'idle';
    this.targetable = false;
    this.mass = 0.8;
    this.grazeT = rand(2, 5);
    this.wander = null;
    this.bleatT = rand(4, 10);
  }

  update(dt) {
    const p = G.player;
    let vx = 0, vz = 0, speed = 0;
    const pen = G.world.anchors.anchors.sheepPen;
    if (this.state === 'follow' && p) {
      const d = this.distTo(p);
      if (d > 2.8) {
        const yaw = this.yawTo(p.pos.x, p.pos.z);
        this.faceYaw(yaw, 6, dt);
        speed = d > 8 ? 7.5 : 5;
        vx = Math.sin(this.yaw) * speed; vz = Math.cos(this.yaw) * speed;
      }
      if (d > 40) { this.pos.set(p.pos.x - 2, p.pos.y, p.pos.z - 2); }
      if (Math.hypot(this.pos.x - pen.x, this.pos.z - pen.z) < 5.5) {
        this.state = 'penned';
        G.story.inc('sheepPenned');
        G.story.set('sheep_' + this.id, true);
        G.ui.toast(this.name + ' está de volta no curral!', 'quest');
        G.audio?.play('questUpdate');
        G.world.removeInteractable('call_' + this.id);
      }
    } else {
      this.grazeT -= dt;
      if (this.grazeT <= 0) {
        this.grazeT = rand(3, 7);
        const home = this.state === 'penned' ? pen : this.pos;
        const r = this.state === 'penned' ? 3.5 : 3;
        const a = rand(0, Math.PI * 2);
        this.wander = Math.random() < 0.6 ? { x: home.x + Math.cos(a) * r, z: home.z + Math.sin(a) * r } : null;
      }
      if (this.wander) {
        const dx = this.wander.x - this.pos.x, dz = this.wander.z - this.pos.z;
        if (Math.hypot(dx, dz) > 0.5) { this.faceYaw(Math.atan2(dx, dz), 4, dt); speed = 1.2; vx = Math.sin(this.yaw) * speed; vz = Math.cos(this.yaw) * speed; }
        else this.wander = null;
      }
    }
    this.bleatT -= dt;
    if (this.bleatT <= 0) { this.bleatT = rand(6, 14); if (p && this.distTo(p) < 15) G.audio?.play('pickup', { pos: this.pos, vol: 0.2 }); }
    this.physics(dt, vx, vz);
    this.anim.update(dt, { speed });
    this.syncObject(dt);
    const it = G.world.getInteractable('call_' + this.id);
    if (it) { it.pos.x = this.pos.x; it.pos.z = this.pos.z; it.pos.y = this.pos.y; }
  }
}

// ======================================================================
// CHEFE BASE
// ======================================================================
export class Boss extends Enemy {
  constructor(type, o = {}) {
    super(type, { ...o, boss: true, leash: 999, level: o.level || 1 });
    this.boss = true;
    this.phase = 1;
    this.introDone = !!o.skipIntro;
    this.invulnerable = !this.introDone;
    this.yieldAt = o.yieldAt ?? 0;
    this.yielded = false;
    this.title = o.title || '';
    this.introRange = o.introRange ?? 26;
    this.displayName = this.def.name;
    this.atk = null;
    this.atkCd = 2;
    this.thresholds = o.thresholds || [];
    this.scripted = false;
    this.statusImmune = ['charm'];
  }

  intro() {
    this.introDone = true;
    this.state = 'chase';
    G.ui.questBanner(this.title || 'Chefe', this.displayName, this.introLine || '');
    G.audio?.play('bossRoar');
    G.ui.setBoss(this);
    G.bossMusic = true;
    this.anim.play?.('roar');
    G.cameraRig.shake(0.3);
    setTimeout(() => { if (!this.yielded) this.invulnerable = false; }, 1400);
    this.onIntro?.();
  }

  onHit(info, dmg) {
    if (this.yieldAt > 0 && !this.yielded && this.hp <= this.maxHp * this.yieldAt) {
      this.hp = Math.max(1, this.maxHp * this.yieldAt * 0.5);
      this.yielded = true;
      this.invulnerable = true;
      this.atk = null;
      this.curAttack = null;
      this.state = 'yield';
      this.anim.stop?.();
      this.onYield?.();
      return;
    }
    // fases
    for (let i = this.phase - 1; i < this.thresholds.length; i++) {
      if (this.hp <= this.maxHp * this.thresholds[i] && this.phase === i + 1) {
        this.phase = i + 2;
        this.onPhase?.(this.phase);
      }
    }
    if (info.source && info.source.alive && isHostile(this.team, info.source.team) && Math.random() < 0.25) this.aiTarget = info.source;
    G.audio?.play(this.def.sound + 'Hurt', { pos: this.pos, vol: 0.4 });
  }

  die() {
    super.die();
    G.bossMusic = false;
    G.ui.setBoss(null);
    this.onDeath?.();
  }

  update(dt) {
    if (!this.alive) { super.update(dt); return; }
    const p = G.player;
    if (!this.introDone) {
      if (p && p.alive && this.distTo(p) < this.introRange && G.state === 'play') this.intro();
      this.anim.update(dt, { speed: 0, grounded: true });
      this.physics(dt, 0, 0);
      this.syncObject(dt);
      return;
    }
    G.combat.tickStatus(this, dt);
    const frozen = G.state !== 'play' && G.state !== 'cutscene';
    if (frozen || this.state === 'yield') {
      this.anim.update(dt, { speed: 0, grounded: this.grounded, sit: this.state === 'yield' && !this.isFloat });
      if (!this.scripted) this.physics(dt, 0, 0);
      this.syncObject(dt);
      return;
    }
    this.atkCd -= dt;
    if (this.stunT > 0) { this.stunT -= dt; this.atk = null; }
    if (!this.aiTarget || !this.aiTarget.alive || this.aiTarget.removed || !isHostile(this.team, this.aiTarget.team)) this.aiTarget = this.findTarget() || (p.alive ? p : null);
    const T = this.aiTarget;
    let mv = { vx: 0, vz: 0, speed: 0 };
    if (this.stunT <= 0 && T) {
      if (this.atk) {
        // first: verdadeiro só na primeira chamada do ataque (independe da taxa de quadros)
        this.atk.first = this.atk.t === 0;
        this.atk.t += dt;
        const done = this['atk_' + this.atk.name](dt, this.atk, T);
        if (done) { this.atk = null; this.atkCd = rand(this.def.cd[0], this.def.cd[1]) * (this.phase >= 3 ? 0.65 : this.phase === 2 ? 0.8 : 1); }
        if (this.atk?.move) mv = this.atk.move;
      } else {
        mv = this.think(dt, T) || mv;
      }
    }
    if (!this.scripted) this.physics(dt, mv.vx || 0, mv.vz || 0);
    this.anim.update(dt, { speed: mv.speed || 0, grounded: this.grounded || this.isFloat, vy: this.vel.y, weaponReady: true });
    this.syncObject(dt);
  }

  startAtk(name, data = {}) {
    this.atk = { name, t: 0, ...data };
    G.audio?.play(this.def.sound + 'Attack', { pos: this.pos, vol: 0.5 });
  }

  // move-se em direção ao alvo até a distância desejada
  approach(dt, T, want, speedMul = 1, strafe = 0) {
    const d = this.distTo(T);
    const yaw = this.yawTo(T.pos.x, T.pos.z);
    this.faceYaw(yaw, 6, dt);
    let f = 0;
    if (d > want + 1) f = 1; else if (d < want - 2) f = -0.7;
    const sp = this.speed * speedMul;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    return { vx: (fx * f + fz * strafe) * sp, vz: (fz * f - fx * strafe) * sp, speed: (Math.abs(f) + Math.abs(strafe)) * sp };
  }

  meleeHit(T, range, mult = 1, extra = {}) {
    if (!T || !T.alive) return false;
    const d = this.distTo(T) - T.radius;
    const dot = Math.cos(angleDiff(this.yaw, this.yawTo(T.pos.x, T.pos.z)));
    if (d < range && dot > 0.2) {
      G.combat.applyDamage(T, { amount: this.dmg * mult * rand(0.9, 1.1), type: extra.type || 'physical', source: this, melee: true, knockback: extra.knock ?? 5, poise: 25, ...extra });
      return true;
    }
    return false;
  }

  aoe(x, z, r, mult, type = 'physical', extra = {}) {
    const y = G.world.groundAt(x, z, this.pos.y + 6);
    return G.combat.areaDamage(x, y + 1, z, r, this.team, { amount: this.dmg * mult, type, source: this, knockback: extra.knock ?? 7, up: extra.up ?? 3, poise: 30, ...extra });
  }

  summon(type, n, r = 6, level) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const e = new Enemy(type, { x: this.pos.x + Math.cos(a) * r, z: this.pos.z + Math.sin(a) * r, level: level || this.level, tags: ['bossAdd'], aggro: 60, leash: 200 });
      G.entities.add(e);
      G.fx.burst(type === 'doodle' ? 'ink' : type === 'golem' ? 'earth' : 'shadow', e.pos.x, e.pos.y + 1, e.pos.z, 1);
      out.push(e);
    }
    return out;
  }

  say(text, dur = 3.2) { G.ui.showSubtitle(`${this.displayName.split(',')[0]}: “${text}”`, dur); }
}

// ======================================================================
// CORVO
// ======================================================================
export class CorvoBoss extends Boss {
  constructor(o) {
    super('corvoBoss', { ...o, title: o.duel ? 'Duelo' : 'Chefe', yieldAt: 0.12, thresholds: [0.5], level: o.level || 4 });
    this.duel = !!o.duel;
    this.introLine = o.duel ? 'Ninguém interfere!' : '';
    this.introRange = 40;
  }
  onIntro() { this.say(this.duel ? 'Mostre do que é feito, portador!' : 'Vamos ver se essa estrela sangra.'); }
  onPhase(n) { if (n === 2 && !this.duel) { this.say('Rapazes! Agora!'); this.summon('bandit', 2, 7, 3); } }
  onYield() { setTimeout(() => G.questCtx.corvoYield(this), 600); }
  think(dt, T) {
    const d = this.distTo(T);
    if (this.atkCd <= 0) {
      if (d < 3.2) this.startAtk(Math.random() < 0.75 ? 'combo' : 'smoke');
      else if (d > 6) this.startAtk(Math.random() < 0.6 ? 'knives' : 'smoke');
      else this.startAtk('combo');
      return { vx: 0, vz: 0, speed: 0 };
    }
    return this.approach(dt, T, d > 8 ? 1.8 : 4, 1, Math.sin(G.time.now * 1.3) * 0.6);
  }
  atk_combo(dt, A, T) {
    if (A.first) { this.anim.play('stab', { speed: 1.3 }); A.hit1 = false; }
    if (A.t > 0.4 && !A.second) { A.second = true; this.anim.play('stab', { speed: 1.3 }); A.hit2 = false; }
    this.faceYaw(this.yawTo(T.pos.x, T.pos.z), 10, dt);
    A.move = A.t < 0.25 ? { vx: Math.sin(this.yaw) * 5, vz: Math.cos(this.yaw) * 5, speed: 5 } : { vx: 0, vz: 0, speed: 0 };
    if (this.anim.inHitWindow()) {
      if (!A.second && !A.hit1) A.hit1 = this.meleeHit(T, 2.4, 0.9);
      if (A.second && !A.hit2) A.hit2 = this.meleeHit(T, 2.4, 1.0);
    }
    return A.t > 0.95;
  }
  atk_knives(dt, A, T) {
    if (A.first) this.anim.play('cast', { speed: 1.2 });
    this.faceYaw(this.yawTo(T.pos.x, T.pos.z), 12, dt);
    if (A.t > 0.3 && !A.fired) {
      A.fired = true;
      const origin = new THREE.Vector3(this.pos.x, this.pos.y + 1.3, this.pos.z);
      const base = T.center.clone().sub(origin).normalize();
      for (const off of [-0.22, 0, 0.22]) {
        const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), off);
        G.projectiles.spawn({ pos: origin, dir, speed: 26, team: this.team, element: 'physical', visual: 'arrow', color: 0x3a3a44, trail: null, source: this, damage: { amount: this.dmg * 0.7, type: 'physical' } });
      }
      G.audio?.play('bow', { pos: this.pos });
    }
    return A.t > 0.7;
  }
  atk_smoke(dt, A, T) {
    if (A.first) {
      G.fx.emit({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z, count: 40, color: 0x5a5a60, color2: 0x2a2a30, size: 2, sizeEnd: 4, life: 1.2, speed: 2.5, blend: 'normal', alpha: 0.8 });
      G.audio?.play('steam', { pos: this.pos });
      this.object.visible = false; this.targetable = false;
    }
    if (A.t > 0.7 && !A.appeared) {
      A.appeared = true;
      const back = T.yaw + Math.PI;
      this.pos.set(T.pos.x + Math.sin(back) * 2.2, T.pos.y, T.pos.z + Math.cos(back) * 2.2);
      this.yaw = this.yawTo(T.pos.x, T.pos.z);
      this.object.visible = true; this.targetable = true;
      G.fx.emit({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z, count: 25, color: 0x5a5a60, color2: 0x2a2a30, size: 1.5, sizeEnd: 3, life: 0.8, speed: 2, blend: 'normal', alpha: 0.7 });
      this.hitFlash = 0.3;
    }
    if (A.t > 0.95 && !A.stab) { A.stab = true; this.anim.play('stab', { speed: 1.1 }); }
    if (A.stab && this.anim.inHitWindow() && !A.hit) A.hit = this.meleeHit(T, 2.6, 1.3);
    return A.t > 1.5;
  }
}

// ======================================================================
// PRESA-BRANCA (lobo alfa)
// ======================================================================
export class AlphaBoss extends Boss {
  constructor(o) {
    super('alpha', { ...o, title: 'Fera Lendária', thresholds: [0.6, 0.3], level: o.level || 5, introRange: 24 });
  }
  onPhase() { this.startAtk('howl'); }
  onDeath() { G.story.set('alphaDead'); }
  think(dt, T) {
    const d = this.distTo(T) - T.radius;
    if (this.atkCd <= 0) {
      if (d < 3) { this.startAtk('bite'); return; }
      if (d < 10) { this.startAtk('pounce', { dir: { x: T.pos.x - this.pos.x, z: T.pos.z - this.pos.z } }); return; }
    }
    return this.approach(dt, T, 2.2, 1.05, d < 6 ? Math.sin(G.time.now) * 0.5 : 0);
  }
  atk_bite(dt, A, T) {
    if (A.first) this.anim.play('bite', { dur: 0.6 });
    this.faceYaw(this.yawTo(T.pos.x, T.pos.z), 10, dt);
    A.move = A.t > 0.15 && A.t < 0.35 ? { vx: Math.sin(this.yaw) * 6, vz: Math.cos(this.yaw) * 6, speed: 6 } : { vx: 0, vz: 0 };
    if (this.anim.inHitWindow() && !A.hit) A.hit = this.meleeHit(T, 3.0, 1);
    return A.t > 0.65;
  }
  atk_pounce(dt, A, T) {
    if (A.first) { this.anim.play('pounce', { dur: 0.9 }); G.fx.telegraph({ shape: 'rect', x: this.pos.x, z: this.pos.z, yaw: Math.atan2(A.dir.x, A.dir.z), length: 11, width: 2.4, dur: 0.35, color: 0xff4020 }); }
    if (A.t > 0.35 && A.t < 0.8) {
      const l = Math.hypot(A.dir.x, A.dir.z) || 1;
      A.move = { vx: A.dir.x / l * 16, vz: A.dir.z / l * 16, speed: 16 };
      if (!A.hit && this.distTo(T) - T.radius < 2.2) A.hit = this.meleeHit(T, 3, 1.4, { knock: 9 }) || true;
    } else A.move = { vx: 0, vz: 0 };
    return A.t > 1.0;
  }
  atk_howl(dt, A, T) {
    if (A.first) { this.anim.play('howl', { dur: 1.4 }); G.audio?.play('wolfDeath', { pos: this.pos }); }
    A.move = { vx: 0, vz: 0 };
    if (A.t > 0.8 && !A.done) { A.done = true; this.summon('wolf', 2, 8, 4); G.ui.toast('A Presa-Branca chama a matilha!', 'warn'); }
    return A.t > 1.4;
  }
}

// ======================================================================
// COLOSSO DE PEDRA
// ======================================================================
export class ColossusBoss extends Boss {
  constructor(o) {
    super('colossus', { ...o, title: 'Guardião da Montanha', thresholds: [0.5], level: o.level || 7, introRange: 30 });
    this.introLine = 'O guardião da Cratera desperta';
    this.immovable = true;
  }
  onPhase(n) {
    if (n === 2) {
      this.speed *= 1.2;
      this.startAtk('roar');
      G.ui.toast('O Colosso enfurece! Rochas despencam das paredes!', 'warn');
    }
  }
  onDeath() { G.story.set('colossusDead'); G.cameraRig.shake(0.8); }
  think(dt, T) {
    const d = this.distTo(T) - T.radius;
    if (this.atkCd <= 0) {
      const r = Math.random();
      if (this.phase >= 2 && r < 0.25) this.startAtk('rockfall');
      else if (d < 7) this.startAtk(r < 0.6 ? 'slam' : 'stomp');
      else this.startAtk(r < 0.7 ? 'throw' : 'stomp');
      return;
    }
    return this.approach(dt, T, 4, 1);
  }
  atk_roar(dt, A) {
    if (A.first) { this.anim.play('roar'); G.audio?.play('bossRoar'); G.cameraRig.shake(0.5); }
    if (A.t > 0.6 && !A.s) { A.s = true; this.summon('golem', 2, 9, 6); }
    return A.t > 1.3;
  }
  atk_slam(dt, A, T) {
    if (A.first) {
      this.anim.play('slam', { speed: 0.75 });
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      A.p = { x: this.pos.x + fx * 5, z: this.pos.z + fz * 5 };
      G.fx.telegraph({ shape: 'circle', x: A.p.x, z: A.p.z, radius: 5, dur: 1.0, color: 0xff4020 });
    }
    if (A.t < 0.4) this.faceYaw(this.yawTo(T.pos.x, T.pos.z), 2, dt);
    if (A.t > 1.0 && !A.hit) {
      A.hit = true;
      this.aoe(A.p.x, A.p.z, 5, 1.1, 'earth', { knock: 10, up: 5 });
      const y = G.world.groundAt(A.p.x, A.p.z, this.pos.y + 4);
      G.fx.burst('earth', A.p.x, y + 0.5, A.p.z, 2);
      G.fx.ring(A.p.x, y, A.p.z, 0xc8a070, 7, 0.6);
      G.cameraRig.shake(0.55);
      G.audio?.play('slam', { pos: this.pos });
    }
    return A.t > 1.9;
  }
  atk_stomp(dt, A, T) {
    if (A.first) { this.anim.play('slam', { speed: 1.0 }); G.fx.telegraph({ shape: 'circle', x: this.pos.x, z: this.pos.z, radius: 3, dur: 0.7, color: 0xffa020 }); }
    if (A.t > 0.7 && !A.wave) {
      A.wave = true;
      G.ui.toast('Pule para evitar a onda de choque! [Espaço]', 'warn');
      this.shockwave(this.pos.x, this.pos.z, 17, 1.5, 0.9, 0xc8a070, 'earth');
      G.audio?.play('slam', { pos: this.pos });
      G.cameraRig.shake(0.5);
    }
    return A.t > 2.0;
  }
  shockwave(x, z, maxR, dur, mult, color, type) {
    const y = G.world.groundAt(x, z, this.pos.y + 4);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.5), transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const geo = new THREE.TorusGeometry(1, 0.35, 4, 48);
    geo.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y + 0.4, z);
    const hit = new Set();
    G.fx.addMesh(m, dur, (it, k) => {
      const r = 1 + k * maxR;
      m.scale.set(r, 1 + (1 - k) * 2, r);
      mat.opacity = 0.85 * (1 - k * 0.6);
      for (const e of G.entities.list) {
        if (!e.alive || hit.has(e) || !isHostile(this.team, e.team) || e.team === 'object') continue;
        const d = Math.hypot(e.pos.x - x, e.pos.z - z);
        const ground = G.world.groundAt(e.pos.x, e.pos.z, e.pos.y + 1);
        if (Math.abs(d - r) < 1.0 && e.pos.y - ground < 0.5) {
          hit.add(e);
          G.combat.applyDamage(e, { amount: this.dmg * mult, type, source: this, knockback: 8, up: 4, dir: { x: e.pos.x - x, z: e.pos.z - z } });
        }
      }
      if (Math.random() < 0.6) { const a = rand(0, Math.PI * 2); G.fx.emit({ x: x + Math.cos(a) * r, y: y + 0.3, z: z + Math.sin(a) * r, count: 2, color: 0xb8a080, color2: 0x8a7a60, size: 1, sizeEnd: 2, life: 0.6, speed: 1, blend: 'normal', alpha: 0.5 }); }
    }, () => geo.dispose());
  }
  atk_throw(dt, A, T) {
    if (A.first) {
      this.anim.play('castBoth', { speed: 0.8 });
      A.p = { x: T.pos.x, z: T.pos.z };
      A.y = G.world.groundAt(A.p.x, A.p.z, T.pos.y + 3);
      G.fx.telegraph({ shape: 'circle', x: A.p.x, z: A.p.z, radius: 3.4, dur: 1.5, color: 0xff4020 });
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 0), new THREE.MeshStandardMaterial({ color: 0x6a6460, flatShading: true }));
      rock.castShadow = true;
      const from = new THREE.Vector3(this.pos.x, this.pos.y + 7, this.pos.z);
      const to = new THREE.Vector3(A.p.x, A.y, A.p.z);
      G.fx.addMesh(rock, 1.5, (it, k) => {
        const kk = clamp((it.t - 0.4) / 1.1, 0, 1);
        rock.position.lerpVectors(from, to, kk);
        rock.position.y += Math.sin(kk * Math.PI) * 9;
        rock.rotation.x += 0.1; rock.rotation.z += 0.07;
        rock.visible = it.t > 0.35;
      });
    }
    this.faceYaw(this.yawTo(A.p.x, A.p.z), 4, dt);
    if (A.t > 1.5 && !A.hit) {
      A.hit = true;
      this.aoe(A.p.x, A.p.z, 3.6, 1.0, 'earth', { knock: 9, up: 4 });
      G.fx.burst('earth', A.p.x, A.y + 0.5, A.p.z, 2);
      G.fx.ring(A.p.x, A.y, A.p.z, 0xc8a070, 5, 0.5);
      G.cameraRig.shake(0.35);
      G.audio?.play('explosion', { pos: { x: A.p.x, y: A.y, z: A.p.z } });
    }
    return A.t > 1.9;
  }
  atk_rockfall(dt, A, T) {
    if (A.first) {
      this.anim.play('roar');
      G.audio?.play('bossRoar');
      A.spots = [];
      for (let i = 0; i < 7; i++) {
        const a = rand(0, Math.PI * 2), r = i === 0 ? 0 : rand(2, 8);
        const p = { x: T.pos.x + Math.cos(a) * r, z: T.pos.z + Math.sin(a) * r, delay: i * 0.15 };
        A.spots.push(p);
        setTimeout(() => G.fx.telegraph({ shape: 'circle', x: p.x, z: p.z, radius: 2.6, dur: 1.2, color: 0xff3020, onDone: () => {
          const y = G.world.groundAt(p.x, p.z, 50);
          this.aoe(p.x, p.z, 2.6, 0.8, 'earth', { knock: 5, up: 2 });
          G.fx.burst('earth', p.x, y + 0.5, p.z, 1.2);
          G.audio?.play('thud', { pos: { x: p.x, y, z: p.z } });
          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 0), new THREE.MeshStandardMaterial({ color: 0x6a6460, flatShading: true }));
          rock.position.set(p.x, y + 0.6, p.z);
          G.fx.addMesh(rock, 2.5, (it, k) => { if (k > 0.7) rock.scale.setScalar(1 - (k - 0.7) / 0.3); });
        } }), p.delay * 1000);
      }
    }
    return A.t > 2.3;
  }
}

// ======================================================================
// SIR PIMPOLHO, O BOBO DE TINTA
// ======================================================================
export class PimpolhoBoss extends Boss {
  constructor(o) {
    super('pimpolho', { ...o, title: 'Guardião do Castelo', yieldAt: 0.15, thresholds: [0.5], level: o.level || 8, introRange: 26 });
    this.introLine = 'Ninguém entra no quarto da princesa!';
    this.lineT = 8;
  }
  onIntro() { this.say('Quem vem lá, quem vem lá? No castelo ninguém entra! Volte já!'); }
  onPhase(n) { if (n === 2) { this.say('Ai, que dor, ai, que ardor! Rabiscos, venham, por favor!'); this.summon('doodle', 3, 7, 7); } }
  onYield() { this.scripted = false; setTimeout(() => G.questCtx.dialogue('pimpolho_derrota', 'start'), 800); }
  think(dt, T) {
    this.lineT -= dt;
    if (this.lineT <= 0) { this.lineT = rand(10, 16); this.say(pick(['Uma torta pra você, que fome deve ter!', 'Pula, pula, cabeça de abóbora!', 'Bum, bum, bombinhas! Corre, corre, perninhas!', 'Eu sou grande, eu sou forte, eu protejo a princesinha de toda má sorte!'])); }
    const d = this.distTo(T);
    if (this.atkCd <= 0) {
      const r = Math.random();
      if (this.phase >= 2 && r < 0.28) this.startAtk('anvils');
      else if (r < 0.45) this.startAtk('pie');
      else if (r < 0.75) this.startAtk('bounce');
      else this.startAtk('bombs');
      return;
    }
    return this.approach(dt, T, 9, 1, Math.sin(G.time.now * 0.8) * 0.8);
  }
  atk_pie(dt, A, T) {
    if (A.first) this.anim.play('cast', { speed: 0.9 });
    this.faceYaw(this.yawTo(T.pos.x, T.pos.z), 8, dt);
    if (A.t > 0.38 && !A.fired) {
      A.fired = true;
      const origin = new THREE.Vector3(this.pos.x + Math.sin(this.yaw) * 2, this.pos.y + 4, this.pos.z + Math.cos(this.yaw) * 2);
      const tgt = T.center.clone();
      const dir = tgt.sub(origin).normalize();
      dir.y += 0.12;
      G.projectiles.spawn({ pos: origin, dir: dir.normalize(), speed: 20, team: this.team, element: 'toon', visual: 'pie', size: 3.2, gravity: 5, source: this,
        material: new THREE.MeshToonMaterial({ color: 0xffe8c0 }),
        damage: { amount: this.dmg * 0.6, type: 'toon', status: [{ id: 'blind', dur: 3 }] },
        explode: { radius: 3.2, info: { amount: this.dmg * 0.6, type: 'toon', status: [{ id: 'blind', dur: 3 }], knockback: 5 }, light: 0xffe0a0, ringColor: 0xffffff, sound: 'mallet', fxScale: 1.5,
          onExplode: (p) => G.ui.comicText(new THREE.Vector3(p.x, p.y + 2, p.z), 'SPLAT!') } });
    }
    return A.t > 0.9;
  }
  atk_bounce(dt, A, T) {
    if (A.first) {
      A.from = this.pos.clone();
      A.to = new THREE.Vector3(T.pos.x, 0, T.pos.z);
      A.to.y = G.world.groundAt(A.to.x, A.to.z, T.pos.y + 3);
      G.fx.telegraph({ shape: 'circle', x: A.to.x, z: A.to.z, radius: 4.4, dur: 1.4, color: 0xff3080 });
      this.anim.play('castBoth', { speed: 1.2 });
      G.audio?.play('whistle');
    }
    if (A.t > 0.3 && A.t < 1.4) {
      this.scripted = true;
      const k = (A.t - 0.3) / 1.1;
      this.pos.x = lerp(A.from.x, A.to.x, k);
      this.pos.z = lerp(A.from.z, A.to.z, k);
      this.pos.y = lerp(A.from.y, A.to.y, k) + Math.sin(k * Math.PI) * 12;
      this.faceYaw(this.yawTo(A.to.x, A.to.z), 6, dt);
    }
    if (A.t >= 1.4 && !A.landed) {
      A.landed = true;
      this.scripted = false;
      this.pos.copy(A.to);
      this.vel.y = 0;
      this.aoe(A.to.x, A.to.z, 4.4, 1.2, 'toon', { knock: 11, up: 7 });
      G.ui.comicText(new THREE.Vector3(A.to.x, A.to.y + 3, A.to.z), 'BOING!');
      G.fx.burst('toon', A.to.x, A.to.y + 0.5, A.to.z, 2);
      G.fx.ring(A.to.x, A.to.y, A.to.z, 0xff60c0, 6, 0.5);
      G.cameraRig.shake(0.5);
      G.audio?.play('mallet', { pos: A.to });
      this.flattenT = 0.35;
    }
    return A.t > 1.9;
  }
  atk_bombs(dt, A, T) {
    if (A.first) this.anim.play('castBoth', { speed: 1 });
    if (A.t > 0.45 && !A.fired) {
      A.fired = true;
      for (let i = 0; i < 3; i++) {
        const a = rand(0, Math.PI * 2), r = i === 0 ? rand(0, 1.5) : rand(3, 6);
        const p = { x: T.pos.x + Math.cos(a) * r, z: T.pos.z + Math.sin(a) * r };
        const y = G.world.groundAt(p.x, p.z, T.pos.y + 3);
        const bomb = new THREE.Group();
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), new THREE.MeshToonMaterial({ color: 0x1a1a1a }));
        const ol = new THREE.Mesh(ball.geometry, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })); ol.scale.setScalar(1.08);
        const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 5), new THREE.MeshBasicMaterial({ color: 0xc8a060 })); fuse.position.y = 0.85;
        bomb.add(ball, ol, fuse);
        const from = new THREE.Vector3(this.pos.x, this.pos.y + 4, this.pos.z);
        const to = new THREE.Vector3(p.x, y + 0.7, p.z);
        G.fx.telegraph({ shape: 'circle', x: p.x, z: p.z, radius: 3.2, dur: 2.0, color: 0xff2020 });
        G.fx.addMesh(bomb, 2.0, (it, k) => {
          const kk = clamp(it.t / 0.8, 0, 1);
          bomb.position.lerpVectors(from, to, kk);
          bomb.position.y += Math.sin(kk * Math.PI) * 6;
          if (kk >= 1) { const s = 1 + Math.sin(it.t * 30) * 0.08 * (it.t - 0.8); bomb.scale.setScalar(s); }
          if (Math.random() < 0.7) G.fx.emit({ x: bomb.position.x, y: bomb.position.y + 1.1, z: bomb.position.z, count: 1, color: 0xffe080, color2: 0xff4010, size: 0.3, life: 0.3, speed: 2 });
        }, () => {
          this.aoe(p.x, p.z, 3.2, 1.0, 'toon', { knock: 9, up: 5 });
          G.fx.burst('fire', p.x, y + 0.6, p.z, 1.3);
          G.fx.burst('toon', p.x, y + 0.6, p.z, 1);
          G.ui.comicText(new THREE.Vector3(p.x, y + 2.5, p.z), 'KABOOM!');
          G.audio?.play('explosion', { pos: { x: p.x, y, z: p.z } });
          G.cameraRig.shake(0.3);
        });
      }
    }
    return A.t > 2.6;
  }
  atk_anvils(dt, A, T) {
    if (A.first) { this.anim.play('cheer'); this.say('Choveu bigorna! Que coisa enorme!'); }
    if (A.t > 0.4 && !A.done) {
      A.done = true;
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          if (!this.alive || this.yielded) return;
          const a = rand(0, Math.PI * 2), r = i === 0 ? 0 : rand(2, 7);
          const p = { x: T.pos.x + Math.cos(a) * r, z: T.pos.z + Math.sin(a) * r };
          dropAnvil(p, this, this.dmg * 0.9, this.team, 0.9);
        }, i * 220);
      }
    }
    return A.t > 2.6;
  }
}

// Bigorna genérica (usada pelo Pimpolho e pelo aliado Pimpolho)
export function dropAnvil(p, source, dmg, team, fall = 0.9) {
  const y = G.world.groundAt(p.x, p.z, 60);
  G.fx.telegraph({ shape: 'circle', x: p.x, z: p.z, radius: 2.4, dur: fall, color: team === 'enemy' ? 0xff2060 : 0x60c0ff });
  const g = new THREE.Group();
  const mat = new THREE.MeshToonMaterial({ color: 0x4a4a58 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 1.0), mat); top.position.y = 1.5;
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.7), mat); waist.position.y = 0.85;
  const foot = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.1), mat); foot.position.y = 0.22;
  g.add(top, waist, foot);
  g.position.set(p.x, y + 20, p.z);
  G.audio?.play('whistle');
  G.fx.addMesh(g, fall + 1.0, (it) => {
    if (it.t < fall) g.position.y = lerp(y + 20, y, easeInCubic(it.t / fall));
    else {
      if (!it.landed) {
        it.landed = true;
        g.position.y = y;
        const foes = G.combat.areaDamage(p.x, y + 1, p.z, 2.4, team, { amount: dmg, type: 'toon', source, poise: 60, status: [{ id: 'stun', dur: 1.2 }] });
        for (const e of foes) if (!e.boss && e !== G.player) e.flattenT = 2;
        if (foes.includes(G.player)) G.player.flattenT = 0.6;
        G.ui.comicText(new THREE.Vector3(p.x, y + 2.5, p.z), 'BONK!');
        G.fx.burst('toon', p.x, y + 0.5, p.z, 1);
        G.audio?.play('anvil', { pos: { x: p.x, y, z: p.z } });
      }
      if (it.t > fall + 0.7) g.scale.setScalar(Math.max(0.01, (fall + 1.0 - it.t) / 0.3));
    }
  });
}

// ======================================================================
// VAELTHOR, O ARQUIMAGO PARTIDO
// ======================================================================
export class VaelthorBoss extends Boss {
  constructor(o) {
    super('vaelthor', { ...o, title: 'O Fim da Jornada', yieldAt: 0.03, thresholds: [0.66, 0.33], level: o.level || 11, introRange: 40, hpMul: o.wavered ? 0.75 : 1 });
    this.introLine = o.wavered ? 'Sua mão treme...' : 'O Véu cairá';
    this.wavered = !!o.wavered;
    this.center0 = new THREE.Vector3(0, 0, -305);
    this.speed = 4.5;
  }
  onIntro() { this.say(this.wavered ? 'Lyra... me perdoe.' : 'Por Lyra, o mundo inteiro pode queimar!'); }
  onPhase(n) {
    if (n === 2) this.startAtk('phase2');
    if (n === 3) this.startAtk('phase3');
  }
  onYield() { setTimeout(() => G.questCtx.vaelthorYield(this), 900); }
  think(dt, T) {
    const d = this.distTo(T);
    if (this.atkCd <= 0) {
      const r = Math.random();
      if (this.phase === 1) this.startAtk(r < 0.4 ? 'orbs' : r < 0.75 ? 'strikes' : 'teleport');
      else if (this.phase === 2) this.startAtk(r < 0.25 ? 'orbs' : r < 0.45 ? 'strikes' : r < 0.65 ? 'wave' : r < 0.85 ? 'beam' : 'teleport');
      else this.startAtk(r < 0.25 ? 'meteors' : r < 0.45 ? 'nova' : r < 0.65 ? 'wave' : r < 0.85 ? 'orbs' : 'beam');
      return;
    }
    // mantém-se dentro da arena
    const dc = Math.hypot(this.pos.x - this.center0.x, this.pos.z - this.center0.z);
    if (dc > 18) {
      const yaw = this.yawTo(this.center0.x, this.center0.z);
      return { vx: Math.sin(yaw) * this.speed, vz: Math.cos(yaw) * this.speed, speed: this.speed };
    }
    return this.approach(dt, T, 11, 0.9, Math.sin(G.time.now * 0.6) * 0.7);
  }
  atk_orbs(dt, A, T) {
    if (A.first) this.anim.play('cast', { speed: 0.9 });
    this.faceYaw(this.yawTo(T.pos.x, T.pos.z), 8, dt);
    const n = this.phase >= 3 ? 5 : 3;
    if (A.t > 0.4 && !A.fired) {
      A.fired = true;
      for (let i = 0; i < n; i++) {
        const origin = new THREE.Vector3(this.pos.x, this.pos.y + 2.4, this.pos.z);
        const dir = T.center.clone().sub(origin).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - (n - 1) / 2) * 0.35);
        dir.y += 0.3;
        G.projectiles.spawn({ pos: origin, dir: dir.normalize(), speed: 13, team: this.team, element: 'rift', visual: 'sphere', color: 0xc060ff, size: 1.1, homing: T, homingRate: 1.4, life: 4, source: this,
          damage: { amount: this.dmg * 0.75, type: 'rift' } });
      }
      G.audio?.play('darkOrb', { pos: this.pos });
    }
    return A.t > 0.9;
  }
  atk_strikes(dt, A, T) {
    if (A.first) { this.anim.play('castBoth', { speed: 0.8 }); A.n = 0; }
    const count = this.phase >= 2 ? 4 : 3;
    const tNext = 0.3 + A.n * 0.45;
    if (A.n < count && A.t > tNext) {
      A.n++;
      const p = { x: T.pos.x + (T.moveVel ? T.moveVel.x * 0.3 : 0), z: T.pos.z + (T.moveVel ? T.moveVel.z * 0.3 : 0) };
      G.fx.telegraph({ shape: 'circle', x: p.x, z: p.z, radius: 2.4, dur: 0.85, color: 0xa080ff, onDone: () => {
        const y = G.world.groundAt(p.x, p.z, 30);
        G.fx.lightning(new THREE.Vector3(p.x, y + 22, p.z), new THREE.Vector3(p.x, y, p.z), 0xd0a0ff);
        this.aoe(p.x, p.z, 2.4, 0.9, 'lightning', { knock: 4, up: 2 });
        G.audio?.play('thunder', { pos: { x: p.x, y, z: p.z } });
      } });
    }
    return A.t > 0.3 + count * 0.45 + 0.6;
  }
  atk_teleport(dt, A, T) {
    if (A.first) { G.fx.burst('rift', this.pos.x, this.pos.y + 1.5, this.pos.z, 1.4); this.object.visible = false; this.targetable = false; G.audio?.play('power_passo_sombrio', { pos: this.pos }); }
    if (A.t > 0.6 && !A.done) {
      A.done = true;
      const a = rand(0, Math.PI * 2), r = rand(9, 16);
      this.pos.set(this.center0.x + Math.cos(a) * r, 0, this.center0.z + Math.sin(a) * r);
      this.pos.y = G.world.groundAt(this.pos.x, this.pos.z, 30) + 0.9;
      this.object.visible = true; this.targetable = true;
      G.fx.burst('rift', this.pos.x, this.pos.y + 1.5, this.pos.z, 1.4);
    }
    return A.t > 0.9;
  }
  atk_wave(dt, A, T) {
    if (A.first) { this.anim.play('castSelf'); G.fx.telegraph({ shape: 'circle', x: this.pos.x, z: this.pos.z, radius: 3, dur: 0.8, color: 0xff60ff }); }
    if (A.t > 0.8 && !A.done) {
      A.done = true;
      ColossusBoss.prototype.shockwave.call(this, this.pos.x, this.pos.z, 22, 1.8, 0.9, 0xd070ff, 'psychic');
      G.post.target.psychic = 1; setTimeout(() => (G.post.target.psychic = 0), 700);
      G.audio?.play('power_telecinese', { pos: this.pos });
    }
    return A.t > 1.6;
  }
  atk_beam(dt, A, T) {
    if (A.first) {
      this.anim.play('cast', { dur: 1.6 });
      A.yaw = this.yawTo(T.pos.x, T.pos.z);
      A.tel = G.fx.telegraph({ shape: 'rect', x: this.pos.x, z: this.pos.z, yaw: A.yaw, length: 34, width: 2.2, dur: 1.1, color: 0xb040ff });
    }
    this.faceYaw(A.yaw, 10, dt);
    if (A.t > 1.1 && !A.fired) {
      A.fired = true;
      const from = new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z);
      const dir = new THREE.Vector3(Math.sin(A.yaw), 0, Math.cos(A.yaw));
      const to = from.clone().addScaledVector(dir, 34);
      G.fx.beam(from, to, 0xb050ff, 0.9, 0.6, { boost: 2.5 });
      for (const e of G.entities.list) {
        if (!e.alive || !isHostile(this.team, e.team) || e.team === 'object') continue;
        _v.subVectors(e.pos, from); _v.y = 0;
        const t = clamp(_v.dot(dir), 0, 34);
        const cx = from.x + dir.x * t, cz = from.z + dir.z * t;
        if (Math.hypot(e.pos.x - cx, e.pos.z - cz) < 1.1 + e.radius) G.combat.applyDamage(e, { amount: this.dmg * 1.3, type: 'shadow', source: this, knockback: 6 });
      }
      G.cameraRig.shake(0.3);
      G.audio?.play('power_lanca_solar', { pos: this.pos });
    }
    return A.t > 1.7;
  }
  atk_meteors(dt, A, T) {
    if (A.first) { this.anim.play('castBoth', { speed: 0.7 }); this.say('Caia, céu do Sonhar!'); }
    if (A.t > 0.3 && !A.done) {
      A.done = true;
      for (let i = 0; i < 9; i++) {
        setTimeout(() => {
          if (!this.alive || this.yielded) return;
          const a = rand(0, Math.PI * 2), r = i === 0 ? 0 : rand(2, 10);
          const p = { x: T.pos.x + Math.cos(a) * r, z: T.pos.z + Math.sin(a) * r };
          G.fx.telegraph({ shape: 'circle', x: p.x, z: p.z, radius: 2.8, dur: 1.1, color: 0xc040ff, onDone: () => {
            const y = G.world.groundAt(p.x, p.z, 30);
            this.aoe(p.x, p.z, 2.8, 0.85, 'rift', { knock: 6, up: 3 });
            G.fx.burst('rift', p.x, y + 0.5, p.z, 1.5);
            G.fx.flash(p.x, y + 2, p.z, 0xb060ff, 40, 0.3);
            G.audio?.play('explosion', { pos: { x: p.x, y, z: p.z } });
          } });
        }, i * 160);
      }
    }
    return A.t > 2.6;
  }
  atk_nova(dt, A, T) {
    if (A.first) {
      this.anim.play('castSelf', { dur: 1.8 });
      G.fx.telegraph({ shape: 'circle', x: this.pos.x, z: this.pos.z, radius: 9.5, dur: 1.6, color: 0xff3080 });
      this.say('Afaste-se... ou desapareça!');
    }
    if (A.t > 1.6 && !A.done) {
      A.done = true;
      this.aoe(this.pos.x, this.pos.z, 9.5, 1.6, 'rift', { knock: 14, up: 6 });
      G.fx.burst('rift', this.pos.x, this.pos.y + 1, this.pos.z, 3);
      G.fx.ring(this.pos.x, this.pos.y - 0.8, this.pos.z, 0xd070ff, 11, 0.6);
      G.fx.flash(this.pos.x, this.pos.y + 2, this.pos.z, 0xc060ff, 120, 0.6, 40);
      G.cameraRig.shake(0.7);
      G.audio?.play('eruption', { pos: this.pos });
    }
    return A.t > 2.2;
  }
  atk_phase2(dt, A, T) {
    if (A.first) {
      this.invulnerable = true;
      this.anim.play('roar');
      this.say('Vocês acham que podem me deter? Ecos, ergam-se!');
      G.audio?.play('bossRoar');
      G.questCtx.vaelthorPhase2(this);
    }
    if (A.t > 1.2 && !A.s) { A.s = true; this.summon('wisp', 3, 8, 10); this.summon('echoKnight', 1, 8, 10); }
    if (A.t > 2.5) { this.invulnerable = false; return true; }
    return false;
  }
  atk_phase3(dt, A, T) {
    if (A.first) {
      this.invulnerable = true;
      this.say('O CORAÇÃO... É... MEU!');
      G.audio?.play('bossRoar');
      G.post.target.rift = 1;
      const hc = G.world.heartCore;
      A.hcFrom = hc.position.clone();
    }
    const hc = G.world.heartCore;
    if (A.t < 2.0) {
      // o núcleo desce até ele
      hc.position.lerpVectors(A.hcFrom, new THREE.Vector3(this.pos.x, this.pos.y + 2, this.pos.z), easeInCubic(A.t / 2));
      if (Math.random() < 0.5) G.fx.trail('rift', hc.position.x, hc.position.y, hc.position.z, 3);
    } else if (!A.merged) {
      A.merged = true;
      hc.visible = false;
      this.object.scale.setScalar(1.7);
      this.height *= 1.7;
      this.radius *= 1.5;
      this.statusTint = null;
      this.material.emissive.setHex(0x5010a0);
      this.baseEmissive = new THREE.Color(0x5010a0);
      this.displayName = 'Vaelthor, Avatar da Fenda';
      G.ui.setBoss(this);
      G.fx.burst('rift', this.pos.x, this.pos.y + 2, this.pos.z, 3);
      G.fx.flash(this.pos.x, this.pos.y + 3, this.pos.z, 0xc060ff, 150, 1, 50);
      G.cameraRig.shake(0.8);
    }
    if (A.t > 3.0) { this.invulnerable = false; return true; }
    return false;
  }
  syncObject(dt) {
    super.syncObject(dt);
    if (this.baseEmissive && this.hitFlash <= 0 && this.material) this.material.emissive.copy(this.baseEmissive);
    if (this.alive && Math.random() < dt * 8) G.fx.trail('rift', this.pos.x + rand(-0.6, 0.6), this.pos.y + rand(0.5, 2.5), this.pos.z + rand(-0.6, 0.6));
  }
}

// ======================================================================
// ALIADOS
// ======================================================================
export class Ally extends Enemy {
  constructor(type, o = {}) {
    super(type, { ...o, team: 'ally', ally: true, follow: true, level: o.level || Math.max(5, G.stats.level) });
    this.allyId = o.allyId;
    this.kind = 'ally';
    this.anvilT = 8;
    this.statusImmune = ['charm'];
    this.name = this.def.name;
    this.displayName = this.def.name;
  }
  update(dt) {
    super.update(dt);
    if (!this.alive) return;
    // Pimpolho aliado: bigornas no alvo
    if (this.type === 'allyJester' && G.state === 'play') {
      this.anvilT -= dt;
      if (this.anvilT <= 0) {
        const T = G.entities.list.find((e) => e.boss && e.alive && e.team === 'enemy' && !e.invulnerable) || this.aiTarget;
        if (T && T.alive && this.distTo(T) < 35) {
          this.anvilT = rand(10, 15);
          G.ui.showSubtitle('Sir Pimpolho: “Lá vai bigorna, segura essa, que coisa enorme!”', 2.5);
          dropAnvil({ x: T.pos.x, z: T.pos.z }, this, 60 * (1 + G.stats.level * 0.05), 'ally', 1.0);
        } else this.anvilT = 2;
      }
    }
  }
  die() {
    super.die();
    if (this.allyId) G.story.set(this.allyId + 'Down');
  }
}
