// Jogador: movimento, corrida, pulo, esquiva, combo de espada, bloqueio/aparo, poderes e interação.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { input } from '../core/Input.js';
import { events } from '../core/Events.js';
import { clamp, damp, dampAngle, angleDiff } from '../core/math.js';
import { Entity } from './Entity.js';
import { buildPlayerModel } from './Models.js';
import { SwordTrail } from '../combat/FX.js';
import { isHostile } from './Entities.js';

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

export class Player extends Entity {
  constructor(app) {
    super({ kind: 'player', team: 'player', radius: 0.42, height: 1.8, hp: 100, id: 'player', name: app.name });
    this.app = app;
    this.mana = 50;
    this.stamina = 100;
    this.state = 'normal';
    this.combo = 0;
    this.comboQueued = false;
    this.attackHit = new Set();
    this.rollT = 0;
    this.rollDir = new THREE.Vector3();
    this.blocking = false;
    this.blockT = 0;
    this.moveVel = new THREE.Vector3();
    this.lockTarget = null;
    this.lastDamageT = -99;
    this.lastStaminaUse = -99;
    this.buffs = {};
    this.attrBuff = {};
    this.busy = false;
    this.pendingCast = null;
    this.castT = 0;
    this.deadT = 0;
    this.interactCooldown = 0;
    this.sprinting = false;
    this.footT = 0;
    this.buildModel();
    this.trail = new SwordTrail(G.scene, 0xdde8ff);
  }

  buildModel() {
    if (this.model) {
      this.object.remove(this.model.built.mesh);
      this.model.built.mesh.geometry.dispose();
    }
    const eq = G.inventory ? G.inventory.equipped : {};
    const m = buildPlayerModel(this.app, eq);
    this.setModel(m);
    this.cape = m.cape;
    this.weapon = m.weapon;
    this.anim = m.anim;
  }

  get d() { return G.stats.derived(); }

  fullHeal() {
    const d = this.d;
    this.hp = d.maxHp; this.mana = d.maxMana; this.stamina = d.maxStamina;
  }

  useStamina(n) {
    this.stamina = Math.max(0, this.stamina - n);
    this.lastStaminaUse = G.time.now;
  }

