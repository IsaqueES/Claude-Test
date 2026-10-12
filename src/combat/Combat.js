// Combate: aplicação de dano, resistências, efeitos de status, combinações elementais e mortes.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { events } from '../core/Events.js';
import { rand, clamp } from '../core/math.js';
import { isHostile } from '../entities/Entities.js';

export const DAMAGE_NAMES = {
  physical: 'Físico', fire: 'Fogo', water: 'Água', light: 'Luz', earth: 'Terra', wind: 'Vento', lightning: 'Raio',
  psychic: 'Psíquico', toon: 'Toon', shadow: 'Sombra', rift: 'Fenda',
};

const STATUS_TINT = {
  burn: new THREE.Color(0.5, 0.15, 0.0),
  wet: new THREE.Color(0.0, 0.12, 0.3),
  stun: new THREE.Color(0.25, 0.25, 0.0),
  blind: new THREE.Color(0.35, 0.35, 0.3),
  charm: new THREE.Color(0.4, 0.05, 0.3),
  slow: new THREE.Color(0.1, 0.08, 0.02),
  drain: new THREE.Color(0.2, 0.0, 0.3),
};

export class Combat {
  constructor() {
    this._v = new THREE.Vector3();
  }

  playerMelee(target, stage) {
    const p = G.player;
    const d = G.stats.derived();
    const mult = [1, 1, 1.12, 1.65][stage] || 1;
    let amount = d.meleeDmg * mult * rand(0.92, 1.08);
    const crit = Math.random() < d.crit;
    if (crit) amount *= d.critMul;
    const wtype = G.inventory?.weaponElement?.() || 'physical';
    const dx = target.pos.x - p.pos.x, dz = target.pos.z - p.pos.z;
    this.applyDamage(target, {
      amount, type: wtype, source: p, melee: true, crit,
      knockback: stage === 3 ? 7 : 3.2, up: stage === 3 ? 3.5 : 0, dir: { x: dx, z: dz },
      poise: stage === 3 ? 35 : 14,
    });
    if (wtype !== 'physical') G.fx.burst(wtype, target.center.x, target.center.y, target.center.z, 0.4);
    // parada de impacto
    G.time.hitstop = stage === 3 ? 0.08 : 0.045;
    G.cameraRig.shake(stage === 3 ? 0.22 : 0.1);
    const c = target.center;
    G.fx.emit({ x: c.x, y: c.y, z: c.z, count: crit ? 18 : 10, color: 0xfff4d0, color2: 0xffa040, size: 0.18, sizeEnd: 0.04, life: 0.35, speed: 7, drag: 3 });
    G.audio?.play(target.fleshy === false ? 'hitStone' : 'hit', { pos: target.pos });
  }

