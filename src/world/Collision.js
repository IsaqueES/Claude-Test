// Colisão estática: círculos, caixas orientadas, plataformas caminháveis e consultas espaciais.
import * as THREE from 'three';
import { WORLD } from './WorldMap.js';

const STEP_UP = 0.65;
const MAX_SLOPE = 1.15;

export class Collision {
  constructor(terrain) {
    this.terrain = terrain;
    this.cell = 12;
    this.grid = new Map();
    this.all = [];
    this._stamp = 0;
  }

  key(ix, iz) { return (ix + 1000) * 4096 + (iz + 1000); }

  insert(c) {
    const r = c.type === 'c' ? c.r : Math.hypot(c.hw, c.hd);
    const x0 = Math.floor((c.x - r) / this.cell), x1 = Math.floor((c.x + r) / this.cell);
    const z0 = Math.floor((c.z - r) / this.cell), z1 = Math.floor((c.z + r) / this.cell);
    c._cells = [];
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const k = this.key(ix, iz);
      let arr = this.grid.get(k);
      if (!arr) { arr = []; this.grid.set(k, arr); }
      arr.push(c);
      c._cells.push(k);
    }
    c._stamp = 0;
    this.all.push(c);
    return c;
  }

  remove(c) {
    if (!c || !c._cells) return;
    for (const k of c._cells) {
      const arr = this.grid.get(k);
      if (arr) { const i = arr.indexOf(c); if (i >= 0) arr.splice(i, 1); }
    }
    const i = this.all.indexOf(c);
    if (i >= 0) this.all.splice(i, 1);
    c._cells = null;
  }

  addCircle(x, z, r, opts = {}) {
    return this.insert({ type: 'c', x, z, r, y0: opts.y0 ?? -100, y1: opts.y1 ?? 1000, tag: opts.tag, enabled: true, solidToProjectiles: opts.proj ?? true });
  }

  addBox(x, z, hw, hd, rot = 0, opts = {}) {
    return this.insert({
      type: 'b', x, z, hw, hd, rot, cos: Math.cos(rot), sin: Math.sin(rot),
      y0: opts.y0 ?? -100, y1: opts.y1 ?? 1000, tag: opts.tag, enabled: true,
      platform: !!opts.platform, solidToProjectiles: opts.proj ?? true, camera: opts.camera ?? true,
    });
  }

  // Plataforma caminhável (ex.: ponte). top = altura da superfície.
  addPlatform(x, z, hw, hd, rot, top, opts = {}) {
    return this.addBox(x, z, hw, hd, rot, { y0: top - (opts.thickness ?? 0.5), y1: top, platform: true, proj: true, camera: false, tag: opts.tag });
  }

  forEachNear(x, z, r, fn) {
    const stamp = ++this._stamp;
    const x0 = Math.floor((x - r) / this.cell), x1 = Math.floor((x + r) / this.cell);
    const z0 = Math.floor((z - r) / this.cell), z1 = Math.floor((z + r) / this.cell);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const arr = this.grid.get(this.key(ix, iz));
      if (!arr) continue;
      for (const c of arr) {
        if (c._stamp === stamp || !c.enabled) continue;
        c._stamp = stamp;
        if (fn(c) === false) return;
      }
    }
  }

  // Altura do chão considerando plataformas.
  groundHeight(x, z, feetY = Infinity) {
    let g = this.terrain.heightAt(x, z);
    this.forEachNear(x, z, 0.5, (c) => {
      if (!c.platform) return;
      if (c.y1 <= g) return;
      if (feetY < c.y1 - STEP_UP - 0.6) return; // está embaixo
      const dx = x - c.x, dz = z - c.z;
      const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
      if (Math.abs(lx) <= c.hw && Math.abs(lz) <= c.hd) g = c.y1;
    });
    return g;
  }

  onPlatform(x, z, feetY) {
    let on = false;
    this.forEachNear(x, z, 0.5, (c) => {
      if (!c.platform || feetY < c.y1 - STEP_UP - 0.6) return;
      const dx = x - c.x, dz = z - c.z;
      const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
      if (Math.abs(lx) <= c.hw && Math.abs(lz) <= c.hd) on = true;
    });
    return on;
  }

  // Empurra uma entidade (círculo) para fora dos colisores. pos: Vector3 (pés).
  resolve(pos, radius, height) {
    let hit = false;
    const feet = pos.y, head = pos.y + height;
    this.forEachNear(pos.x, pos.z, radius + 1, (c) => {
      if (head < c.y0 || feet > c.y1) return;
      if (c.platform && feet >= c.y1 - STEP_UP) return;
      if (c.type === 'c') {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const d = Math.hypot(dx, dz);
        const min = radius + c.r;
        if (d < min) {
          const k = d > 1e-4 ? (min - d) / d : 1;
          pos.x += (d > 1e-4 ? dx : 1) * k;
          pos.z += (d > 1e-4 ? dz : 0) * k;
          hit = true;
        }
      } else {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        // para o espaço local da caixa
        let lx = dx * c.cos - dz * c.sin;
        let lz = dx * c.sin + dz * c.cos;
        const cx = Math.max(-c.hw, Math.min(c.hw, lx));
        const cz = Math.max(-c.hd, Math.min(c.hd, lz));
        let ox = lx - cx, oz = lz - cz;
        const d = Math.hypot(ox, oz);
        if (d < radius) {
          if (d > 1e-4) {
            const k = (radius - d) / d;
            lx += ox * k; lz += oz * k;
          } else {
            // dentro da caixa: empurra pelo eixo mais próximo
            const px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz);
            if (px < pz) lx = Math.sign(lx || 1) * (c.hw + radius);
            else lz = Math.sign(lz || 1) * (c.hd + radius);
          }
          // de volta ao mundo
          pos.x = c.x + lx * c.cos + lz * c.sin;
          pos.z = c.z - lx * c.sin + lz * c.cos;
          hit = true;
        }
      }
    });
    return hit;
  }

  // Terreno impede o movimento? (encosta íngreme, água funda, limites)
  terrainBlocks(fromX, fromZ, toX, toZ, feetY) {
    const lim = WORLD.half - 8;
    if (Math.abs(toX) > lim || Math.abs(toZ) > lim) return true;
    const g1 = this.groundHeight(toX, toZ, feetY);
    const g0 = this.groundHeight(fromX, fromZ, feetY);
    const d = Math.hypot(toX - fromX, toZ - fromZ) || 1e-4;
    if (g1 - g0 > MAX_SLOPE * d + 0.02 && g1 > feetY + 0.35) return true;
    const w = this.terrain.waterAt(toX, toZ);
    if (w && w.depth > 1.55 && !this.onPlatform(toX, toZ, feetY)) return true;
    return false;
  }

  // Raio 3D contra colisores (para câmera e projéteis). Retorna distância ou Infinity.
  raycast(origin, dir, maxDist, filter) {
    let best = maxDist;
    const steps = Math.ceil(maxDist / this.cell) + 1;
    const visited = new Set();
    for (let s = 0; s <= steps; s++) {
      const t = Math.min(maxDist, s * this.cell);
      const px = origin.x + dir.x * t, pz = origin.z + dir.z * t;
      this.forEachNear(px, pz, this.cell, (c) => {
        if (visited.has(c)) return;
        visited.add(c);
        if (filter && !filter(c)) return;
        const d = c.type === 'c' ? rayCircle(origin, dir, c) : rayBox(origin, dir, c);
        if (d >= 0 && d < best) best = d;
      });
    }
    return best < maxDist ? best : Infinity;
  }

  // Ponto dentro de algum colisor sólido?
  pointSolid(x, y, z, filter) {
    let solid = false;
    this.forEachNear(x, z, 0.5, (c) => {
      if (y < c.y0 || y > c.y1) return;
      if (filter && !filter(c)) return;
      if (c.type === 'c') {
        if (Math.hypot(x - c.x, z - c.z) < c.r) { solid = true; return false; }
      } else {
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
        if (Math.abs(lx) < c.hw && Math.abs(lz) < c.hd) { solid = true; return false; }
      }
    });
    return solid;
  }
}

