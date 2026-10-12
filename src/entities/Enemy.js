// Inimigos e aliados com IA: corpo a corpo, à distância, conjurador, pesado e fera.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { rand, clamp, angleDiff, pick } from '../core/math.js';
import { Entity } from './Entity.js';
import { buildEnemyModel, buildNPCModel } from './Models.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { isHostile } from './Entities.js';

const _v = new THREE.Vector3();

export class Enemy extends Entity {
  constructor(type, o = {}) {
    const def = ENEMY_TYPES[type];
    const lvl = o.level || 1;
    const hpScale = 1 + 0.24 * (lvl - 1);
    super({
      kind: 'enemy', team: o.team || 'enemy', x: o.x, z: o.z, y: o.y,
      radius: def.radius, height: def.height, hp: Math.round(def.hp * hpScale * (o.hpMul || 1)),
      flying: def.flying, hoverHeight: def.hover || 0, level: lvl, name: def.name,
    });
    this.type = type;
    this.def = def;
    this.mass = def.mass || (def.boss ? 3 : 1);
    this.dmg = def.dmg * (1 + 0.13 * (lvl - 1)) * (o.dmgMul || 1);
    this.speed = def.speed;
    this.xp = Math.round(def.xp * (1 + 0.18 * (lvl - 1)));
    this.goldDrop = def.gold;
    this.loot = o.loot ?? def.loot;
    this.resist = def.resist || {};
    this.armor = def.armor || 0;
    this.poiseMax = def.poise || 15;
    this.poise = this.poiseMax;
    this.fleshy = def.fleshy !== false;
    this.boss = !!def.boss || !!o.boss;
    this.tags = o.tags || [];
    this.questTag = o.questTag;
    this.home = new THREE.Vector3(this.pos.x, this.pos.y, this.pos.z);
    this.leash = o.leash ?? 42;
    this.aggroRange = o.aggro ?? def.aggro;
    this.state = 'idle';
    this.aiTarget = null;
    this.atkCd = rand(0.6, 1.6);
    this.wanderT = rand(1, 4);
    this.wanderTo = null;
    this.recoverT = 0;
    this.deathT = 0;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.ally = !!o.ally;
    this.follow = o.follow ?? this.ally;
    this.passive = !!o.passive;     // não ataca até ser provocado
    this.zoneId = o.zoneId;
    this.lastHitBy = null;
    this.yaw = o.yaw ?? rand(0, Math.PI * 2);
    const m = o.model || (def.model.startsWith('npc:') ? buildNPCModel(def.model.slice(4)) : buildEnemyModel(def.model));
    this.setModel(m);
    this.anim = m.anim;
    this.quad = !!m.quad;
    this.isFloat = !!m.float;
    if (o.name) this.name = o.name;
    this.displayName = o.displayName || this.name;
    this.sleep = false;
    this.attackHitDone = false;
    this.curAttack = null;
  }

  stagger(t = 0.8) {
    if (!this.alive) return;
    this.stunT = Math.max(this.stunT, t * (this.boss ? 0.5 : 1));
    this.state = 'stagger';
    this.anim.play?.('hit');
    this.curAttack = null;
  }

  onHit(info, dmg) {
    // provoca
    if (info.source && info.source.alive && isHostile(this.team, info.source.team)) {
      if (!this.aiTarget || Math.random() < 0.3) this.aiTarget = info.source;
      this.passive = false;
    }
    if (this.state === 'idle' || this.state === 'return') this.state = 'chase';
    // postura
    this.poise -= info.poise ?? (info.melee ? 12 : 8);
    if (this.poise <= 0) {
      this.poise = this.poiseMax;
      this.stagger(0.7);
    } else if (!this.boss && !this.curAttack && this.quad) this.anim.play('hit');
    G.audio?.play(this.def.sound + 'Hurt', { pos: this.pos, vol: 0.5 });
  }

  die() {
    this.alive = false;
    this.state = 'dead';
    this.deathT = 0;
    this.anim.die();
    this.noCollide = true;
    const c = this.center;
    const dz = this.def.dissolve;
    if (dz === 'shadow') G.fx.burst('shadow', c.x, c.y, c.z, 1.2);
    else if (dz === 'ink') G.fx.burst('ink', c.x, c.y, c.z, 1.4);
    else if (dz === 'bone') G.fx.burst('earth', c.x, c.y - 0.5, c.z, 0.6);
    else if (dz === 'earth') G.fx.burst('earth', c.x, c.y, c.z, 1.6);
    G.audio?.play(this.def.sound + 'Death', { pos: this.pos });
    if (G.player.lockTarget === this) G.player.lockTarget = null;
  }

