// NPCs: personagens com quem se conversa, com rotinas simples e visibilidade condicional.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { rand, dampAngle } from '../core/math.js';
import { Entity } from './Entity.js';
import { buildNPCModel, buildEnemyModel } from './Models.js';
import { buildDoodle } from './Rig.js';
import { HumanoidAnimator } from './Animator.js';

export class NPC extends Entity {
  constructor(def) {
    super({ kind: 'npc', team: 'neutral', x: def.x, z: def.z, radius: 0.4, height: 1.8 * (def.scale || 1), id: def.id, name: def.name });
    this.def = def;
    this.title = def.title || '';
    this.dialogueId = def.dialogue || def.id;
    this.home = new THREE.Vector3(def.x, this.pos.y, def.z);
    this.wanderR = def.wander || 0;
    this.wanderTo = null;
    this.wanderT = rand(2, 6);
    this.fixed = !def.wander;
    this.mass = 3;
    this.scale = def.scale || 1;
    this.talking = false;
    this.faceTarget = null;
    this.yaw = def.yaw ?? 0;
    this.baseYaw = this.yaw;
    this.visibleCond = def.visible || null;
    this.visible = true;
    this.big = !!def.big;
    this.ghost = !!def.ghost;
    this.talkable = def.talkable !== false;
    this.sit = !!def.sit;
    let m;
    if (def.model === 'tico') {
      const built = buildDoodle({ body: def.colorful ? 0xfff0a0 : 0xffffff, accent: 0x222222, hat: def.colorful ? 0x3a8ae8 : null, shoes: def.colorful ? 0xe83a3a : 0x888888, scale: 0.85,
        extra: (R, s) => { if (def.colorful) R.part('chest', new THREE.SphereGeometry(0.12 * s, 8, 6), 0xe83a3a, { y: 0.05 * s, z: 0.3 * s, sz: 0.4, outline: false }); } });
      m = { built, anim: new HumanoidAnimator(built, { style: 'doodle' }) };
    } else if (def.model === 'enemy') {
      m = buildEnemyModel(def.enemyModel);
    } else {
      m = buildNPCModel(def.look || 'villagerM', def.lookOverrides || {});
    }
    this.setModel(m);
    this.anim = m.anim;
    if (def.scale && def.model !== 'tico') m.built.mesh.scale.setScalar(def.scale);
    if (this.ghost) {
      this.material.transparent = true;
      this.material.opacity = 0.55;
      this.material.emissive = new THREE.Color(0x3a6aa0);
      this.ghostGlow = true;
    }
    this.nameTag = def.nameTag ?? true;
  }

  get talkRange() { return this.big ? 6 : 3.0; }

  checkVisible() {
    const v = this.visibleCond ? !!this.visibleCond(G.questCtx) : true;
    if (v !== this.visible) {
      this.visible = v;
      this.object.visible = v;
      this.targetable = false;
      this.noCollide = !v;
    }
    return v;
  }

  moveTo(x, z, yaw) {
    this.pos.set(x, G.world.groundAt(x, z, 999), z);
    this.home.copy(this.pos);
    if (yaw !== undefined) { this.yaw = yaw; this.baseYaw = yaw; }
  }

  update(dt) {
    if (!this.checkVisible()) return;
    const p = G.player;
    let speed = 0, vx = 0, vz = 0;
    const near = p && this.distTo(p) < 5;
    if (this.talking || (near && !this.wanderTo)) {
      const t = this.faceTarget || p;
      if (t) this.yaw = dampAngle(this.yaw, this.yawTo(t.pos.x, t.pos.z), 5, dt);
    } else if (this.wanderR > 0 && G.state === 'play') {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = rand(4, 9);
        const a = rand(0, Math.PI * 2), r = rand(1, this.wanderR);
        this.wanderTo = Math.random() < 0.65 ? new THREE.Vector3(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r) : null;
      }
      if (this.wanderTo) {
        const dx = this.wanderTo.x - this.pos.x, dz = this.wanderTo.z - this.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.6) {
          this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 5, dt);
          speed = this.def.walkSpeed || 1.6;
          vx = Math.sin(this.yaw) * speed; vz = Math.cos(this.yaw) * speed;
        } else this.wanderTo = null;
      }
    } else if (!near) {
      this.yaw = dampAngle(this.yaw, this.baseYaw, 2, dt);
    }
    if (this.wanderR > 0) this.physics(dt, vx, vz);
    else this.pos.y = G.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 1);
    if (this.def.float) this.pos.y += Math.sin(G.time.now * 1.5) * 0.15 + this.def.float;
    this.anim.update(dt, { speed, grounded: true, talk: this.talking, sit: this.sit });
    if (this.ghostGlow) this.material.opacity = 0.45 + Math.sin(G.time.now * 2) * 0.1;
    this.syncObject(dt);
  }
}

export class NPCManager {
  constructor() {
    this.map = {};
    this.list = [];
  }

  spawnAll(defs) {
    for (const d of defs) {
      const n = new NPC(d);
      this.map[d.id] = n;
      this.list.push(n);
      G.entities.add(n);
    }
  }

  add(def) {
    if (this.map[def.id]) return this.map[def.id];
    const n = new NPC(def);
    this.map[def.id] = n;
    this.list.push(n);
    G.entities.add(n);
    return n;
  }

  get(id) { return this.map[id]; }

  nearestTalkable(pos, maxD) {
    let best = null, bd = Infinity;
    for (const n of this.list) {
      if (n.removed || !n.visible || !n.talkable || !n.alive) continue;
      const d = Math.hypot(n.pos.x - pos.x, n.pos.z - pos.z);
      const range = Math.max(maxD, n.talkRange);
      if (d < range && d < bd && Math.abs(n.pos.y - pos.y) < 3) { bd = d; best = n; }
    }
    return best;
  }

  removeNPC(id) {
    const n = this.map[id];
    if (!n) return;
    n.remove();
    delete this.map[id];
    this.list = this.list.filter((x) => x !== n);
  }
}
