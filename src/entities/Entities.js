// Gerenciador de entidades: atualização, separação e consultas espaciais.
import * as THREE from 'three';
import { G } from '../core/context.js';

const _v = new THREE.Vector3();

export class Entities {
  constructor() {
    this.list = [];
  }

  add(e) {
    this.list.push(e);
    e.addToScene();
    return e;
  }

  remove(e) {
    e.remove();
  }

  update(dt) {
    for (let i = 0; i < this.list.length; i++) {
      const e = this.list[i];
      if (e.removed) continue;
      e.update(dt);
    }
    this.separate();
    // limpeza
    for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].removed) this.list.splice(i, 1);
  }

  separate() {
    const L = this.list;
    for (let i = 0; i < L.length; i++) {
      const a = L[i];
      if (a.removed || !a.alive || a.noCollide) continue;
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j];
        if (b.removed || !b.alive || b.noCollide) continue;
        if (Math.abs(a.pos.y - b.pos.y) > Math.max(a.height, b.height)) continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const min = a.radius + b.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min || d2 < 1e-8) continue;
        const d = Math.sqrt(d2);
        const push = (min - d);
        const ma = a.fixed ? 1e6 : a.mass, mb = b.fixed ? 1e6 : b.mass;
        const ta = mb / (ma + mb), tb = ma / (ma + mb);
        const nx = dx / d, nz = dz / d;
        a.pos.x -= nx * push * ta; a.pos.z -= nz * push * ta;
        b.pos.x += nx * push * tb; b.pos.z += nz * push * tb;
      }
    }
  }

  // Inimigos (ou entidades hostis a 'team') vivos
  hostilesTo(team) {
    return this.list.filter((e) => e.alive && !e.removed && e.targetable && isHostile(team, e.team));
  }

  inRadius(x, z, r, filter) {
    const out = [];
    for (const e of this.list) {
      if (e.removed || !e.alive) continue;
      const dx = e.pos.x - x, dz = e.pos.z - z;
      const rr = r + e.radius;
      if (dx * dx + dz * dz <= rr * rr && (!filter || filter(e))) out.push(e);
    }
    return out;
  }

  nearest(x, z, maxDist, filter) {
    let best = null, bd = maxDist * maxDist;
    for (const e of this.list) {
      if (e.removed || !e.alive) continue;
      if (filter && !filter(e)) continue;
      const dx = e.pos.x - x, dz = e.pos.z - z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // Raio contra esferas das entidades. Retorna { e, t } do mais próximo.
  raycast(origin, dir, maxDist, filter) {
    let best = null, bt = maxDist;
    for (const e of this.list) {
      if (e.removed || !e.alive || !e.targetable) continue;
      if (filter && !filter(e)) continue;
      const c = e.center;
      const r = Math.max(e.radius * 1.5, e.height * 0.42);
      _v.subVectors(c, origin);
      const tca = _v.dot(dir);
      if (tca < 0) continue;
      const d2 = _v.lengthSq() - tca * tca;
      if (d2 > r * r) continue;
      const t = tca - Math.sqrt(r * r - d2);
      if (t < bt && t > 0) { bt = t; best = e; }
    }
    return best ? { e: best, t: bt } : null;
  }

  clearWhere(fn) {
    for (const e of this.list) if (fn(e)) e.remove();
  }
}

export function isHostile(teamA, teamB) {
  const side = (t) => (t === 'player' || t === 'ally' ? 'good' : t);
  const a = side(teamA), b = side(teamB);
  if (a === b) return false;
  if (a === 'neutral' || b === 'neutral') return false;
  if (a === 'object' || b === 'object') return a === 'good' || b === 'good';
  return true;
}

export function sameSide(a, b) {
  const s = (t) => (t === 'player' || t === 'ally' ? 'good' : t);
  return s(a) === s(b);
}