  findTarget() {
    let best = null, bd = this.aggroRange * (this.status.blind ? 0.3 : 1);
    if (this.passive) return null;
    for (const e of G.entities.list) {
      if (e === this || !e.alive || e.removed || !e.targetable || e.team === 'object') continue;
      if (!isHostile(this.team, e.team)) continue;
      if (e.kind === 'npc' && !e.combatant) continue;
      const d = this.distTo(e);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  update(dt) {
    if (!this.alive) {
      this.deathT += dt;
      if (this.deathT > 1.6) this.pos.y -= dt * 0.6;
      if (this.deathT > 4) this.remove();
      this.anim.update(dt, { speed: 0, grounded: true });
      this.syncObject(dt);
      return;
    }
    // dorme quando longe do jogador
    const pd = Math.hypot(G.player.pos.x - this.pos.x, G.player.pos.z - this.pos.z);
    this.object.visible = pd < 170;
    if (pd > 170 && !this.boss) { return; }

    G.combat.tickStatus(this, dt);
    const frozen = G.state !== 'play' && G.state !== 'cutscene';
    if (frozen || this.frozen) {
      this.anim.update(dt, { speed: 0, grounded: this.grounded });
      this.syncObject(dt);
      return;
    }
    this.poise = Math.min(this.poiseMax, this.poise + this.poiseMax * 0.15 * dt);
    this.atkCd -= dt;
    if (this.liftT > 0) {
      this.liftT -= dt;
      this.anim.update(dt, { speed: 0, grounded: false });
      this.syncObject(dt);
      return;
    }

    let vx = 0, vz = 0;
    let animSpeed = 0;
    if (this.stunT > 0) {
      this.stunT -= dt;
      this.curAttack = null;
      if (this.state !== 'stagger') this.state = 'stagger';
    } else if (this.state === 'stagger') this.state = 'chase';

    // Alvo
    if (!this.aiTarget || !this.aiTarget.alive || this.aiTarget.removed || !isHostile(this.team, this.aiTarget.team) || this.distTo(this.aiTarget) > this.aggroRange * 2.2) {
      this.aiTarget = this.findTarget();
    }
    const T = this.aiTarget;

    switch (this.state) {
      case 'idle': {
        if (T) { this.state = 'chase'; this.alert(); break; }
        if (this.follow && G.player.alive) {
          const d = this.distTo(G.player);
          if (d > 4) {
            const yaw = this.yawTo(G.player.pos.x, G.player.pos.z);
            this.faceYaw(yaw, 8, dt);
            const sp = d > 12 ? this.speed * 1.2 : this.speed * 0.7;
            vx = Math.sin(yaw) * sp; vz = Math.cos(yaw) * sp; animSpeed = sp;
            if (d > 45) { this.pos.set(G.player.pos.x - 2, G.player.pos.y, G.player.pos.z - 2); }
          }
          break;
        }
        this.wanderT -= dt;
        if (this.wanderT <= 0) {
          this.wanderT = rand(3, 7);
          const a = rand(0, Math.PI * 2), r = rand(2, 8);
          this.wanderTo = Math.random() < 0.6 ? new THREE.Vector3(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r) : null;
        }
        if (this.wanderTo) {
          const dx = this.wanderTo.x - this.pos.x, dz = this.wanderTo.z - this.pos.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.8) {
            const yaw = Math.atan2(dx, dz);
            this.faceYaw(yaw, 5, dt);
            const sp = this.speed * 0.35;
            vx = Math.sin(this.yaw) * sp; vz = Math.cos(this.yaw) * sp; animSpeed = sp;
          } else this.wanderTo = null;
        }
        break;
      }
      case 'chase': {
        if (!T) { this.state = this.follow ? 'idle' : 'return'; break; }
        if (!this.follow && this.home.distanceTo(this.pos) > this.leash && !this.boss) { this.state = 'return'; this.aiTarget = null; break; }
        const r = this.ai(dt, T);
        vx = r.vx; vz = r.vz; animSpeed = r.speed;
        break;
      }
      case 'attack': {
        const r = this.attackUpdate(dt, T);
        vx = r?.vx || 0; vz = r?.vz || 0;
        break;
      }
      case 'recover': {
        this.recoverT -= dt;
        if (T) this.faceYaw(this.yawTo(T.pos.x, T.pos.z), 4, dt);
        if (this.recoverT <= 0) this.state = 'chase';
        break;
      }
      case 'return': {
        const dx = this.home.x - this.pos.x, dz = this.home.z - this.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 2) { this.state = 'idle'; break; }
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.25 * dt);
        const yaw = Math.atan2(dx, dz);
        this.faceYaw(yaw, 6, dt);
        vx = Math.sin(this.yaw) * this.speed; vz = Math.cos(this.yaw) * this.speed; animSpeed = this.speed;
        const t2 = this.findTarget();
        if (t2 && d < this.leash * 0.6) { this.aiTarget = t2; this.state = 'chase'; }
        break;
      }
      case 'stagger':
        break;
    }

