// Terreno procedural: mapa de alturas, estradas, rio, lago e cores por vértice.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged, smoothstep, clamp, lerp, sampleCatmull } from '../core/math.js';
import { WORLD, ZONES, BUMPS, ROADS, RIVER, LOC } from './WorldMap.js';

// Grade de segmentos para buscas de distância rápidas.
class SegGrid {
  constructor(cell = 16) { this.cell = cell; this.map = new Map(); }
  key(ix, iz) { return ix * 73856093 ^ iz * 19349663; }
  add(lines) {
    this.lines = lines;
    lines.forEach((line, li) => {
      for (let i = 0; i < line.pts.length - 1; i++) {
        const [ax, az] = line.pts[i], [bx, bz] = line.pts[i + 1];
        const pad = (line.w || 4) + 12;
        const x0 = Math.floor((Math.min(ax, bx) - pad) / this.cell), x1 = Math.floor((Math.max(ax, bx) + pad) / this.cell);
        const z0 = Math.floor((Math.min(az, bz) - pad) / this.cell), z1 = Math.floor((Math.max(az, bz) + pad) / this.cell);
        for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
          const k = this.key(ix, iz);
          let arr = this.map.get(k);
          if (!arr) { arr = []; this.map.set(k, arr); }
          arr.push(li, i);
        }
      }
    });
  }
  // Retorna o segmento mais próximo {d, t, li, si} ou null
  nearest(x, z) {
    const arr = this.map.get(this.key(Math.floor(x / this.cell), Math.floor(z / this.cell)));
    if (!arr) return null;
    let best = null, bd = Infinity;
    for (let k = 0; k < arr.length; k += 2) {
      const li = arr[k], si = arr[k + 1];
      const pts = this.lines[li].pts;
      const ax = pts[si][0], az = pts[si][1], bx = pts[si + 1][0], bz = pts[si + 1][1];
      const vx = bx - ax, vz = bz - az, wx = x - ax, wz = z - az;
      const l2 = vx * vx + vz * vz;
      let t = l2 > 0 ? (wx * vx + wz * vz) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = x - (ax + vx * t), dz = z - (az + vz * t);
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = { li, si, t }; }
    }
    if (best) best.d = Math.sqrt(bd);
    return best;
  }
}

const srgb = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

export class Terrain {
  constructor() {
    this.half = WORLD.half;
    this.size = this.half * 2;
    this.seg = 288;
    this.step = this.size / this.seg;
    this.n = this.seg + 1;
    this.heights = new Float32Array(this.n * this.n);
    this.roadMask = new Float32Array(this.n * this.n);
    this.riverMask = new Float32Array(this.n * this.n);
    this.noiseA = createNoise2D(WORLD.seed);
    this.noiseB = createNoise2D(WORLD.seed + 7);
    this.noiseC = createNoise2D(WORLD.seed + 21);
    this.noiseD = createNoise2D(WORLD.seed + 99);
    this.generate();
  }

  // ---------------- Geração ----------------
  baseHeight(x, z) {
    const nA = this.noiseA, nC = this.noiseC;
    let h = 4 + fbm(nA, x / 170, z / 170, 4) * 6.5 + fbm(this.noiseB, x / 42, z / 42, 3) * 1.1;
    for (const b of BUMPS) {
      const dx = x - b.x, dz = z - b.z;
      const s = b.r / 2;
      h += b.h * Math.exp(-(dx * dx + dz * dz) / (2 * s * s));
    }
    // Cordilheira noroeste (Picos de Granito)
    const dm = Math.hypot(x + 255, z + 255);
    const mm = smoothstep(175, 70, dm);
    if (mm > 0) h += mm * (10 + ridged(nC, x / 55, z / 55, 4) * 52);
    // Montanhas da borda do mundo
    const e = Math.max(Math.abs(x), Math.abs(z)) + fbm(this.noiseD, x / 50, z / 50, 2) * 14;
    const em = smoothstep(282, 335, e);
    if (em > 0) h += em * (32 + ridged(nC, x / 40 + 9, z / 40, 3) * 42);
    // Serra ao norte do castelo (separa o reino da Fenda)
    const rz = smoothstep(-229, -246, z);
    if (rz > 0) h += rz * (36 + ridged(nC, x / 30, z / 30 + 4, 3) * 12);
    return h;
  }