  // ---------------- Atualização ----------------
  update(dt) {
    const d = this.d;
    const now = G.time.now;
    this.maxHp = d.maxHp;
    this.hp = Math.min(this.hp, d.maxHp);
    this.mana = Math.min(this.mana, d.maxMana);
    this.stamina = Math.min(this.stamina, d.maxStamina);

    if (this.alive) {
      if (now - this.lastStaminaUse > 0.7 && !this.sprinting && !this.blocking) this.stamina = Math.min(d.maxStamina, this.stamina + d.stamRegen * dt);
      this.mana = Math.min(d.maxMana, this.mana + d.manaRegen * dt);
      if (now - this.lastDamageT > 7) this.hp = Math.min(d.maxHp, this.hp + d.maxHp * 0.012 * dt);
      G.combat.tickStatus(this, dt);
      for (const k in this.buffs) {
        this.buffs[k].t -= dt;
        if (this.buffs[k].t <= 0) { this.buffs[k].onEnd?.(); delete this.buffs[k]; }
      }
    }
    this.invulnT = Math.max(0, this.invulnT - dt);
    this.interactCooldown = Math.max(0, this.interactCooldown - dt);

    const canControl = G.state === 'play' && this.alive && !this.busy;
    let ix = 0, iz = 0;
    if (canControl) {
      if (input.isDown('KeyW')) iz += 1;
      if (input.isDown('KeyS')) iz -= 1;
      if (input.isDown('KeyA')) ix -= 1;
      if (input.isDown('KeyD')) ix += 1;
    }
    const cam = G.cameraRig;
    const fwd = cam.flatForward(_v), right = cam.flatRight(_w);
    let mvx = fwd.x * iz + right.x * ix, mvz = fwd.z * iz + right.z * ix;
    const ml = Math.hypot(mvx, mvz);
    if (ml > 0) { mvx /= ml; mvz /= ml; }
    const moving = ml > 0.1;

    // trava de alvo
    if (this.lockTarget && (!this.lockTarget.alive || this.lockTarget.removed || this.distTo(this.lockTarget) > 40)) this.lockTarget = null;
    if (canControl && input.wasPressed('KeyF')) this.toggleLock();

    let wantVX = 0, wantVZ = 0;
    let animSt = { speed: 0, grounded: this.grounded, vy: this.vel.y, block: false, rolling: -1, aim: false };

    if (this.stunT > 0) { this.stunT -= dt; if (this.state !== 'dead' && this.state !== 'roll') this.state = 'stagger'; }
    else if (this.state === 'stagger') this.state = 'normal';

    switch (this.state) {
      case 'normal': {
        this.blocking = canControl && input.mouseDown(2) && this.stamina > 2 && this.grounded;
        if (this.blocking) { this.blockT += dt; } else this.blockT = 0;
        this.sprinting = canControl && input.isDown('ShiftLeft') || canControl && input.isDown('ShiftRight');
        this.sprinting = this.sprinting && moving && !this.blocking && this.stamina > 1 && this.grounded && iz >= 0;
        const base = 6.2 * (this.buffs.haste ? 1.3 : 1);
        const speed = this.blocking ? 2.4 : this.sprinting ? 9.6 * (this.buffs.haste ? 1.2 : 1) : base;
        if (this.sprinting) this.useStamina(15 * dt);
        if (this.blocking) this.lastStaminaUse = now;
        cam.fovKick = this.sprinting ? 6 : 0;
        const accel = this.grounded ? 14 : 3;
        this.moveVel.x = damp(this.moveVel.x, mvx * speed * (moving ? 1 : 0), accel, dt);
        this.moveVel.z = damp(this.moveVel.z, mvz * speed * (moving ? 1 : 0), accel, dt);
        wantVX = this.moveVel.x; wantVZ = this.moveVel.z;
        // direção do corpo
        if (this.lockTarget) this.faceYaw(this.yawTo(this.lockTarget.pos.x, this.lockTarget.pos.z), 12, dt);
        else if (this.blocking) this.faceYaw(Math.atan2(fwd.x, fwd.z), 12, dt);
        else if (moving) this.faceYaw(Math.atan2(mvx, mvz), 11, dt);
        if (canControl) {
          if (input.wasPressed('Space') && this.grounded) { this.vel.y = 8.6; this.grounded = false; G.audio?.play('jump'); }
          if (input.wasPressed('KeyQ')) this.tryRoll(mvx, mvz, moving);
          if (input.mousePressed(0) && !this.blocking) this.startAttack(1);
          for (let i = 0; i < 4; i++) if (input.wasPressed('Digit' + (i + 1))) G.powers.cast(i);
          if (input.wasPressed('KeyR')) G.inventory.quickUse('pocao_vida');
          if (input.wasPressed('KeyT')) G.inventory.quickUse('pocao_mana');
          if (input.wasPressed('KeyE')) this.interact();
        }
        animSt.speed = Math.hypot(this.moveVel.x, this.moveVel.z);
        animSt.block = this.blocking;
        break;
      }
      case 'attack': {
        this.blocking = false; this.sprinting = false; cam.fovKick = 0;
        const a = this.anim.action;
        const p = this.anim.progress;
        if (canControl && input.mousePressed(0) && p > 0.35) this.comboQueued = true;
        // avanço no início do golpe
        const lunge = a && p > 0.2 && p < 0.45 ? (this.combo === 3 ? 7 : 3.5) : 0;
        const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
        this.moveVel.x = damp(this.moveVel.x, fx * lunge + mvx * 1.2, 10, dt);
        this.moveVel.z = damp(this.moveVel.z, fz * lunge + mvz * 1.2, 10, dt);
        wantVX = this.moveVel.x; wantVZ = this.moveVel.z;
        if (this.lockTarget) this.faceYaw(this.yawTo(this.lockTarget.pos.x, this.lockTarget.pos.z), 14, dt);
        else if (p < 0.3 && moving) this.faceYaw(Math.atan2(mvx, mvz), 10, dt);
        if (this.anim.inHitWindow()) this.meleeCheck();
        if (canControl && input.wasPressed('KeyQ') && p > 0.55) { this.state = 'normal'; this.anim.stop(); this.tryRoll(mvx, mvz, moving); break; }
        if (!a || p > 0.78) {
          if (this.comboQueued && this.combo < 3 && this.stamina > 4) this.startAttack(this.combo + 1, true);
          else if (!a) { this.state = 'normal'; this.combo = 0; }
        }
        break;
      }
      case 'roll': {
        this.rollT += dt;
        const dur = 0.55;
        const k = this.rollT / dur;
        const spd = 11.5 * (1 - k * 0.55);
        wantVX = this.rollDir.x * spd; wantVZ = this.rollDir.z * spd;
        this.moveVel.set(wantVX, 0, wantVZ);
        animSt.rolling = Math.min(0.999, k);
        if (k >= 1) { this.state = 'normal'; animSt.rolling = -1; }
        break;
      }
      case 'cast': {
        this.castT += dt;
        this.moveVel.x = damp(this.moveVel.x, mvx * 2.2, 10, dt);
        this.moveVel.z = damp(this.moveVel.z, mvz * 2.2, 10, dt);
        wantVX = this.moveVel.x; wantVZ = this.moveVel.z;
        const aimYaw = this.lockTarget ? this.yawTo(this.lockTarget.pos.x, this.lockTarget.pos.z) : Math.atan2(fwd.x, fwd.z);
        this.faceYaw(aimYaw, 16, dt);
        if (this.pendingCast && (this.anim.consumeRelease() || !this.anim.action)) {
          const pc = this.pendingCast;
          this.pendingCast = null;
          G.powers.execute(pc);
        }
        if (!this.anim.action && !this.pendingCast) this.state = 'normal';
        animSt.speed = Math.hypot(this.moveVel.x, this.moveVel.z);
        break;
      }
      case 'stagger': {
        this.moveVel.multiplyScalar(Math.exp(-dt * 8));
        wantVX = this.moveVel.x; wantVZ = this.moveVel.z;
        break;
      }
      case 'dead': {
        this.deadT += dt;
        if (this.deadT > 2.4 && !this._deathShown) { this._deathShown = true; events.emit('playerDied'); }
        break;
      }
    }

    this.physics(dt, wantVX, wantVZ);

    // passos
    if (this.grounded && animSt.speed > 1 && this.state === 'normal') {
      this.footT += dt * animSt.speed * 0.32;
      if (this.footT > 1) {
        this.footT = 0;
        G.audio?.play(this.inWater > 0.2 ? 'splashStep' : 'step', { vol: this.sprinting ? 0.5 : 0.3 });
        if (this.inWater > 0.2) G.fx.emit({ x: this.pos.x, y: this.pos.y + this.inWater, z: this.pos.z, count: 6, color: 0xd0f0ff, color2: 0x6ab0ff, size: 0.3, life: 0.5, speed: 2, up: 2, gravity: 10, blend: 'normal', alpha: 0.7 });
      }
    }

    animSt.grounded = this.grounded;
    animSt.vy = this.vel.y;
    animSt.weaponReady = this.state === 'attack' || this.lockTarget != null;
    this.anim.update(dt, animSt);
    this.updateCape(dt, animSt.speed);
    this.updateTrail(dt);
    this.syncObject(dt);
  }