function rayCircle(o, d, c) {
  const ox = o.x - c.x, oz = o.z - c.z;
  const a = d.x * d.x + d.z * d.z;
  if (a < 1e-8) return -1;
  const b = 2 * (ox * d.x + oz * d.z);
  const cc = ox * ox + oz * oz - c.r * c.r;
  const disc = b * b - 4 * a * cc;
  if (disc < 0) return -1;
  const sq = Math.sqrt(disc);
  let t = (-b - sq) / (2 * a);
  if (t < 0) t = (-b + sq) / (2 * a);
  if (t < 0) return -1;
  const y = o.y + d.y * t;
  if (y < c.y0 || y > c.y1) return -1;
  return t;
}

function rayBox(o, d, c) {
  const dx = o.x - c.x, dz = o.z - c.z;
  const lox = dx * c.cos - dz * c.sin, loz = dx * c.sin + dz * c.cos;
  const ldx = d.x * c.cos - d.z * c.sin, ldz = d.x * c.sin + d.z * c.cos;
  let tmin = -Infinity, tmax = Infinity;
  const slab = (o1, d1, min, max) => {
    if (Math.abs(d1) < 1e-8) { if (o1 < min || o1 > max) { tmin = Infinity; } return; }
    let t1 = (min - o1) / d1, t2 = (max - o1) / d1;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
  };
  slab(lox, ldx, -c.hw, c.hw);
  slab(o.y, d.y, c.y0, c.y1);
  slab(loz, ldz, -c.hd, c.hd);
  if (tmin > tmax || tmax < 0) return -1;
  return tmin >= 0 ? tmin : 0;
}

export const COLLISION_CONST = { STEP_UP, MAX_SLOPE };
export const _tmpV = new THREE.Vector3();
