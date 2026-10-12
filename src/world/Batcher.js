// Agrupamento de geometria estática por material e por bloco espacial (poucas draw calls).
import * as THREE from 'three';
import { mergeGeoms, setColor, boxG, cylG, coneG, sphG, icoG, dodG, prismG, pyramidG } from '../core/geo.js';

const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

export class Batcher {
  constructor(chunkSize = 100) {
    this.chunk = chunkSize;
    this.buckets = new Map();
    this.count = 0;
  }

  // Adiciona geometria (será clonada/transformada). matrix: Matrix4 do mundo.
  add(geometry, matrix, color, matKey = 'std') {
    const g = geometry.index ? geometry.clone() : geometry.clone();
    g.deleteAttribute('uv');
    if (color !== undefined && color !== null) setColor(g, color);
    else if (!g.attributes.color) setColor(g, 0xffffff);
    g.applyMatrix4(matrix);
    if (!g.attributes.normal) g.computeVertexNormals();
    _v.setFromMatrixPosition(matrix);
    const cx = Math.floor(_v.x / this.chunk), cz = Math.floor(_v.z / this.chunk);
    const key = matKey + '|' + cx + '|' + cz;
    let b = this.buckets.get(key);
    if (!b) { b = { matKey, list: [] }; this.buckets.set(key, b); }
    b.list.push(g);
    this.count++;
  }

  build(parent, materials) {
    const meshes = [];
    for (const [, b] of this.buckets) {
      const merged = mergeGeoms(b.list, ['position', 'normal', 'color']);
      const mat = materials[b.matKey] || materials.std;
      const mesh = new THREE.Mesh(merged, mat);
      const opts = materials._opts?.[b.matKey] || {};
      mesh.castShadow = opts.castShadow ?? true;
      mesh.receiveShadow = opts.receiveShadow ?? true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
      meshes.push(mesh);
      for (const g of b.list) g.dispose();
    }
    this.buckets.clear();
    return meshes;
  }
}

/**
 * Pincel com pilha de transformações para montar estruturas em coordenadas locais.
 * Também registra colisores convertidos para o mundo.
 */
export class Brush {
  constructor(batcher, collision) {
    this.batcher = batcher;
    this.collision = collision;
    this.stack = [];
    this.origin = { x: 0, y: 0, z: 0, ry: 0, cos: 1, sin: 0 };
  }

  push(x, y, z, ry = 0) {
    this.stack.push(this.origin);
    // compõe com a origem atual
    const o = this.origin;
    const wx = o.x + x * o.cos + z * o.sin;
    const wz = o.z - x * o.sin + z * o.cos;
    const nry = o.ry + ry;
    this.origin = { x: wx, y: o.y + y, z: wz, ry: nry, cos: Math.cos(nry), sin: Math.sin(nry) };
    return this;
  }

  pop() { this.origin = this.stack.pop() || { x: 0, y: 0, z: 0, ry: 0, cos: 1, sin: 0 }; return this; }

  // Converte ponto local -> mundo
  toWorld(lx, ly, lz) {
    const o = this.origin;
    return { x: o.x + lx * o.cos + lz * o.sin, y: o.y + ly, z: o.z - lx * o.sin + lz * o.cos };
  }

  matrix(lx, ly, lz, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const o = this.origin;
    _m.makeRotationY(o.ry);
    _m.setPosition(o.x, o.y, o.z);
    _e.set(rx, ry, rz);
    _q.setFromEuler(_e);
    _m2.compose(_v.set(lx, ly, lz), _q, _s.set(sx, sy, sz));
    return _m.multiply(_m2);
  }

  geom(g, lx, ly, lz, color, o = {}) {
    this.batcher.add(g, this.matrix(lx, ly, lz, o.rx || 0, o.ry || 0, o.rz || 0, o.sx || 1, o.sy || 1, o.sz || 1), color, o.mat || 'std');
    g.dispose();
    return this;
  }

  // Caixa com base em ly (não centro)
  box(w, h, d, lx, ly, lz, color, o = {}) {
    const g = boxG(w, h, d);
    g.translate(0, h / 2, 0);
    this.geom(g, lx, ly, lz, color, o);
    if (o.collide) this.colBox(lx, lz, w / 2 + (o.pad || 0), d / 2 + (o.pad || 0), ly, ly + h, o.ry || 0, o);
    return this;
  }

  cyl(rt, rb, h, lx, ly, lz, color, o = {}) {
    const g = cylG(rt, rb, h, o.seg || 8);
    g.translate(0, h / 2, 0);
    this.geom(g, lx, ly, lz, color, o);
    if (o.collide) this.colCircle(lx, lz, Math.max(rt, rb) + (o.pad || 0), ly, ly + h);
    return this;
  }

  cone(r, h, lx, ly, lz, color, o = {}) {
    const g = coneG(r, h, o.seg || 8);
    g.translate(0, h / 2, 0);
    return this.geom(g, lx, ly, lz, color, o);
  }

  sphere(r, lx, ly, lz, color, o = {}) {
    return this.geom(sphG(r, o.ws || 8, o.hs || 6), lx, ly, lz, color, o);
  }

  ico(r, lx, ly, lz, color, o = {}) { return this.geom(icoG(r, o.detail || 0), lx, ly, lz, color, o); }
  dod(r, lx, ly, lz, color, o = {}) { return this.geom(dodG(r, 0), lx, ly, lz, color, o); }

  prism(w, h, d, lx, ly, lz, color, o = {}) { return this.geom(prismG(w, h, d), lx, ly, lz, color, o); }
  pyramid(w, h, d, lx, ly, lz, color, o = {}) {
    const g = pyramidG(w, h, d); g.translate(0, h / 2, 0);
    return this.geom(g, lx, ly, lz, color, o);
  }

  colBox(lx, lz, hw, hd, y0, y1, lry = 0, o = {}) {
    if (!this.collision) return null;
    const p = this.toWorld(lx, 0, lz);
    return this.collision.addBox(p.x, p.z, hw, hd, this.origin.ry + lry, { y0: this.origin.y + y0, y1: this.origin.y + y1, proj: o.proj, camera: o.camera, tag: o.tag });
  }

  colPlatform(lx, lz, hw, hd, top, lry = 0, o = {}) {
    if (!this.collision) return null;
    const p = this.toWorld(lx, 0, lz);
    return this.collision.addPlatform(p.x, p.z, hw, hd, this.origin.ry + lry, this.origin.y + top, o);
  }

  colCircle(lx, lz, r, y0 = -2, y1 = 50, o = {}) {
    if (!this.collision) return null;
    const p = this.toWorld(lx, 0, lz);
    return this.collision.addCircle(p.x, p.z, r, { y0: this.origin.y + y0, y1: this.origin.y + y1, proj: o.proj, tag: o.tag });
  }
}