  // ---------------- Ações ----------------
  tryRoll(mvx, mvz, moving) {
    const d = this.d;
    if (!this.grounded || this.stamina < d.rollCost * 0.5) return;
    this.useStamina(d.rollCost);
    this.state = 'roll';
    this.rollT = 0;
    if (moving) this.rollDir.set(mvx, 0, mvz);
    else this.rollDir.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.yaw = Math.atan2(this.rollDir.x, this.rollDir.z);
    this.invulnT = 0.42;
    this.anim.stop();
    G.audio?.play('roll');
    G.fx.emit({ x: this.pos.x, y: this.pos.y + 0.1, z: this.pos.z, count: 8, color: 0xb8a888, color2: 0x8a7a60, size: 0.8, sizeEnd: 1.6, life: 0.6, speed: 1.5, blend: 'normal', alpha: 0.4 });
  }

  startAttack(stage, chained = false) {
    if (this.stamina < 4) { G.ui?.flashBar?.('stamina'); return; }
    this.state = 'attack';
    this.combo = stage;
    this.comboQueued = false;
    this.attackHit.clear();
    this.useStamina(stage === 3 ? 14 : 9);
    const spd = this.d.atkSpeed;
    this.anim.play('attack' + stage, { speed: spd });
    this.swingSoundPlayed = false;
    setTimeout(() => G.audio?.play(stage === 3 ? 'swingHeavy' : 'swing'), stage === 3 ? 220 / spd : 120 / spd);
  }