  /**
   * info: { amount, type, source, melee, crit, knockback, up, dir:{x,z}, status:[{id,dur,chance,power}], poise, unblockable, silent, origin }
   */
  applyDamage(target, info) {
    if (!target || !target.alive || target.removed) return 0;
    if (target.invulnerable) { if (!info.silent) G.ui?.floatText(target.center, 'Imune', 'immune'); return 0; }
    let dmg = info.amount;
    const type = info.type || 'physical';
    const res = target.resist?.[type] ?? target.defaultResist ?? 1;
    if (res <= 0) { if (!info.silent && !info.dot) G.ui?.floatText(target.center, 'Imune', 'immune'); return 0; }
    dmg *= res;
    let comboText = null;

    // Combinações elementais
    if (type === 'lightning' && target.status.wet) { dmg *= 2; this.applyStatus(target, 'stun', 1.4); this.removeStatus(target, 'wet'); comboText = 'ELETROCUTADO!'; }
    if (type === 'fire' && target.status.wet) { dmg *= 0.65; this.removeStatus(target, 'wet'); this.steam(target); }
    if (type === 'water' && target.status.burn) { this.removeStatus(target, 'burn'); this.steam(target); comboText = 'VAPOR!'; dmg *= 1.3; }
    if (type === 'wind' && target.status.burn) { dmg *= 1.5; comboText = 'TEMPESTADE DE FOGO!'; this.spreadFire(target); }
    if (type === 'earth' && target.status.wet) { dmg *= 1.3; this.applyStatus(target, 'slow', 3, { power: 0.5 }); comboText = 'LAMA!'; }
    if ((type === 'physical' || type === 'toon') && target.flattenT > 0) dmg *= 1.3;
    if (type === 'psychic' && target.status.stun) { dmg *= 1.4; comboText = comboText || 'MENTE PARTIDA!'; }
    if (type === 'light' && target.status.blind) dmg *= 1.2;

    if (target === G.player) {
      dmg = target.defend(info);
      if (dmg < 0) return 0;
      const def = G.stats.derived().defense;
      dmg *= 60 / (60 + def);
    } else {
      dmg *= 1 - (target.armor || 0);
      if (target.status.drain) dmg *= 1.15;
    }
    dmg = Math.max(1, Math.round(dmg));
    target.hp -= dmg;
    target.hitFlash = 0.15;
    if (target.lastHitBy !== undefined) target.lastHitBy = info.source;

    // Números flutuantes
    if (!info.silent && G.settings.showDamage) {
      const style = target === G.player ? 'hurt' : info.crit ? 'crit' : res > 1.15 ? 'weak' : res < 0.85 ? 'resist' : 'normal';
      G.ui?.floatText(target.center, String(dmg), style, type);
      if (res > 1.15 && target !== G.player && !info.dot) G.ui?.floatText(target.center, 'Fraqueza!', 'weakTag');
    }
    if (comboText) G.ui?.floatText(target.center, comboText, 'combo');

    // Repulsão
    if (info.knockback && !target.immovable) {
      const dir = info.dir || (info.source ? { x: target.pos.x - info.source.pos.x, z: target.pos.z - info.source.pos.z } : { x: 0, z: 0 });
      target.applyKnockback(dir.x, dir.z, info.knockback, info.up || 0);
    }

    // Status
    if (info.status) for (const s of info.status) if (Math.random() < (s.chance ?? 1)) this.applyStatus(target, s.id, s.dur, s);

    if (target.onHit) target.onHit(info, dmg);
    if (target === G.player) target.onDamaged(info, dmg);

    events.emit('damage', { target, info, dmg });
    if (target.hp <= 0) this.kill(target, info);
    return dmg;
  }

  heal(target, amount, silent = false) {
    if (!target.alive) return;
    const max = target === G.player ? G.stats.derived().maxHp : target.maxHp;
    const before = target.hp;
    target.hp = Math.min(max, target.hp + amount);
    const got = Math.round(target.hp - before);
    if (got > 0 && !silent) G.ui?.floatText(target.center, '+' + got, 'heal');
  }

  kill(target, info) {
    target.hp = 0;
    if (target === G.player) { target.die(info); return; }
    target.die?.(info);
    if (target.team === 'enemy' || target.team === 'object' || target.wasEnemy) {
      const lvlDiff = (target.level || 1) - G.stats.level;
      const xp = Math.round((target.xp || 0) * clamp(1 + lvlDiff * 0.12, 0.3, 1.8));
      if (xp > 0) { G.stats.addXp(xp); G.ui?.floatText(target.center, '+' + xp + ' XP', 'xp'); }
      if (target.goldDrop) {
        const g = Math.round(rand(target.goldDrop[0], target.goldDrop[1]));
        if (g > 0) G.loot?.dropGold(target.pos, g);
      }
      if (target.loot) for (const [item, chance] of target.loot) if (Math.random() < chance) G.loot?.dropItem(target.pos, item);
      events.emit('kill', { target, type: target.type, tags: target.tags || [], info });
    }
  }

  applyStatus(target, id, dur, data = {}) {
    if (!target.alive) return;
    if (target.statusImmune?.includes(id)) return;
    const s = target.status[id];
    if (s) { s.t = Math.max(s.t, dur); Object.assign(s, data); return; }
    target.status[id] = { t: dur, dur, tick: 0, ...data };
    if (id === 'stun') target.stunT = Math.max(target.stunT || 0, dur * (target.boss ? 0.35 : 1));
    if (id === 'slow') target.speedMul = 1 - (data.power ?? 0.4);
    if (id === 'charm' && target.team === 'enemy') { target.wasEnemy = true; target.team = 'ally'; target.charmed = true; target.aiTarget = null; }
  }

  removeStatus(target, id) {
    const s = target.status[id];
    if (!s) return;
    delete target.status[id];
    if (id === 'slow') target.speedMul = 1;
    if (id === 'charm' && target.charmed) { target.team = 'enemy'; target.charmed = false; target.aiTarget = null; }
  }

