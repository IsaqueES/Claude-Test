// Entidade base com física simples, colisão e modelo animado.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, dampAngle } from '../core/math.js';

let UID = 0;

export class Entity {
  constructor(o = {}) {
    this.id = o.id || 'e' + ++UID;
    this.kind = o.kind || 'entity';
    this.team = o.team || 'neutral';
    this.name = o.name || '';
    this.pos = new THREE.Vector3(o.x || 0, o.y ?? 0, o.z || 0);
    this.vel = new THREE.Vector3();
    this.knock = new THREE.Vector3();
    this.yaw = o.yaw || 0;
    this.radius = o.radius ?? 0.4;
    this.height = o.height ?? 1.8;
    this.mass = o.mass ?? 1;
    this.maxHp = o.hp ?? 100;
    this.hp = this.maxHp;
    this.alive = true;
    this.grounded = true;
    this.flying = !!o.flying;
    this.hoverHeight = o.hoverHeight ?? 0;
    this.gravity = o.gravity ?? 26;
    this.object = new THREE.Group();
    this.object.name = this.id;
    this.model = null;
    this.status = {};
    this.stunT = 0;
    this.hitFlash = 0;
    this.invulnT = 0;
    this.inWater = 0;
    this.speedMul = 1;
    this.removed = false;
    this.targetable = o.targetable ?? true;
    this.resist = o.resist || {};
    this.level = o.level || 1;
    this.flattenT = 0;
    this.liftT = 0;
    this.y0 = 0;
    if (o.y === undefined && G.world) this.pos.y = G.world.groundAt(this.pos.x, this.pos.z, 999);
  }

  setModel(m) {
    this.model = m;
    this.object.add(m.built.mesh);
    for (const e of m.built.extra || []) m.built.mesh.add(e);
    this.material = m.built.material;
    return this;
  }

  addToScene(scene = G.scene) { scene.add(this.object); return this; }

  get center() { return this._c || (this._c = new THREE.Vector3()), this._c.set(this.pos.x, this.pos.y + this.height * 0.55, this.pos.z); }

  distTo(e) { return Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z); }

  yawTo(x, z) { return Math.atan2(x - this.pos.x, z - this.pos.z); }

  faceYaw(target, rate, dt) { this.yaw = dampAngle(this.yaw, target, rate, dt); }

  // Movimento horizontal desejado (vx, vz em u/s). Aplica knockback, colisão e gravidade.
  physics(dt, vx = 0, vz = 0) {
    const W = G.world;
    const col = W.collision;
    const mul = this.speedMul * (this.inWater > 0.4 ? 0.62 : 1);
    let mx = (vx * mul + this.knock.x) * dt;
    let mz = (vz * mul + this.knock.z) * dt;
    const kd = Math.exp(-dt * (this.grounded ? 7 : 1.5));
    this.knock.x *= kd; this.knock.z *= kd;
    // subdivide movimentos grandes
    const dist = Math.hypot(mx, mz);
    const steps = Math.max(1, Math.ceil(dist / 0.6));
    for (let s = 0; s < steps; s++) {
      const sx = mx / steps, sz = mz / steps;
      let tx = this.pos.x + sx, tz = this.pos.z + sz;
      if (col.terrainBlocks(this.pos.x, this.pos.z, tx, tz, this.pos.y)) {
        if (!col.terrainBlocks(this.pos.x, this.pos.z, tx, this.pos.z, this.pos.y)) tz = this.pos.z;
        else if (!col.terrainBlocks(this.pos.x, this.pos.z, this.pos.x, tz, this.pos.y)) tx = this.pos.x;
        else { tx = this.pos.x; tz = this.pos.z; this.knock.x = this.knock.z = 0; }
      }
      this.pos.x = tx; this.pos.z = tz;
      col.resolve(this.pos, this.radius, this.height);
    }
    // vertical
    const g = W.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.6);
    if (this.flying) {
      const target = g + this.hoverHeight;
      this.pos.y += (target - this.pos.y) * clamp(dt * 3, 0, 1) + this.vel.y * dt;
      this.vel.y *= Math.exp(-dt * 3);
      this.grounded = false;
    } else if (this.liftT > 0) {
      // levitação (telecinese): segue posição forçada
      this.grounded = false;
    } else {
      this.vel.y -= this.gravity * dt;
      this.pos.y += this.vel.y * dt;
      if (this.pos.y <= g) {
        if (!this.grounded && this.vel.y < -14) this.onHardLanding?.(-this.vel.y);
        this.pos.y = g;
        if (this.vel.y < 0) this.vel.y = 0;
        this.grounded = true;
      } else if (this.grounded && this.vel.y <= 0 && this.pos.y - g < 0.45) {
        this.pos.y = g; // acompanha descidas
        this.vel.y = 0;
      } else {
        this.grounded = false;
      }
    }
    // água
    const w = W.terrain.waterAt(this.pos.x, this.pos.z);
    this.inWater = w ? clamp(w.surface - this.pos.y, 0, 2) : 0;
  }

  applyKnockback(dx, dz, force, up = 0) {
    const l = Math.hypot(dx, dz) || 1;
    const k = force / Math.max(0.5, this.mass);
    this.knock.x += (dx / l) * k;
    this.knock.z += (dz / l) * k;
    if (up > 0 && !this.flying) { this.vel.y = Math.max(this.vel.y, up / Math.max(0.6, this.mass * 0.8)); this.grounded = false; }
  }

  syncObject(dt) {
    this.object.position.copy(this.pos);
    this.object.rotation.y = this.yaw;
    // achatamento cartunesco
    if (this.flattenT > 0) {
      this.flattenT -= dt;
      const k = this.flattenT > 0.3 ? 1 : this.flattenT / 0.3;
      this.object.scale.set(1 + 0.6 * k, 1 - 0.85 * k, 1 + 0.6 * k);
    } else this.object.scale.set(1, 1, 1);
    // piscar ao ser atingido
    if (this.material) {
      if (this.hitFlash > 0) {
        this.hitFlash -= dt;
        const k = Math.max(0, this.hitFlash / 0.15);
        this.material.emissive.setRGB(k * 0.9, k * 0.85, k * 0.8);
      } else if (this.statusTint) {
        this.material.emissive.copy(this.statusTint);
      } else this.material.emissive.setRGB(0, 0, 0);
    }
  }

  remove() {
    this.removed = true;
    this.object.parent?.remove(this.object);
  }
}
