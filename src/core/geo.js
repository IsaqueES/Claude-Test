// Utilidades de geometria: mesclagem com cores por vértice, deformação low-poly etc.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from './math.js';

const _c = new THREE.Color();

export function setColor(geometry, color) {
  _c.set(color);
  const n = geometry.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geometry;
}

// Cor por vértice variando com a altura (ex.: gradiente em folhagens).
export function setColorGradient(geometry, colorBottom, colorTop, axis = 1) {
  const pos = geometry.attributes.position;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const v = pos.array[i * 3 + axis];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const a = new THREE.Color(colorBottom), b = new THREE.Color(colorTop);
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = max > min ? (pos.array[i * 3 + axis] - min) / (max - min) : 0;
    arr[i * 3] = a.r + (b.r - a.r) * t;
    arr[i * 3 + 1] = a.g + (b.g - a.g) * t;
    arr[i * 3 + 2] = a.b + (b.b - a.b) * t;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geometry;
}

// Solda vértices e desloca-os aleatoriamente (visual orgânico low-poly).
export function jitter(geometry, amount = 0.1, seed = 1) {
  let g = geometry;
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-3);
  const rnd = mulberry32(seed);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.array[i * 3] += (rnd() - 0.5) * 2 * amount;
    p.array[i * 3 + 1] += (rnd() - 0.5) * 2 * amount;
    p.array[i * 3 + 2] += (rnd() - 0.5) * 2 * amount;
  }
  g.computeVertexNormals();
  return g;
}

export function ensureIndexed(g) {
  if (g.index) return g;
  const n = g.attributes.position.count;
  const idx = n > 65535 ? new Uint32Array(n) : new Uint16Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

/**
 * Mescla geometrias (indexadas ou não) preservando os atributos listados.
 * Atributos ausentes são preenchidos com zero.
 */
export function mergeGeoms(list, attrNames = ['position', 'normal', 'color']) {
  let vCount = 0, iCount = 0;
  for (const g of list) {
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  const sizes = {};
  const arrays = {};
  for (const name of attrNames) {
    let size = 3;
    for (const g of list) if (g.attributes[name]) { size = g.attributes[name].itemSize; break; }
    if (name === 'skinIndex' || name === 'skinWeight') size = 4;
    if (name === 'uv') size = 2;
    sizes[name] = size;
    arrays[name] = name === 'skinIndex' ? new Uint16Array(vCount * size) : new Float32Array(vCount * size);
  }
  const index = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
  let vOff = 0, iOff = 0;
  for (const g of list) {
    const n = g.attributes.position.count;
    for (const name of attrNames) {
      const src = g.attributes[name];
      if (!src) continue;
      const size = sizes[name];
      const dst = arrays[name];
      if (src.itemSize === size && !src.isInterleavedBufferAttribute) {
        dst.set(src.array.subarray(0, n * size), vOff * size);
      } else {
        for (let i = 0; i < n; i++) for (let k = 0; k < size; k++) dst[(vOff + i) * size + k] = k < src.itemSize ? src.getComponent(i, k) : 0;
      }
    }
    if (g.index) {
      const gi = g.index.array;
      for (let i = 0; i < g.index.count; i++) index[iOff + i] = gi[i] + vOff;
      iOff += g.index.count;
    } else {
      for (let i = 0; i < n; i++) index[iOff + i] = vOff + i;
      iOff += n;
    }
    vOff += n;
  }
  for (const name of attrNames) {
    out.setAttribute(name, new THREE.BufferAttribute(arrays[name], sizes[name]));
  }
  out.setIndex(new THREE.BufferAttribute(index, 1));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

// --------- Fábricas de primitivas (já posicionadas) ---------
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

export function transformGeom(g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
  g.applyMatrix4(_m);
  return g;
}

export function boxG(w, h, d) { return new THREE.BoxGeometry(w, h, d); }
export function cylG(rt, rb, h, seg = 8, open = false) { return new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); }
export function coneG(r, h, seg = 8) { return new THREE.ConeGeometry(r, h, seg); }
export function sphG(r, ws = 8, hs = 6) { return new THREE.SphereGeometry(r, ws, hs); }
export function icoG(r, detail = 0) { return new THREE.IcosahedronGeometry(r, detail); }
export function dodG(r, detail = 0) { return new THREE.DodecahedronGeometry(r, detail); }
export function capG(r, len, cap = 3, rad = 8) { return new THREE.CapsuleGeometry(r, len, cap, rad); }

// Prisma triangular (telhado de duas águas). Base w (x) por d (z), altura h.
export function prismG(w, h, d) {
  const hw = w / 2, hd = d / 2;
  const v = [
    // frente (z+)
    -hw, 0, hd, hw, 0, hd, 0, h, hd,
    // trás (z-)
    hw, 0, -hd, -hw, 0, -hd, 0, h, -hd,
    // lado esquerdo
    -hw, 0, -hd, -hw, 0, hd, 0, h, hd,
    -hw, 0, -hd, 0, h, hd, 0, h, -hd,
    // lado direito
    hw, 0, hd, hw, 0, -hd, 0, h, -hd,
    hw, 0, hd, 0, h, -hd, 0, h, hd,
    // base
    -hw, 0, -hd, hw, 0, -hd, hw, 0, hd,
    -hw, 0, -hd, hw, 0, hd, -hw, 0, hd,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

// Pirâmide de base quadrada.
export function pyramidG(w, h, d) {
  const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
  g.rotateY(Math.PI / 4);
  g.scale(w, h, d);
  return g;
}