  zoneWeight(zone, x, z) {
    let d;
    if (zone.type === 'circle') {
      d = Math.hypot(x - zone.x, z - zone.z) - zone.r;
    } else {
      const dx = Math.max(zone.x0 - x, 0, x - zone.x1);
      const dz = Math.max(zone.z0 - z, 0, z - zone.z1);
      d = Math.hypot(dx, dz);
    }
    if (d <= 0) return 1;
    return 1 - smoothstep(0, zone.f, d);
  }

  applyZones(h, x, z) {
    for (const zone of ZONES) {
      const w = this.zoneWeight(zone, x, z);
      if (w <= 0) continue;
      let target = typeof zone.h === 'function' ? zone.h(x, z) : zone.h;
      if (zone.noise) target += fbm(this.noiseB, x / 18, z / 18, 2) * zone.noise;
      h = lerp(h, target, w);
    }
    return h;
  }

  idx(ix, iz) { return iz * this.n + ix; }

  generate() {
    const { n, step, half } = this;
    const H = this.heights;
    // Passo 1: relevo base + zonas
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const x = ix * step - half, z = iz * step - half;
        H[this.idx(ix, iz)] = this.applyZones(this.baseHeight(x, z), x, z);
      }
    }

    // Passo 2: estradas — perfis suavizados e corredores transitáveis
    this.roads = ROADS.map((r) => ({ id: r.id, w: r.w, pts: sampleCatmull(r.pts, 3) }));
    for (const road of this.roads) {
      let prof = road.pts.map(([x, z]) => this.sampleGrid(x, z));
      for (let it = 0; it < 8; it++) {
        const np = prof.slice();
        for (let i = 0; i < prof.length; i++) {
          let s = 0, c = 0;
          for (let k = -3; k <= 3; k++) { const j = i + k; if (j >= 0 && j < prof.length) { s += prof[j]; c++; } }
          np[i] = s / c;
        }
        // mantém extremidades fiéis ao terreno
        np[0] = prof[0]; np[prof.length - 1] = prof[prof.length - 1];
        prof = np;
      }
      const maxRise = 0.32 * 3;
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 1; i < prof.length; i++) prof[i] = clamp(prof[i], prof[i - 1] - maxRise, prof[i - 1] + maxRise);
        for (let i = prof.length - 2; i >= 0; i--) prof[i] = clamp(prof[i], prof[i + 1] - maxRise, prof[i + 1] + maxRise);
      }
      road.profile = prof;
    }
    this.roadGrid = new SegGrid(16);
    this.roadGrid.add(this.roads);
    const H2 = new Float32Array(H);
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const x = ix * step - half, z = iz * step - half;
        const q = this.roadGrid.nearest(x, z);
        if (!q) continue;
        const road = this.roads[q.li];
        const rw = road.w;
        if (q.d > rw + 9) continue;
        const ph = lerp(road.profile[q.si], road.profile[q.si + 1], q.t);
        const w = 1 - smoothstep(rw * 0.8, rw + 9, q.d);
        const i = this.idx(ix, iz);
        H2[i] = lerp(H[i], ph, w);
        this.roadMask[i] = 1 - smoothstep(rw * 0.55, rw * 1.05, q.d);
      }
    }
    H.set(H2);

    // Passo 3: rio — perfil monotônico decrescente e leito escavado
    const rp = sampleCatmull(RIVER.pts, 3);
    let rprof = rp.map(([x, z]) => this.sampleGrid(x, z));
    for (let it = 0; it < 6; it++) {
      const np = rprof.slice();
      for (let i = 0; i < rprof.length; i++) {
        let s = 0, c = 0;
        for (let k = -4; k <= 4; k++) { const j = i + k; if (j >= 0 && j < rprof.length) { s += rprof[j]; c++; } }
        np[i] = Math.min(rprof[i], s / c);
      }
      rprof = np;
    }
    const surface = [];
    let cur = Infinity;
    for (let i = 0; i < rprof.length; i++) {
      cur = Math.min(cur - 0.02, rprof[i] - 1.1);
      surface.push(cur);
    }
    this.river = { pts: rp, surface, w: rp.map((_, i) => lerp(RIVER.w0, RIVER.w1, i / (rp.length - 1))) };
    this.riverGrid = new SegGrid(16);
    this.riverGrid.add([{ pts: rp, w: RIVER.w1 + 8 }]);
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const x = ix * step - half, z = iz * step - half;
        const q = this.riverGrid.nearest(x, z);
        if (!q || q.d > RIVER.w1 + 10) continue;
        const sH = lerp(surface[q.si], surface[q.si + 1], q.t);
        const w = lerp(this.river.w[q.si], this.river.w[q.si + 1], q.t);
        const bed = sH - 1.25;
        const i = this.idx(ix, iz);
        const h0 = H[i];
        let h;
        if (q.d < w) {
          const k = q.d / w;
          h = lerp(bed, sH + 0.35, k * k);
        } else {
          const k = smoothstep(w, w + 7, q.d);
          h = lerp(Math.min(h0, sH + 0.35 + (q.d - w) * 0.25), h0, k);
          h = Math.min(h, h0);
        }
        H[i] = h;
        this.riverMask[i] = 1 - smoothstep(w * 0.9, w + 2.5, q.d);
      }
    }
  }

  // Amostragem bilinear da grade (usada durante a geração).
  sampleGrid(x, z) {
    const { step, half, n } = this;
    const fx = clamp((x + half) / step, 0, n - 1.001), fz = clamp((z + half) / step, 0, n - 1.001);
    const ix = Math.floor(fx), iz = Math.floor(fz);
    const u = fx - ix, v = fz - iz;
    const H = this.heights;
    const a = H[this.idx(ix, iz)], b = H[this.idx(ix + 1, iz)], c = H[this.idx(ix, iz + 1)], d = H[this.idx(ix + 1, iz + 1)];
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }

  // Altura exata sobre a malha (mesma triangulação do mesh).
  heightAt(x, z) {
    const { step, half, n } = this;
    const fx = (x + half) / step, fz = (z + half) / step;
    if (fx < 0 || fz < 0 || fx >= n - 1 || fz >= n - 1) return 60;
    const ix = Math.floor(fx), iz = Math.floor(fz);
    const u = fx - ix, v = fz - iz;
    const H = this.heights;
    const ha = H[iz * n + ix];            // (ix, iz)
    const hb = H[(iz + 1) * n + ix];      // (ix, iz+1)
    const hc = H[(iz + 1) * n + ix + 1];  // (ix+1, iz+1)
    const hd = H[iz * n + ix + 1];        // (ix+1, iz)
    if (u + v <= 1) return ha + (hd - ha) * u + (hb - ha) * v;
    return hc + (hb - hc) * (1 - u) + (hd - hc) * (1 - v);
  }

  normalAt(x, z, out = new THREE.Vector3()) {
    const e = 0.8;
    const hx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    const hz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    return out.set(-hx, 2 * e, -hz).normalize();
  }

  slopeAt(x, z) {
    const e = 1.0;
    const hx = (this.heightAt(x + e, z) - this.heightAt(x - e, z)) / (2 * e);
    const hz = (this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e);
    return Math.sqrt(hx * hx + hz * hz);
  }

  // Informação de água num ponto: { surface, depth } ou null
  waterAt(x, z) {
    const g = this.heightAt(x, z);
    // Lago
    const dl = Math.hypot(x - LOC.lake.x, z - LOC.lake.z);
    if (dl < LOC.lake.r + 22 && g < WORLD.waterLevel) return { surface: WORLD.waterLevel, depth: WORLD.waterLevel - g };
    // Rio
    const q = this.riverGrid.nearest(x, z);
    if (q && q.d < RIVER.w1 + 2) {
      const s = lerp(this.river.surface[q.si], this.river.surface[q.si + 1], q.t);
      if (g < s) return { surface: s, depth: s - g };
    }
    return null;
  }

  roadDist(x, z) {
    const q = this.roadGrid.nearest(x, z);
    return q ? q.d - this.roads[q.li].w : 999;
  }

  riverDist(x, z) {
    const q = this.riverGrid.nearest(x, z);
    return q ? q.d : 999;
  }

  // Intersecções estrada × rio (para pontes)
  findBridges() {
    const res = [];
    const R = this.river.pts;
    for (const road of this.roads) {
      for (let i = 0; i < road.pts.length - 1; i++) {
        const [ax, az] = road.pts[i], [bx, bz] = road.pts[i + 1];
        for (let j = 0; j < R.length - 1; j++) {
          const [cx, cz] = R[j], [dx, dz] = R[j + 1];
          const den = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx);
          if (Math.abs(den) < 1e-9) continue;
          const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / den;
          const u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / den;
          if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
            const dir = Math.atan2(bx - ax, bz - az);
            const ph = lerp(road.profile[i], road.profile[i + 1], t);
            res.push({ x, z, yaw: dir, h: ph, w: road.w, riverW: lerp(this.river.w[j], this.river.w[j + 1], u), surface: this.river.surface[j] });
          }
        }
      }
    }
    return res;
  }

  // ---------------- Malha ----------------
  buildMesh() {
    const { n, step, half } = this;
    const count = n * n;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const H = this.heights;
    const c = new THREE.Color();
    const grassA = srgb(0.33, 0.52, 0.2), grassB = srgb(0.5, 0.58, 0.24), grassDark = srgb(0.2, 0.36, 0.15);
    const dirt = srgb(0.47, 0.36, 0.23), road = srgb(0.56, 0.46, 0.31);
    const rock = srgb(0.47, 0.45, 0.43), rockDark = srgb(0.32, 0.3, 0.3);
    const snow = srgb(0.93, 0.95, 0.98), sand = srgb(0.76, 0.69, 0.5), mud = srgb(0.3, 0.27, 0.2);
    const plaza = srgb(0.55, 0.52, 0.47), courtyard = srgb(0.5, 0.49, 0.47);
    const templeC = srgb(0.74, 0.64, 0.47), rift = srgb(0.2, 0.09, 0.28), riftVein = srgb(0.55, 0.2, 0.75);
    const wheat = srgb(0.8, 0.68, 0.3), crop = srgb(0.35, 0.5, 0.18), flowers = srgb(0.85, 0.75, 0.2);
    const nA = this.noiseA, nB = this.noiseB;

    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const i = iz * n + ix;
        const x = ix * step - half, z = iz * step - half;
        const h = H[i];
        pos[i * 3] = x; pos[i * 3 + 1] = h; pos[i * 3 + 2] = z;

        // inclinação
        const hl = H[iz * n + Math.max(0, ix - 1)], hr = H[iz * n + Math.min(n - 1, ix + 1)];
        const hu = H[Math.max(0, iz - 1) * n + ix], hdn = H[Math.min(n - 1, iz + 1) * n + ix];
        const slope = Math.hypot(hr - hl, hdn - hu) / (2 * step);

        const nv = nA(x / 22, z / 22) * 0.5 + 0.5;
        const nv2 = nB(x / 7, z / 7) * 0.5 + 0.5;
        c.copy(grassA).lerp(grassB, nv * 0.8);
        // floresta mais escura a oeste
        const forest = smoothstep(-60, -120, x) * (1 - smoothstep(-140, -180, z) * 0.5);
        c.lerp(grassDark, forest * 0.65);
        // Fazenda: faixas de plantação
        const df = Math.hypot(x - LOC.farm.x - 8, z - LOC.farm.z + 4);
        if (df < 24) {
          const stripe = Math.sin((x * 0.8 + z * 0.35)) > 0 ? wheat : crop;
          c.lerp(stripe, (1 - smoothstep(18, 24, df)) * 0.85);
        }
        // Campos de girassóis
        const ds = Math.hypot(x - LOC.sunfields.x, z - LOC.sunfields.z);
        if (ds < 38) c.lerp(flowers, (1 - smoothstep(20, 38, ds)) * 0.35 * nv2);
        // Praça da vila
        const dv = Math.hypot(x - LOC.brumavale.x, z - LOC.brumavale.z);
        if (dv < 16) c.lerp(plaza, (1 - smoothstep(10, 16, dv)) * (0.75 + nv2 * 0.2));
        // Pátio do castelo
        if (x > -44 && x < 44 && z > -228 && z < -152) c.lerp(courtyard, 0.85);
        // Templo
        const dt = Math.hypot(x - LOC.temple.x, z - LOC.temple.z);
        if (dt < 40) c.lerp(templeC, (1 - smoothstep(30, 40, dt)) * 0.75);
        // Estradas
        const rm = this.roadMask[i];
        if (rm > 0) c.lerp(road, rm * (0.85 + nv2 * 0.15));
        // Rochas em encostas íngremes e altitude
        const rockW = clamp(smoothstep(0.55, 1.0, slope) + smoothstep(24, 34, h), 0, 1);
        if (rockW > 0) c.lerp(nv2 > 0.5 ? rock : rockDark, rockW);
        if (h > 46) c.lerp(snow, smoothstep(46, 56, h + nv * 6) * (1 - smoothstep(1.2, 2.0, slope)));
        // Areia/lama perto da água
        const lakeD = Math.hypot(x - LOC.lake.x, z - LOC.lake.z);
        if (lakeD < 60 && h < 2.4) c.lerp(sand, smoothstep(2.4, 1.2, h));
        if (lakeD < 60 && h < 0.4) c.lerp(mud, smoothstep(0.4, -1.5, h));
        const rv = this.riverMask[i];
        if (rv > 0) c.lerp(h < this.waterSurfaceApprox(x, z) ? mud : sand, rv * 0.9);
        // Terra batida em acampamentos
        const dcamp = Math.hypot(x - LOC.banditCamp.x, z - LOC.banditCamp.z);
        if (dcamp < 32) c.lerp(dirt, (1 - smoothstep(18, 32, dcamp)) * 0.7);
        const dg = Math.hypot(x - LOC.guardCamp.x, z - LOC.guardCamp.z);
        if (dg < 22) c.lerp(dirt, (1 - smoothstep(12, 22, dg)) * 0.55);
        // Corrupção da Fenda
        const riftW = z < -236 && Math.abs(x) < 130 ? smoothstep(-236, -262, z) * (1 - smoothstep(105, 128, Math.abs(x))) : 0;
        if (riftW > 0) {
          c.lerp(rift, riftW * 0.92);
          const vein = Math.abs(nB(x / 9, z / 9));
          if (vein < 0.06) c.lerp(riftVein, riftW * (1 - vein / 0.06));
        }
        // variação fina
        const jitterL = 0.92 + nv2 * 0.16;
        col[i * 3] = c.r * jitterL; col[i * 3 + 1] = c.g * jitterL; col[i * 3 + 2] = c.b * jitterL;
      }
    }

    const idxCount = this.seg * this.seg * 6;
    const index = new Uint32Array(idxCount);
    let k = 0;
    for (let iz = 0; iz < this.seg; iz++) {
      for (let ix = 0; ix < this.seg; ix++) {
        const a = iz * n + ix;
        const b = (iz + 1) * n + ix;
        const cc = (iz + 1) * n + ix + 1;
        const d = iz * n + ix + 1;
        index[k++] = a; index[k++] = b; index[k++] = d;
        index[k++] = b; index[k++] = cc; index[k++] = d;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(index, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.96, metalness: 0 });
    const mesh = new THREE.Mesh(g, mat);
    mesh.receiveShadow = true;
    mesh.name = 'terrain';
    this.mesh = mesh;
    return mesh;
  }

  waterSurfaceApprox(x, z) {
    const q = this.riverGrid.nearest(x, z);
    if (!q) return -99;
    return lerp(this.river.surface[q.si], this.river.surface[q.si + 1], q.t);
  }

  // Raio contra o terreno (marcha + bisseção). Retorna distância ou -1.
  raycast(origin, dir, maxDist = 120) {
    let prevT = 0;
    let prevAbove = origin.y - this.heightAt(origin.x, origin.z);
    if (prevAbove < 0) return 0;
    const stepLen = 0.8;
    for (let t = stepLen; t <= maxDist; t += stepLen) {
      const x = origin.x + dir.x * t, y = origin.y + dir.y * t, z = origin.z + dir.z * t;
      const above = y - this.heightAt(x, z);
      if (above < 0) {
        let lo = prevT, hi = t;
        for (let i = 0; i < 8; i++) {
          const mid = (lo + hi) / 2;
          const mx = origin.x + dir.x * mid, my = origin.y + dir.y * mid, mz = origin.z + dir.z * mid;
          if (my - this.heightAt(mx, mz) < 0) hi = mid; else lo = mid;
        }
        return (lo + hi) / 2;
      }
      prevT = t; prevAbove = above;
    }
    return -1;
  }
}
