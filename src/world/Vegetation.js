// Vegetação e rochas instanciadas com balanço ao vento.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { RNG, smoothstep, createNoise2D } from '../core/math.js';
import { mergeGeoms, setColor, setColorGradient, jitter } from '../core/geo.js';
import { LOC, WORLD } from './WorldMap.js';

const windUniform = { value: 0 };

function windMaterial(opts = {}) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0, ...opts });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 ip = vec3(0.0);
        #endif
        float hh = max(position.y, 0.0);
        float sw = sin(uTime * 1.7 + ip.x * 0.21 + ip.z * 0.17) * 0.035 + sin(uTime * 3.1 + ip.x * 0.5) * 0.012;
        transformed.x += sw * hh * hh * 0.35;
        transformed.z += sw * hh * hh * 0.22;`);
  };
  return mat;
}

function colorGeo(g, c) { g.deleteAttribute('uv'); setColor(g, c); return g; }

// ---------- Geometrias base ----------
function pineGeo(seed) {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.22, 0.32, 2.4, 6); trunk.translate(0, 1.2, 0);
  parts.push(colorGeo(trunk, 0x5a3a22));
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const r = 2.3 - i * 0.6, h = 2.8 - i * 0.3;
    const c = new THREE.ConeGeometry(r, h, 7, 1); c.translate(0, 1.9 + i * 1.55 + h / 2, 0);
    const g = jitter(c, 0.12, seed * 10 + i);
    setColorGradient(g, i === 0 ? 0x1f4a26 : 0x245a2c, 0x3a7a3a);
    parts.push(g);
  }
  return mergeGeoms(parts.map(prep));
}

function oakGeo(seed) {
  const rng = new RNG(seed);
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.28, 0.42, 2.8, 6); trunk.translate(0, 1.4, 0);
  parts.push(colorGeo(trunk, 0x5e4026));
  const br = new THREE.CylinderGeometry(0.1, 0.18, 1.6, 5); br.rotateZ(0.8); br.translate(0.55, 2.6, 0);
  parts.push(colorGeo(br, 0x5e4026));
  const n = 4;
  for (let i = 0; i < n; i++) {
    const r = rng.float(1.4, 2.1);
    const s = new THREE.IcosahedronGeometry(r, 0);
    s.translate(rng.float(-1.1, 1.1), 3.6 + rng.float(-0.3, 1.2), rng.float(-1.1, 1.1));
    const g = jitter(s, 0.18, seed * 7 + i);
    setColorGradient(g, 0x2e5a22, rng.chance(0.5) ? 0x5a8a34 : 0x4e8030);
    parts.push(g);
  }
  return mergeGeoms(parts.map(prep));
}

function birchGeo(seed) {
  const rng = new RNG(seed);
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.14, 0.2, 4.2, 6); trunk.translate(0, 2.1, 0);
  parts.push(colorGeo(trunk, 0xd8d4c8));
  for (let i = 0; i < 4; i++) {
    const m = new THREE.CylinderGeometry(0.205, 0.205, 0.08, 6); m.translate(0, 0.6 + i * 0.8 + rng.float(0, 0.3), 0);
    parts.push(colorGeo(m, 0x2a2a2a));
  }
  for (let i = 0; i < 3; i++) {
    const s = new THREE.IcosahedronGeometry(rng.float(0.9, 1.3), 0);
    s.translate(rng.float(-0.6, 0.6), 4.2 + i * 0.6, rng.float(-0.6, 0.6));
    const g = jitter(s, 0.12, seed * 3 + i);
    setColorGradient(g, 0x6a8a2a, 0xa8b840);
    parts.push(g);
  }
  return mergeGeoms(parts.map(prep));
}

function deadTreeGeo(seed, color = 0x3a3036) {
  const rng = new RNG(seed);
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.15, 0.35, 4.5, 5); trunk.translate(0, 2.25, 0);
  parts.push(colorGeo(trunk, color));
  for (let i = 0; i < 5; i++) {
    const L = rng.float(1.0, 2.2);
    const b = new THREE.CylinderGeometry(0.04, 0.12, L, 4);
    b.translate(0, L / 2, 0);
    b.rotateZ(rng.float(0.5, 1.2) * (rng.chance(0.5) ? 1 : -1));
    b.rotateY(rng.float(0, Math.PI * 2));
    b.translate(0, rng.float(2.0, 4.2), 0);
    parts.push(colorGeo(b, color));
  }
  return mergeGeoms(parts.map(prep));
}

function bushGeo(seed) {
  const rng = new RNG(seed);
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.IcosahedronGeometry(rng.float(0.6, 0.95), 0);
    s.translate(rng.float(-0.6, 0.6), 0.5 + rng.float(0, 0.3), rng.float(-0.6, 0.6));
    const g = jitter(s, 0.1, seed * 13 + i);
    setColorGradient(g, 0x2a5222, 0x4a7a30);
    parts.push(g);
  }
  return mergeGeoms(parts.map(prep));
}

function rockGeo(seed) {
  const s = new THREE.DodecahedronGeometry(1, 0);
  const g = jitter(s, 0.22, seed);
  g.scale(1, 0.7, 1);
  setColorGradient(g, 0x5a5650, 0x8a857c);
  return prep(g);
}

function grassGeo() {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI + 0.3;
    const g = new THREE.BufferGeometry();
    const w = 0.12, h = 0.5 + (i % 3) * 0.15;
    const ox = Math.cos(a * 2.3) * 0.12, oz = Math.sin(a * 1.7) * 0.12;
    const c = Math.cos(a) * w, s = Math.sin(a) * w;
    const lean = 0.12 * (i % 2 ? 1 : -1);
    g.setAttribute('position', new THREE.Float32BufferAttribute([ox - c, 0, oz - s, ox + c, 0, oz + s, ox + lean, h, oz + lean * 0.5], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    setColorGradient(g, 0x3e6a26, 0x9cc454);
    parts.push(g);
  }
  return mergeGeoms(parts);
}

function flowerGeo() {
  const parts = [];
  const stem = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 3); stem.translate(0, 0.22, 0);
  parts.push(colorGeo(stem, 0x3a6a2a));
  const head = new THREE.IcosahedronGeometry(0.08, 0); head.translate(0, 0.47, 0);
  head.deleteAttribute('uv');
  setColor(head, 0xffffff);
  parts.push(head);
  return mergeGeoms(parts.map(prep));
}

function sunflowerGeo() {
  const parts = [];
  const stem = new THREE.CylinderGeometry(0.03, 0.04, 1.5, 4); stem.translate(0, 0.75, 0);
  parts.push(colorGeo(stem, 0x3a6a2a));
  const disc = new THREE.CylinderGeometry(0.28, 0.28, 0.06, 10); disc.rotateX(Math.PI / 2 - 0.3); disc.translate(0, 1.55, 0.05);
  parts.push(colorGeo(disc, 0xf0c020));
  const center = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8); center.rotateX(Math.PI / 2 - 0.3); center.translate(0, 1.55, 0.09);
  parts.push(colorGeo(center, 0x4a2a10));
  const leaf = new THREE.BoxGeometry(0.3, 0.02, 0.12); leaf.translate(0.15, 0.8, 0);
  parts.push(colorGeo(leaf, 0x3a7a2a));
  return mergeGeoms(parts.map(prep));
}

function mushroomGeo() {
  const parts = [];
  const stem = new THREE.CylinderGeometry(0.08, 0.1, 0.35, 6); stem.translate(0, 0.17, 0);
  parts.push(colorGeo(stem, 0xeee0c8));
  const cap = new THREE.SphereGeometry(0.22, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2); cap.translate(0, 0.33, 0);
  parts.push(colorGeo(cap, 0xffffff));
  return mergeGeoms(parts.map(prep));
}

function prep(g) {
  if (g.attributes.uv) g.deleteAttribute('uv');
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.color) setColor(g, 0xffffff);
  return g;
}

// ---------- Gerenciador ----------
export class Vegetation {
  constructor(scene, terrain, collision) {
    this.scene = scene;
    this.terrain = terrain;
    this.collision = collision;
    this.group = new THREE.Group();
    this.group.name = 'vegetation';
    scene.add(this.group);
    this.matWind = windMaterial();
    this.matStatic = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
    this.matGlowCap = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6, emissive: new THREE.Color(0x401010), emissiveIntensity: 1 });
    this.noise = createNoise2D(WORLD.seed + 404);
    this.grassChunks = [];
    this.chunkSize = 120;
  }

  // Fator de exclusão: true se não pode ter árvore ali.
  blocked(x, z, clearance = 2.5, roadPad = 2.5) {
    const t = this.terrain;
    if (Math.abs(x) > WORLD.half - 6 || Math.abs(z) > WORLD.half - 6) return true;
    if (t.roadDist(x, z) < roadPad) return true;
    if (t.waterAt(x, z)) return true;
    if (t.riverDist(x, z) < 9) return true;
    for (const k in LOC) {
      const l = LOC[k];
      if (k === 'mountains' || k === 'sunfields' || k === 'mushrooms') continue;
      const pad = k === 'lake' ? 16 : k === 'brumavale' ? 10 : 4;
      if (Math.hypot(x - l.x, z - l.z) < l.r + pad) return true;
    }
    if (x > -55 && x < 55 && z < -145 && z > -240) return true; // castelo
    let near = false;
    this.collision.forEachNear(x, z, clearance, (c) => {
      const d = c.type === 'c' ? Math.hypot(x - c.x, z - c.z) - c.r : Math.hypot(x - c.x, z - c.z) - Math.max(c.hw, c.hd);
      if (d < clearance) { near = true; return false; }
    });
    return near;
  }

  forestDensity(x, z) {
    const n = this.noise(x / 60, z / 60) * 0.5 + 0.5;
    const n2 = this.noise(x / 18 + 50, z / 18) * 0.5 + 0.5;
    let d = 0.06 + n * 0.12;
    // Floresta dos Sussurros (oeste)
    d += smoothstep(-70, -110, x) * 0.75 * (0.55 + n2 * 0.45);
    // floresta ao norte
    d += smoothstep(-40, -90, z) * smoothstep(60, -10, x) * 0.45 * n2;
    // bosques ao leste
    d += smoothstep(170, 260, x) * 0.35 * n;
    // perto das montanhas
    if (x < -120 && z < -130) d *= 0.45;
    // Fenda: nenhuma árvore viva
    if (z < -236 && Math.abs(x) < 130) d = 0;
    return Math.min(1, d);
  }

  build() {
    const t = this.terrain;
    const rng = new RNG(4242);
    const types = {
      pine: [pineGeo(1), pineGeo(2), pineGeo(3)],
      oak: [oakGeo(4), oakGeo(5), oakGeo(6)],
      birch: [birchGeo(7), birchGeo(8)],
      dead: [deadTreeGeo(9), deadTreeGeo(10)],
      riftTree: [deadTreeGeo(11, 0x24142e), deadTreeGeo(12, 0x2a1838)],
      bush: [bushGeo(13), bushGeo(14)],
      rock: [rockGeo(15), rockGeo(16), rockGeo(17)],
    };
    const lists = {}; // key -> [{x,y,z,s,ry,c}]
    const push = (key, inst) => { (lists[key] ||= []).push(inst); };
    const color = new THREE.Color();

    // Árvores em grade com jitter
    const sp = 5.2;
    for (let gx = -WORLD.half; gx < WORLD.half; gx += sp) {
      for (let gz = -WORLD.half; gz < WORLD.half; gz += sp) {
        const x = gx + rng.float(0, sp), z = gz + rng.float(0, sp);
        const dens = this.forestDensity(x, z);
        if (rng.next() > dens) continue;
        const slope = t.slopeAt(x, z);
        const h = t.heightAt(x, z);
        if (slope > 0.85 || h > 34) continue;
        if (this.blocked(x, z)) continue;
        // escolha de espécie
        let kind;
        const west = x < -80;
        const high = h > 16 || (x < -120 && z < -120);
        const r = rng.next();
        if (high) kind = r < 0.85 ? 'pine' : 'dead';
        else if (west) kind = r < 0.5 ? 'pine' : r < 0.85 ? 'oak' : r < 0.95 ? 'birch' : 'dead';
        else kind = r < 0.25 ? 'pine' : r < 0.75 ? 'oak' : 'birch';
        const variant = rng.int(0, types[kind].length - 1);
        const s = rng.float(0.8, 1.35);
        push(kind + variant, { x, y: h - 0.2, z, s, ry: rng.float(0, Math.PI * 2), c: color.setHSL(0, 0, rng.float(0.88, 1.0), THREE.SRGBColorSpace).getHex() });
        this.collision.addCircle(x, z, 0.45 * s, { y0: h - 1, y1: h + 6 });
        // arbustos ao redor
        if (rng.chance(0.25)) {
          const bx = x + rng.float(-3, 3), bz = z + rng.float(-3, 3);
          if (!this.blocked(bx, bz, 1.0, 1.5)) push('bush' + rng.int(0, 1), { x: bx, y: t.heightAt(bx, bz) - 0.1, z: bz, s: rng.float(0.7, 1.3), ry: rng.float(0, 6.28), c: 0xffffff });
        }
      }
    }
    // Árvores mortas e cristais na Fenda
    for (let i = 0; i < 70; i++) {
      const x = rng.float(-105, 105), z = rng.float(-345, -255);
      if (Math.hypot(x, z + 305) < 34 || Math.abs(x) < 8) continue;
      if (this.blocked(x, z, 2, 3)) continue;
      const h = t.heightAt(x, z);
      const s = rng.float(0.9, 1.6);
      push('riftTree' + rng.int(0, 1), { x, y: h - 0.2, z, s, ry: rng.float(0, 6.28), c: 0xffffff });
      this.collision.addCircle(x, z, 0.4 * s, { y0: h - 1, y1: h + 6 });
    }
    // Árvores mortas no cemitério
    for (let i = 0; i < 6; i++) {
      const a = rng.float(0, 6.28), r = rng.float(19, 26);
      const x = LOC.cemetery.x + Math.cos(a) * r, z = LOC.cemetery.z + Math.sin(a) * r;
      if (t.roadDist(x, z) < 3) continue;
      const h = t.heightAt(x, z);
      push('dead' + rng.int(0, 1), { x, y: h - 0.2, z, s: rng.float(1, 1.4), ry: rng.float(0, 6.28), c: 0xffffff });
      this.collision.addCircle(x, z, 0.4, { y0: h - 1, y1: h + 6 });
    }
    // Rochas
    for (let i = 0; i < 1400; i++) {
      const x = rng.float(-WORLD.half + 10, WORLD.half - 10), z = rng.float(-WORLD.half + 10, WORLD.half - 10);
      const h = t.heightAt(x, z);
      const slope = t.slopeAt(x, z);
      const mountain = (x < -110 && z < -120) || Math.max(Math.abs(x), Math.abs(z)) > 270;
      if (!mountain && rng.chance(0.65)) continue;
      if (t.roadDist(x, z) < 1.5 || t.waterAt(x, z)) continue;
      if (this.blocked(x, z, 1.5, 1.5) && !mountain) continue;
      if (slope > 1.25) continue;
      const s = rng.float(0.4, mountain ? 3.2 : 1.6);
      push('rock' + rng.int(0, 2), { x, y: h - s * (0.25 + slope * 0.45), z, s, ry: rng.float(0, 6.28), c: color.setHSL(0.08, 0.05, rng.float(0.82, 1.0), THREE.SRGBColorSpace).getHex(), sy: rng.float(0.7, 1.2) });
      if (s > 0.9 && h < 40) this.collision.addCircle(x, z, s * 0.85, { y0: h - 2, y1: h + s * 0.8 });
    }

    // Constrói InstancedMeshes por espécie e por bloco
    const allGeos = { ...Object.fromEntries(Object.entries(types).flatMap(([k, arr]) => arr.map((g, i) => [k + i, g]))) };
    for (const key in lists) {
      const geo = allGeos[key];
      const isRock = key.startsWith('rock');
      this.buildInstanced(geo, lists[key], isRock ? this.matStatic : this.matWind, { castShadow: true });
    }

    // Grama e flores (somente perto do jogador são visíveis)
    this.buildGrass(rng);
    this.buildSpecials(rng);
  }

  buildInstanced(geo, items, material, opts = {}) {
    // agrupa por bloco espacial
    const chunks = new Map();
    for (const it of items) {
      const k = Math.floor(it.x / this.chunkSize) + ',' + Math.floor(it.z / this.chunkSize);
      (chunks.get(k) || chunks.set(k, []).get(k)).push(it);
    }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    const meshes = [];
    for (const [, arr] of chunks) {
      const mesh = new THREE.InstancedMesh(geo, material, arr.length);
      arr.forEach((it, i) => {
        e.set(it.rx || 0, it.ry || 0, it.rz || 0);
        q.setFromEuler(e);
        m.compose(p.set(it.x, it.y, it.z), q, s.set(it.s, it.s * (it.sy || 1), it.s));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, c.setHex(it.c ?? 0xffffff));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.castShadow = !!opts.castShadow;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      meshes.push(mesh);
    }
    return meshes;
  }

  buildGrass(rng) {
    const t = this.terrain;
    const grass = grassGeo();
    const flower = flowerGeo();
    const grassItems = [], flowerItems = [];
    const flowerColors = [0xffe040, 0xff6a8a, 0xb07aff, 0xffffff, 0x6ab0ff, 0xff8a3a];
    const count = G.settings.quality === 'low' ? 14000 : G.settings.quality === 'high' ? 52000 : 32000;
    for (let i = 0; i < count; i++) {
      const x = rng.float(-WORLD.half + 15, WORLD.half - 15), z = rng.float(-WORLD.half + 15, WORLD.half - 15);
      const h = t.heightAt(x, z);
      if (h > 30 || t.slopeAt(x, z) > 0.7) continue;
      if (t.roadDist(x, z) < 0.5 || t.waterAt(x, z)) continue;
      if (z < -236 && Math.abs(x) < 130) continue;
      if (x > -46 && x < 46 && z < -150 && z > -230) continue;
      if (Math.hypot(x - LOC.brumavale.x, z - LOC.brumavale.z) < 15) continue;
      const n = this.noise(x / 25, z / 25);
      if (n < -0.35 && rng.chance(0.7)) continue;
      if (rng.chance(0.1)) {
        flowerItems.push({ x, y: h, z, s: rng.float(0.8, 1.3), ry: rng.float(0, 6.28), c: rng.pick(flowerColors) });
      } else {
        grassItems.push({ x, y: h - 0.05, z, s: rng.float(0.7, 1.5), ry: rng.float(0, 6.28), c: new THREE.Color().setHSL(0.22 + rng.float(-0.05, 0.05), 0.35, rng.float(0.8, 0.98), THREE.SRGBColorSpace).getHex() });
      }
    }
    const gm = windMaterial({ side: THREE.DoubleSide });
    this.grassChunks.push(...this.buildInstanced(grass, grassItems, gm));
    this.grassChunks.push(...this.buildInstanced(flower, flowerItems, this.matWind));
  }

  buildSpecials(rng) {
    const t = this.terrain;
    // Girassóis
    const sun = sunflowerGeo();
    const items = [];
    for (let i = 0; i < 520; i++) {
      const a = rng.float(0, 6.28), r = Math.sqrt(rng.next()) * 32;
      const x = LOC.sunfields.x + Math.cos(a) * r, z = LOC.sunfields.z + Math.sin(a) * r;
      if (t.roadDist(x, z) < 1.2) continue;
      items.push({ x, y: t.heightAt(x, z), z, s: rng.float(0.8, 1.2), ry: rng.float(-0.6, 0.6) + Math.PI * 0.85, c: 0xffffff });
    }
    this.buildInstanced(sun, items, this.matWind, { castShadow: false });
    // Cogumelos (vermelhos e brilhantes na clareira)
    const mush = mushroomGeo();
    const mitems = [];
    for (let i = 0; i < 160; i++) {
      const a = rng.float(0, 6.28), r = Math.sqrt(rng.next()) * 18;
      const x = LOC.mushrooms.x + Math.cos(a) * r, z = LOC.mushrooms.z + Math.sin(a) * r;
      mitems.push({ x, y: t.heightAt(x, z), z, s: rng.float(0.8, 2.6), ry: rng.float(0, 6.28), c: rng.pick([0xd83a2a, 0xe8502a, 0xc02a4a]) });
    }
    // gigantes
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.28, r = 12;
      const x = LOC.mushrooms.x + Math.cos(a) * r, z = LOC.mushrooms.z + Math.sin(a) * r;
      mitems.push({ x, y: t.heightAt(x, z), z, s: rng.float(5, 8), ry: rng.float(0, 6.28), c: 0xd83a2a });
      this.collision.addCircle(x, z, 0.6, { y0: t.heightAt(x, z) - 1, y1: t.heightAt(x, z) + 3 });
    }
    this.buildInstanced(mush, mitems, this.matGlowCap, { castShadow: true });
  }

  update(dt, camPos) {
    windUniform.value = G.time.now;
    // Esconde blocos de grama distantes
    for (const m of this.grassChunks) {
      const s = m.boundingSphere;
      if (!s) continue;
      const d = Math.hypot(s.center.x - camPos.x, s.center.z - camPos.z) - s.radius;
      m.visible = d < 110;
    }
  }
}