    this.physics(dt, vx, vz);
    this.anim.update(dt, { speed: animSpeed * this.speedMul, grounded: this.grounded || this.isFloat, vy: this.vel.y, weaponReady: this.state === 'chase' && !this.quad });
    this.syncObject(dt);
  }

  alert() {
    if (this.quad && Math.random() < 0.3) this.anim.play('howl', { dur: 1.0 });
  }

  // Movimento + decisão de ataque por tipo de IA
  ai(dt, T) {
    const def = this.def;
    const d = this.distTo(T) - T.radius;
    const yawTo = this.yawTo(T.pos.x, T.pos.z);
    let vx = 0, vz = 0, speed = 0;
    const kind = def.ai;
    const range = def.range;
    if (kind === 'ranged' || kind === 'caster') {
      const [near, far] = def.keepDist || [7, 14];
      this.faceYaw(yawTo, 8, dt);
      let mv = 0;
      if (d > far) mv = 1;
      else if (d < near) mv = -0.8;
      const strafe = 0.5 * this.strafeDir;
      if (Math.random() < dt * 0.4) this.strafeDir *= -1;
      const sp = this.speed * (mv !== 0 ? 1 : 0.5);
      const fx = Math.sin(yawTo), fz = Math.cos(yawTo);
      vx = (fx * mv + fz * strafe) * sp; vz = (fz * mv - fx * strafe) * sp;
      speed = sp;
      // corpo a corpo de emergência (espectro)
      if (kind === 'caster' && d < 2.2 && this.atkCd <= 0) { this.startAttack('melee', T); return { vx: 0, vz: 0, speed: 0 }; }
      if (this.atkCd <= 0 && d < range && d > 2) this.startAttack('ranged', T);
    } else {
      // corpo a corpo / fera / pesado
      this.faceYaw(yawTo, kind === 'heavy' ? 3.5 : 9, dt);
      if (d > range * 0.85) {
        const sp = this.speed * (d > 10 ? 1 : 0.9);
        vx = Math.sin(this.yaw) * sp; vz = Math.cos(this.yaw) * sp;
        speed = sp;
      } else if (this.atkCd > 0) {
        // circula o alvo enquanto recarrega
        const sp = this.speed * 0.35;
        const fx = Math.sin(yawTo), fz = Math.cos(yawTo);
        vx = fz * this.strafeDir * sp; vz = -fx * this.strafeDir * sp; speed = sp;
        if (Math.random() < dt * 0.5) this.strafeDir *= -1;
      }
      if (this.atkCd <= 0 && d <= range && Math.abs(angleDiff(this.yaw, yawTo)) < 0.6) this.startAttack('melee', T);
      else if (def.throwsInk && this.atkCd <= 0 && d > 6 && d < 14 && Math.random() < dt * 0.8) this.startAttack('ink', T);
      else if (kind === 'beast' && this.atkCd <= 0 && d > 4 && d < 9 && Math.random() < dt * 1.2) this.startAttack('pounce', T);
    }
    return { vx, vz, speed };
  }

  startAttack(kind, T) {
    const def = this.def;
    this.state = 'attack';
    this.curAttack = { kind, t: 0, target: T, hitDone: false, fired: false };
    this.atkCd = rand(def.cd[0], def.cd[1]);
    if (kind === 'melee') {
      if (def.ai === 'caster') this.anim.play('claw');
      else if (def.ai === 'heavy') {
        this.anim.play('slam', { speed: 0.8 });
        const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
        const px = this.pos.x + fx * 2.4, pz = this.pos.z + fz * 2.4;
        this.curAttack.slamPos = { x: px, z: pz };
        G.fx.telegraph({ shape: 'circle', x: px, z: pz, radius: 3.2, dur: 0.75, color: 0xff4020 });
      } else {
        const a = def.attack2 && Math.random() < 0.4 ? def.attack2 : def.attack;
        this.anim.play(a, { speed: this.quad ? 1 : 0.85 });
      }
    } else if (kind === 'ranged') {
      this.anim.play(def.attack === 'shoot' ? 'shoot' : 'cast');
    } else if (kind === 'ink') {
      this.anim.play('cast', { speed: 1.2 });
    } else if (kind === 'pounce') {
      this.anim.play('pounce');
      this.curAttack.dir = { x: T.pos.x - this.pos.x, z: T.pos.z - this.pos.z };
    }
    G.audio?.play(def.sound + 'Attack', { pos: this.pos, vol: 0.5 });
  }

  attackUpdate(dt, T) {
    const A = this.curAttack;
    if (!A) { this.state = 'chase'; return; }
    A.t += dt;
    const anim = this.anim;
    let vx = 0, vz = 0;
    if (A.kind === 'melee') {
      if (this.def.ai === 'heavy') {
        if (!A.hitDone && A.t >= 0.75) {
          A.hitDone = true;
          const p = A.slamPos;
          const y = G.world.terrain.heightAt(p.x, p.z);
          G.combat.areaDamage(p.x, y + 1, p.z, 3.2, this.team, { amount: this.dmg, type: 'earth', source: this, knockback: 8, up: 4, melee: true, unblockable: false });
          G.fx.burst('earth', p.x, y + 0.3, p.z, 1.3);
          G.fx.ring(p.x, y, p.z, 0xc8a070, 4.5, 0.5);
          G.cameraRig.shake(Math.max(0, 0.5 - G.player.pos.distanceTo(this.pos) * 0.02));
          G.audio?.play('slam', { pos: this.pos });
        }
      } else if (anim.inHitWindow() && !A.hitDone && T && T.alive) {
        const d = this.distTo(T) - T.radius;
        const dot = Math.cos(angleDiff(this.yaw, this.yawTo(T.pos.x, T.pos.z)));
        if (d < this.def.range + 0.7 && dot > 0.2) {
          A.hitDone = true;
          G.combat.applyDamage(T, { amount: this.dmg * rand(0.9, 1.1), type: this.def.dmgType || 'physical', source: this, melee: true, knockback: this.boss ? 6 : 3, poise: 15 });
        }
      }
      // avanço
      const p = anim.progress;
      if (p > 0.2 && p < 0.5 && !this.quad) { vx = Math.sin(this.yaw) * 2.2; vz = Math.cos(this.yaw) * 2.2; }
      if (this.quad && p > 0.3 && p < 0.55) { vx = Math.sin(this.yaw) * 4; vz = Math.cos(this.yaw) * 4; }
    } else if (A.kind === 'pounce') {
      const p = anim.progress;
      if (p > 0.25 && p < 0.75) {
        const l = Math.hypot(A.dir.x, A.dir.z) || 1;
        vx = A.dir.x / l * 13; vz = A.dir.z / l * 13;
        if (!A.hitDone && T && this.distTo(T) - T.radius < 1.6) {
          A.hitDone = true;
          G.combat.applyDamage(T, { amount: this.dmg * 1.3, type: 'physical', source: this, melee: true, knockback: 6, poise: 25 });
        }
      }
    } else if ((A.kind === 'ranged' || A.kind === 'ink') && T) {
      this.faceYaw(this.yawTo(T.pos.x, T.pos.z), 10, dt);
      const release = anim.consumeRelease() || (!anim.action && !A.fired);
      if (release && !A.fired) {
        A.fired = true;
        this.fireProjectile(A.kind, T);
      }
    }
    if (!anim.action || (this.quad && anim.progress >= 1)) {
      this.state = 'recover';
      this.recoverT = this.def.ai === 'heavy' ? 0.8 : rand(0.25, 0.6);
      this.curAttack = null;
    }
    return { vx, vz };
  }

  fireProjectile(kind, T) {
    const origin = new THREE.Vector3(this.pos.x, this.pos.y + this.height * 0.7, this.pos.z);
    origin.x += Math.sin(this.yaw) * 0.6; origin.z += Math.cos(this.yaw) * 0.6;
    const tgt = T.center.clone();
    // mira com antecipação simples
    if (T.moveVel) tgt.addScaledVector(T.moveVel, 0.25);
    const dir = tgt.sub(origin).normalize();
    if (kind === 'ink') {
      G.projectiles.spawn({ pos: origin, dir: dir.add(new THREE.Vector3(0, 0.15, 0)).normalize(), speed: 16, team: this.team, element: 'ink', visual: 'sphere', color: 0x111111, size: 0.8, gravity: 6, source: this,
        damage: { amount: this.dmg * 0.8, type: 'toon', status: [{ id: 'blind', dur: 2, chance: 0.4 }] }, material: new THREE.MeshBasicMaterial({ color: 0x111111 }) });
    } else if (this.def.attack === 'shoot') {
      G.projectiles.spawn({ pos: origin, dir, speed: 30, team: this.team, element: 'physical', visual: 'arrow', color: 0x8a6a4a, gravity: 2, trail: null, source: this,
        damage: { amount: this.dmg, type: 'physical' } });
      G.audio?.play('bow', { pos: this.pos });
    } else {
      G.projectiles.spawn({ pos: origin, dir, speed: 13, team: this.team, element: 'shadow', visual: 'sphere', color: 0x9a40ff, size: 0.9, homing: T, homingRate: 1.6, source: this,
        damage: { amount: this.dmg, type: 'shadow', status: [{ id: 'slow', dur: 2, power: 0.3, chance: 0.35 }] }, life: 3 });
      G.audio?.play('darkOrb', { pos: this.pos });
    }
  }
}