  meleeCheck() {
    const reach = 2.5 + (this.weapon?.userData?.tipLocal ? this.weapon.userData.tipLocal.z - 1.0 : 0);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    for (const e of G.entities.list) {
      if (e === this || !e.alive || e.removed || !e.targetable) continue;
      if (!isHostile('player', e.team)) continue;
      if (this.attackHit.has(e)) continue;
      const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z;
      const dist = Math.hypot(dx, dz) - e.radius;
      if (dist > reach) continue;
      if (Math.abs(e.pos.y + e.height * 0.5 - (this.pos.y + 1)) > e.height * 0.5 + 1.6) continue;
      const dot = (dx * fx + dz * fz) / (Math.hypot(dx, dz) || 1);
      if (dot < 0.15 && dist > 0.8) continue;
      this.attackHit.add(e);
      G.combat.playerMelee(e, this.combo);
    }
  }

  interact() {
    if (this.interactCooldown > 0) return;
    const npc = G.npcs?.nearestTalkable(this.pos, 3.0);
    const it = G.world.nearestInteractable(this.pos, this.yaw);
    let target = null;
    if (npc && it) target = npc.distTo(this) <= Math.hypot(it.pos.x - this.pos.x, it.pos.z - this.pos.z) ? npc : it;
    else target = npc || it;
    if (!target) return;
    this.interactCooldown = 0.4;
    if (target === npc) {
      G.dialogue.startWithNPC(npc);
    } else {
      this.anim.play('interact');
      this.faceYaw(this.yawTo(it.pos.x, it.pos.z), 50, 1);
      it.onInteract?.(it);
    }
  }