  tickStatus(e, dt) {
    let tint = null;
    for (const id in e.status) {
      const s = e.status[id];
      s.t -= dt;
      s.tick += dt;
      tint = STATUS_TINT[id] || tint;
      const c = e.center;
      switch (id) {
        case 'burn':
          if (s.tick >= 0.5) {
            s.tick = 0;
            this.applyDamage(e, { amount: (s.power || 4), type: 'fire', source: s.source, dot: true, silent: false });
          }
          if (Math.random() < dt * 25) G.fx.trail('fire', c.x + rand(-0.3, 0.3), c.y + rand(-0.5, 0.4), c.z + rand(-0.3, 0.3));
          if (e.inWater > 0.4) this.removeStatus(e, 'burn');
          break;
        case 'wet':
          if (Math.random() < dt * 8) G.fx.emit({ x: c.x + rand(-0.3, 0.3), y: c.y, z: c.z + rand(-0.3, 0.3), count: 1, color: 0x9ad0ff, color2: 0x3a7ad0, size: 0.18, life: 0.5, speed: 0.2, gravity: 9, blend: 'normal', alpha: 0.8 });
          break;
        case 'stun':
          if (Math.random() < dt * 6) {
            const a = G.time.now * 6;
            G.fx.emit({ x: e.pos.x + Math.cos(a) * 0.4, y: e.pos.y + e.height + 0.2, z: e.pos.z + Math.sin(a) * 0.4, count: 1, color: 0xffe040, color2: 0xffffff, size: 0.35, life: 0.4, speed: 0.1 });
          }
          break;
        case 'charm':
          if (Math.random() < dt * 4) G.fx.emit({ x: c.x, y: e.pos.y + e.height + 0.3, z: c.z, count: 1, color: 0xff60c0, color2: 0xff90e0, size: 0.4, life: 0.8, speed: 0.3, up: 1 });
          break;
        case 'blind':
          if (Math.random() < dt * 5) G.fx.emit({ x: c.x, y: e.pos.y + e.height, z: c.z, count: 1, color: 0xffffff, color2: 0xfff0a0, size: 0.3, life: 0.4, speed: 0.6 });
          break;
        case 'regen':
          if (s.tick >= 0.5) { s.tick = 0; this.heal(e, s.power || 5, true); }
          if (Math.random() < dt * 10) G.fx.trail('water', c.x + rand(-0.4, 0.4), c.y + rand(-0.6, 0.6), c.z + rand(-0.4, 0.4));
          break;
      }
      if (s.t <= 0) this.removeStatus(e, id);
    }
    e.statusTint = tint;
  }

  steam(target) {
    const c = target.center;
    G.fx.emit({ x: c.x, y: c.y, z: c.z, count: 18, color: 0xf0f0f0, color2: 0xc0c8d0, size: 1.0, sizeEnd: 2.6, life: 1.2, speed: 1.6, up: 2.5, blend: 'normal', alpha: 0.5 });
    G.audio?.play('steam');
  }

  spreadFire(target) {
    const near = G.entities.inRadius(target.pos.x, target.pos.z, 5, (e) => e !== target && e.team === target.team);
    for (const e of near) this.applyStatus(e, 'burn', 4, { power: 5, source: G.player });
    G.fx.ring(target.pos.x, target.pos.y, target.pos.z, 0xff6020, 5, 0.5);
  }

  // Dano em área para o lado inimigo de 'team'.
  areaDamage(x, y, z, radius, team, info, filter) {
    const hit = [];
    for (const e of G.entities.list) {
      if (!e.alive || e.removed || !e.targetable) continue;
      if (!isHostile(team, e.team)) continue;
      const dx = e.pos.x - x, dz = e.pos.z - z;
      const d = Math.hypot(dx, dz);
      if (d > radius + e.radius) continue;
      if (Math.abs((e.pos.y + e.height * 0.5) - y) > radius + e.height) continue;
      if (filter && !filter(e)) continue;
      const fall = info.falloff ? clamp(1 - d / (radius + e.radius) * 0.5, 0.5, 1) : 1;
      this.applyDamage(e, { ...info, amount: info.amount * fall, dir: { x: dx || 0.01, z: dz || 0.01 } });
      hit.push(e);
    }
    return hit;
  }
}