// ---------------- Gerenciador de zonas de surgimento ----------------
export class Spawner {
  constructor(zones) {
    this.zones = zones.map((z) => ({ ...z, alive: [], timer: 0, killed: 0 }));
    this.nightT = 0;
  }

  update(dt) {
    const p = G.player;
    if (!p) return;
    for (const z of this.zones) {
      z.alive = z.alive.filter((e) => e.alive && !e.removed);
      if (z.needFlag && !G.story.flags[z.needFlag]) continue;
      if (z.blockFlag && G.story.flags[z.blockFlag]) continue;
      const d = Math.hypot(p.pos.x - z.x, p.pos.z - z.z);
      if (d > 200) {
        // despawn para economizar
        for (const e of z.alive) e.remove();
        z.alive = [];
        continue;
      }
      if (z.alive.length < z.max && d > z.r + 25 && d < 130) {
        z.timer -= dt;
        if (z.timer <= 0 || z.alive.length === 0 && !z.everSpawned) {
          z.timer = z.everSpawned ? z.respawn : 0;
          this.fill(z);
          z.everSpawned = true;
        }
      }
    }
    // espectros noturnos
    if (G.sky.isNight() && G.state === 'play') {
      this.nightT -= dt;
      if (this.nightT <= 0) {
        this.nightT = rand(25, 45);
        const reg = G.world.regionAt(p.pos.x, p.pos.z);
        if (!['brumavale', 'guardCamp', 'farm', 'mill', 'grove', 'castle', 'rift'].includes(reg)) {
          const a = rand(0, Math.PI * 2);
          const x = p.pos.x + Math.cos(a) * 26, z = p.pos.z + Math.sin(a) * 26;
          if (!G.world.terrain.waterAt(x, z)) {
            const lvl = Math.max(1, Math.min(10, G.stats.level));
            const n = G.stats.level > 4 ? 2 : 1;
            for (let i = 0; i < n; i++) G.entities.add(new Enemy('wisp', { x: x + i * 2, z, level: lvl, tags: ['night'], leash: 80 }));
          }
        }
      }
    }
  }

  fill(z) {
    const n = z.max - z.alive.length;
    for (let i = 0; i < n; i++) {
      let x, zz, tries = 0;
      do {
        const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * z.r;
        x = z.x + Math.cos(a) * r; zz = z.z + Math.sin(a) * r;
        tries++;
      } while (tries < 8 && (G.world.terrain.waterAt(x, zz) || G.world.collision.pointSolid(x, G.world.terrain.heightAt(x, zz) + 1, zz) || G.world.terrain.slopeAt(x, zz) > 0.8));
      const type = pick(z.types);
      const e = new Enemy(type, { x, z: zz, level: z.lvl, zoneId: z.id, tags: z.tags || [] });
      G.entities.add(e);
      z.alive.push(e);
    }
  }

  clearAll() {
    for (const z of this.zones) { for (const e of z.alive) e.remove(); z.alive = []; z.everSpawned = false; z.timer = 0; }
  }
}