  toggleLock() {
    if (this.lockTarget) { this.lockTarget = null; return; }
    const cam = G.cameraRig;
    const f = cam.flatForward(new THREE.Vector3());
    let best = null, bs = Infinity;
    for (const e of G.entities.list) {
      if (!e.alive || e.removed || !e.targetable || !isHostile('player', e.team) || e.team === 'object') continue;
      const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 28) continue;
      const dot = (dx * f.x + dz * f.z) / (d || 1);
      if (dot < 0.4) continue;
      const score = d * (1.6 - dot);
      if (score < bs) { bs = score; best = e; }
    }
    this.lockTarget = best;
  }

  // Chamado pelo combate antes de aplicar dano. Retorna o dano final (ou -1 se evitado).
  defend(info) {
    if (this.invulnT > 0 || this.state === 'dead') return -1;
    let dmg = info.amount;
    if (this.blocking && info.source && !info.unblockable) {
      const src = info.source.pos || info.origin;
      const toSrc = Math.atan2(src.x - this.pos.x, src.z - this.pos.z);
      if (Math.abs(angleDiff(this.yaw, toSrc)) < 1.3) {
        if (this.blockT < 0.2 && info.melee) {
          // APARO PERFEITO
          G.audio?.play('parry');
          G.fx.burst('light', this.pos.x + Math.sin(this.yaw) * 0.7, this.pos.y + 1.3, this.pos.z + Math.cos(this.yaw) * 0.7, 0.6);
          G.ui?.floatText(this.center, 'APARO!', 'parry');
          if (info.source.stagger) info.source.stagger(1.4);
          G.cameraRig.shake(0.25);
          G.time.slowmo = 0.25;
          return -1;
        }
        const eff = this.d.blockEff;
        const cost = dmg * 0.7;
        if (this.stamina >= cost * 0.3) {
          this.useStamina(cost);
          G.audio?.play('block');
          G.fx.emit({ x: this.pos.x + Math.sin(this.yaw) * 0.6, y: this.pos.y + 1.2, z: this.pos.z + Math.cos(this.yaw) * 0.6, count: 10, color: 0xffe0a0, color2: 0xff8020, size: 0.15, life: 0.35, speed: 6 });
          dmg *= 1 - eff;
          if (this.stamina <= 0) { this.stunT = 0.8; G.ui?.floatText(this.center, 'Guarda quebrada!', 'warn'); }
          info.blocked = true;
        }
      }
    }
    if (this.buffs.stoneskin) dmg *= 0.6;
    if (this.buffs.shield) {
      const absorb = Math.min(this.buffs.shield.amount, dmg);
      this.buffs.shield.amount -= absorb;
      dmg -= absorb;
      if (this.buffs.shield.amount <= 0) delete this.buffs.shield;
    }
    return dmg;
  }

  onDamaged(info, dmg) {
    this.lastDamageT = G.time.now;
    if (!info.blocked && dmg > this.maxHp * 0.12 && !this.buffs.stoneskin && this.state !== 'roll') {
      this.stunT = Math.max(this.stunT, 0.35);
      this.anim.play('hit');
      if (this.state === 'attack' || this.state === 'cast') { this.pendingCast = null; this.state = 'stagger'; }
    }
    G.post.flashDamage(Math.min(1, dmg / this.maxHp * 4));
    G.cameraRig.shake(Math.min(0.5, dmg / this.maxHp * 2));
    if (this.buffs.stoneskin && info.melee && info.source && info.source.alive) {
      G.combat.applyDamage(info.source, { amount: 8 * this.d.natPower, type: 'earth', source: this });
    }
  }

  die() {
    this.alive = false;
    this.state = 'dead';
    this.deadT = 0;
    this._deathShown = false;
    this.anim.die();
    this.lockTarget = null;
    G.audio?.play('playerDeath');
  }

  revive(x, y, z) {
    this.alive = true;
    this.state = 'normal';
    this.anim.revive();
    this.fullHeal();
    this.status = {};
    this.stunT = 0;
    if (x !== undefined) this.pos.set(x, y, z);
    this.vel.set(0, 0, 0); this.knock.set(0, 0, 0);
  }

  // ---------------- Visual ----------------
  updateCape(dt, speed) {
    const c = this.cape;
    if (!c) return;
    const t = G.time.now;
    const air = this.grounded ? 0 : clamp(-this.vel.y * 0.05, -0.3, 0.6);
    const lean = clamp(0.12 + speed * 0.075 + air, 0, 1.2);
    this.capeLean = damp(this.capeLean || 0, lean, 6, dt);
    c.rotation.x = this.capeLean + Math.sin(t * 2.2) * 0.03;
    const pos = c.geometry.attributes.position;
    const base = c.userData.base;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      const k = -y; // 0 no topo, ~1 embaixo
      const wave = Math.sin(t * (4 + speed * 0.8) + k * 5 + x * 3) * 0.035 * (0.4 + speed * 0.12) * k;
      pos.setZ(i, base[i * 3 + 2] - k * k * (0.08 + speed * 0.02) + wave);
    }
    pos.needsUpdate = true;
  }

  updateTrail(dt) {
    const active = this.state === 'attack' && this.anim.progress > 0.18 && this.anim.progress < 0.62;
    if (active && this.weapon) {
      this.weapon.updateWorldMatrix(true, false);
      const base = new THREE.Vector3(0, 0, 0.25).applyMatrix4(this.weapon.matrixWorld);
      const tip = (this.weapon.userData.tipLocal || new THREE.Vector3(0, 0, 1)).clone().applyMatrix4(this.weapon.matrixWorld);
      this.trail.push(base, tip);
    }
    this.trail.update(dt, active);
  }

  handPosition(out = new THREE.Vector3(), left = true) {
    const b = this.model.built.bones[left ? 'handL' : 'handR'];
    b.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(b.matrixWorld);
  }
}
