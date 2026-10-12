// Construtor de personagens procedurais com esqueleto (skinning rígido) — 1 draw call por personagem.
import * as THREE from 'three';
import { mergeGeoms, setColor, jitter } from '../core/geo.js';

let toonGradient = null;
function getToonGradient() {
  if (toonGradient) return toonGradient;
  const data = new Uint8Array([60, 140, 255]);
  toonGradient = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  toonGradient.minFilter = toonGradient.magFilter = THREE.NearestFilter;
  toonGradient.needsUpdate = true;
  return toonGradient;
}

export class RigBuilder {
  constructor() {
    this.bones = [];
    this.byName = {};
    this.parts = [];
    this.glowParts = [];
    this.root = null;
  }

  bone(name, parentName, x, y, z, order = 'XYZ') {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    b.rotation.order = order;
    if (parentName) this.byName[parentName].add(b);
    else this.root = b;
    this.bones.push(b);
    this.byName[name] = b;
    return b;
  }

  // Geometria em coordenadas locais do osso.
  part(boneName, geo, color, o = {}) {
    const g = geo;
    if (o.x || o.y || o.z || o.rx || o.ry || o.rz || o.sx || o.sy || o.sz) {
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(o.x || 0, o.y || 0, o.z || 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0)),
        new THREE.Vector3(o.sx || 1, o.sy || 1, o.sz || 1),
      );
      g.applyMatrix4(m);
    }
    if (o.jitter) {
      const j = jitter(g, o.jitter, o.seed || 1);
      (o.glow ? this.glowParts : this.parts).push({ bone: boneName, geo: j, color, outline: o.outline !== false });
      return;
    }
    (o.glow ? this.glowParts : this.parts).push({ bone: boneName, geo: g, color, outline: o.outline !== false });
  }

  _assemble(list, outlineScale = 0) {
    const geos = [];
    for (const p of list) {
      if (outlineScale && !p.outline) continue;
      const bone = this.byName[p.bone];
      const idx = this.bones.indexOf(bone);
      let g = p.geo.clone();
      if (g.attributes.uv) g.deleteAttribute('uv');
      if (!g.attributes.normal) g.computeVertexNormals();
      if (outlineScale) {
        // infla ao longo das normais (casco invertido)
        const pos = g.attributes.position, nor = g.attributes.normal;
        for (let i = 0; i < pos.count; i++) {
          pos.setXYZ(i, pos.getX(i) + nor.getX(i) * outlineScale, pos.getY(i) + nor.getY(i) * outlineScale, pos.getZ(i) + nor.getZ(i) * outlineScale);
        }
        setColor(g, 0x000000);
      } else {
        setColor(g, p.color);
      }
      g.applyMatrix4(bone.matrixWorld);
      const n = g.attributes.position.count;
      const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { si[i * 4] = idx; sw[i * 4] = 1; }
      g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
      geos.push(g);
    }
    if (!geos.length) return null;
    return mergeGeoms(geos, ['position', 'normal', 'color', 'skinIndex', 'skinWeight']);
  }

  build(o = {}) {
    this.root.updateMatrixWorld(true);
    const geo = this._assemble(this.parts);
    let mat;
    if (o.toon) {
      mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: getToonGradient() });
    } else {
      mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: o.roughness ?? 0.8, metalness: o.metalness ?? 0.05 });
    }
    mat.emissive = new THREE.Color(0x000000);
    const mesh = new THREE.SkinnedMesh(geo, mat);
    mesh.add(this.root);
    mesh.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(this.bones);
    mesh.bind(skeleton);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const extra = [];
    if (this.glowParts.length) {
      const gg = this._assemble(this.glowParts);
      const gm = new THREE.SkinnedMesh(gg, new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2, 2, 2) }));
      gm.bind(skeleton, mesh.bindMatrix);
      gm.frustumCulled = false;
      extra.push(gm);
    }
    if (o.outline) {
      const og = this._assemble(this.parts, o.outline);
      if (og) {
        const om = new THREE.SkinnedMesh(og, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }));
        om.bind(skeleton, mesh.bindMatrix);
        om.frustumCulled = false;
        extra.push(om);
      }
    }
    for (const p of [...this.parts, ...this.glowParts]) p.geo.dispose();
    return { mesh, extra, bones: this.byName, skeleton, material: mat };
  }
}

// ======================= Humanoide =======================
// def: { skin, hair, hairStyle, beard, shirt, pants, boots, gloves, belt, robe, armor, hat, female, bulk, scale, eyes, skeleton, toon }
export function buildHumanoid(def = {}) {
  const R = new RigBuilder();
  const bulk = def.bulk ?? 1;
  const fem = !!def.female;
  const sw = (fem ? 0.17 : 0.2) * bulk;     // meia-largura dos ombros
  const legLen = def.legLen ?? 0.43;
  const hipY = 0.09 + legLen * 2 + 0.02;
  const headR = def.headR ?? 0.145;

  R.bone('root', null, 0, 0, 0);
  R.bone('hips', 'root', 0, hipY, 0);
  R.bone('spine', 'hips', 0, 0.12, 0);
  R.bone('chest', 'spine', 0, 0.24, 0);
  R.bone('neck', 'chest', 0, 0.2, 0);
  R.bone('head', 'neck', 0, 0.09, 0);
  R.bone('shoulderL', 'chest', sw, 0.15, 0, 'YXZ');
  R.bone('elbowL', 'shoulderL', 0, -0.28, 0);
  R.bone('handL', 'elbowL', 0, -0.25, 0);
  R.bone('shoulderR', 'chest', -sw, 0.15, 0, 'YXZ');
  R.bone('elbowR', 'shoulderR', 0, -0.28, 0);
  R.bone('handR', 'elbowR', 0, -0.25, 0);
  R.bone('thighL', 'hips', 0.1 * bulk, -0.02, 0);
  R.bone('kneeL', 'thighL', 0, -legLen, 0);
  R.bone('footL', 'kneeL', 0, -legLen, 0);
  R.bone('thighR', 'hips', -0.1 * bulk, -0.02, 0);
  R.bone('kneeR', 'thighR', 0, -legLen, 0);
  R.bone('footR', 'kneeR', 0, -legLen, 0);

  if (def.skeleton) return buildSkeletonParts(R, def);

  const skin = def.skin ?? 0xe0b090;
  const shirt = def.shirt ?? 0x6a4a3a;
  const pants = def.pants ?? 0x4a3a2a;
  const boots = def.boots ?? 0x3a2a1a;
  const gloves = def.gloves ?? skin;
  const sleeves = def.sleeves ?? shirt;
  const seg = 7;

  // Quadril e tronco
  R.part('hips', new THREE.BoxGeometry(0.32 * bulk * (fem ? 1.08 : 1), 0.2, 0.2), pants, { y: 0.03 });
  R.part('spine', new THREE.BoxGeometry(0.3 * bulk, 0.26, 0.19 * bulk), shirt, { y: 0.12 });
  const chest = new THREE.CylinderGeometry(0.29 * bulk * (fem ? 0.9 : 1), 0.23 * bulk, 0.3, 4, 1);
  chest.rotateY(Math.PI / 4);
  R.part('chest', chest, shirt, { y: 0.1, sz: 0.58 });
  if (def.belt !== false) R.part('hips', new THREE.BoxGeometry(0.34 * bulk, 0.06, 0.22), def.belt ?? 0x2a1a10, { y: 0.12 });
  if (def.belt !== false && def.buckle !== false) R.part('hips', new THREE.BoxGeometry(0.07, 0.06, 0.03), 0xc8a040, { y: 0.12, z: 0.11 });
  if (def.tabard) R.part('chest', new THREE.BoxGeometry(0.3 * bulk, 0.62, 0.02), def.tabard, { y: -0.12, z: 0.125 });
  if (def.apron) R.part('spine', new THREE.BoxGeometry(0.3, 0.7, 0.02), def.apron, { y: -0.06, z: 0.11 });

  // Pescoço e cabeça
  R.part('neck', new THREE.CylinderGeometry(0.055, 0.065, 0.14, 6), skin, { y: 0.04 });
  const headG = new THREE.SphereGeometry(headR, 9, 7);
  R.part('head', headG, skin, { y: headR * 0.85, sx: 0.92, sy: 1.04 });
  // nariz e olhos
  R.part('head', new THREE.BoxGeometry(0.04, 0.05, 0.05), skin, { y: headR * 0.75, z: headR * 0.9 });
  const eyeC = def.eyes ?? 0x1a1410;
  const eyeGlow = !!def.eyeGlow;
  for (const sx of [-1, 1]) {
    R.part('head', new THREE.BoxGeometry(0.035, 0.03, 0.02), eyeC, { x: sx * 0.05, y: headR * 0.95, z: headR * 0.86, glow: eyeGlow });
    if (!eyeGlow) R.part('head', new THREE.BoxGeometry(0.06, 0.015, 0.02), def.hair ?? 0x3a2a1a, { x: sx * 0.052, y: headR * 1.15, z: headR * 0.84 });
  }
  // orelhas
  for (const sx of [-1, 1]) R.part('head', new THREE.BoxGeometry(0.03, 0.06, 0.04), skin, { x: sx * headR * 0.92, y: headR * 0.85 });
  // Cabelo
  const hair = def.hair ?? 0x3a2a1a;
  const hs = def.hairStyle ?? (fem ? 'long' : 'short');
  if (hs !== 'bald' && hs !== 'none') {
    const cap = new THREE.SphereGeometry(headR * 1.08, 9, 5, 0, Math.PI * 2, 0, Math.PI * 0.55);
    R.part('head', cap, hair, { y: headR * 0.9, rx: -0.25, sx: 0.95 });
    if (hs === 'long') R.part('head', new THREE.BoxGeometry(headR * 1.9, 0.34, 0.08), hair, { y: headR * 0.2, z: -headR * 0.85 });
    if (hs === 'ponytail') R.part('head', new THREE.CylinderGeometry(0.035, 0.05, 0.3, 5), hair, { y: headR * 0.6, z: -headR * 1.1, rx: 0.4 });
    if (hs === 'bun') R.part('head', new THREE.SphereGeometry(0.07, 6, 5), hair, { y: headR * 1.7, z: -headR * 0.5 });
    if (hs === 'wild') R.part('head', new THREE.IcosahedronGeometry(headR * 1.2, 0), hair, { y: headR * 1.1, z: -0.02, jitter: 0.03, seed: 5 });
  }
  if (def.beard) {
    R.part('head', new THREE.BoxGeometry(headR * 1.5, 0.12, 0.08), def.beard === true ? hair : def.beard, { y: headR * 0.25, z: headR * 0.68 });
    if (def.longBeard) R.part('head', new THREE.ConeGeometry(0.08, 0.3, 5), def.beard === true ? hair : def.beard, { y: -0.04, z: headR * 0.7, rx: Math.PI });
  }

  // Braços
  for (const s of ['L', 'R']) {
    R.part('shoulder' + s, new THREE.CapsuleGeometry(0.062 * bulk, 0.18, 2, seg), sleeves, { y: -0.13 });
    R.part('elbow' + s, new THREE.CapsuleGeometry(0.052 * bulk, 0.17, 2, seg), def.bareArms ? skin : sleeves, { y: -0.12 });
    R.part('hand' + s, new THREE.BoxGeometry(0.08, 0.1, 0.065), gloves, { y: -0.04 });
    if (def.bracers) R.part('elbow' + s, new THREE.CylinderGeometry(0.065, 0.06, 0.12, 6), def.bracers, { y: -0.17 });
  }
  // Pernas
  for (const s of ['L', 'R']) {
    R.part('thigh' + s, new THREE.CapsuleGeometry(0.08 * bulk, 0.27, 2, seg), pants, { y: -0.2 });
    R.part('knee' + s, new THREE.CapsuleGeometry(0.066 * bulk, 0.26, 2, seg), pants, { y: -0.19 });
    R.part('knee' + s, new THREE.CylinderGeometry(0.078 * bulk, 0.07, 0.24, seg), boots, { y: -0.3 });
    R.part('foot' + s, new THREE.BoxGeometry(0.11, 0.09, 0.24), boots, { y: -0.035, z: 0.05 });
  }
  // Robe / vestido
  if (def.robe) {
    const len = def.robeLen ?? 0.85;
    R.part('hips', new THREE.CylinderGeometry(0.19 * bulk, 0.34 * bulk, len, 8, 1, true), def.robe, { y: -len / 2 + 0.1 });
    R.part('spine', new THREE.BoxGeometry(0.31 * bulk, 0.27, 0.2 * bulk), def.robe, { y: 0.12 });
  }
  // Armadura
  if (def.armor) {
    const a = def.armor;
    const plate = new THREE.CylinderGeometry(0.31 * bulk, 0.25 * bulk, 0.32, 4, 1);
    plate.rotateY(Math.PI / 4);
    R.part('chest', plate, a, { y: 0.1, sz: 0.62 });
    for (const s of ['L', 'R']) {
      R.part('shoulder' + s, new THREE.SphereGeometry(0.1 * bulk, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), a, { y: 0.0, sy: 0.9 });
      R.part('knee' + s, new THREE.BoxGeometry(0.1, 0.1, 0.05), a, { y: -0.02, z: 0.06 });
    }
  }
  // Capa curta nas costas (a capa principal é separada e dinâmica)
  if (def.mantle) R.part('chest', new THREE.BoxGeometry(0.46 * bulk, 0.12, 0.26), def.mantle, { y: 0.24 });

  // Chapéus
  addHat(R, def, headR);

  // Extras específicos
  if (def.extra) def.extra(R, headR);

  const built = R.build({ toon: def.toon, outline: def.outline, roughness: def.roughness, metalness: def.metalness });
  built.headR = headR;
  built.height = hipY + 0.6 + headR * 2;
  return built;
}

function addHat(R, def, headR) {
  const hat = def.hat;
  const hc = def.hatColor ?? 0x3a2a5a;
  const y0 = headR * 1.5;
  switch (hat) {
    case 'wizard':
      R.part('head', new THREE.CylinderGeometry(headR * 2.0, headR * 2.0, 0.03, 10), hc, { y: y0 });
      R.part('head', new THREE.ConeGeometry(headR * 1.05, 0.5, 8), hc, { y: y0 + 0.26, rx: -0.15 });
      break;
    case 'straw':
      R.part('head', new THREE.CylinderGeometry(headR * 2.3, headR * 2.3, 0.03, 10), hc, { y: y0 });
      R.part('head', new THREE.CylinderGeometry(headR * 0.9, headR * 1.05, 0.14, 8), hc, { y: y0 + 0.07 });
      break;
    case 'helmet':
      R.part('head', new THREE.SphereGeometry(headR * 1.15, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), hc, { y: headR * 0.95 });
      R.part('head', new THREE.BoxGeometry(0.025, 0.12, 0.03), hc, { y: headR * 0.95, z: headR * 1.08 });
      R.part('head', new THREE.CylinderGeometry(headR * 1.2, headR * 1.2, 0.03, 9), hc, { y: headR * 0.95 });
      if (def.plume) R.part('head', new THREE.BoxGeometry(0.03, 0.12, 0.28), def.plume, { y: headR * 2.15, z: -0.04 });
      break;
    case 'crown':
      R.part('head', new THREE.CylinderGeometry(headR * 0.95, headR * 0.95, 0.06, 10, 1, true), 0xd8b040, { y: y0 - 0.02 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        R.part('head', new THREE.ConeGeometry(0.025, 0.08, 4), 0xd8b040, { x: Math.sin(a) * headR * 0.93, y: y0 + 0.05, z: Math.cos(a) * headR * 0.93 });
      }
      break;
    case 'hood':
      R.part('head', new THREE.SphereGeometry(headR * 1.25, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.62), hc, { y: headR * 0.85, rx: -0.35 });
      R.part('head', new THREE.ConeGeometry(headR * 0.9, 0.25, 6), hc, { y: headR * 1.2, z: -headR * 0.9, rx: -2.0 });
      break;
    case 'antlers':
      for (const sx of [-1, 1]) {
        R.part('head', new THREE.CylinderGeometry(0.015, 0.025, 0.32, 4), 0xc8b090, { x: sx * 0.09, y: y0 + 0.08, rz: -sx * 0.5 });
        R.part('head', new THREE.CylinderGeometry(0.012, 0.018, 0.16, 4), 0xc8b090, { x: sx * 0.18, y: y0 + 0.2, rz: sx * 0.3 });
      }
      R.part('head', new THREE.TorusGeometry(headR * 0.95, 0.02, 4, 10), 0x4a8a3a, { y: y0 - 0.04, rx: Math.PI / 2 });
      break;
    case 'jester':
      for (let i = -1; i <= 1; i++) {
        R.part('head', new THREE.ConeGeometry(0.06, 0.32, 6), i === 0 ? 0x2a6ad8 : 0xd83a3a, { x: i * 0.11, y: y0 + 0.12, rz: -i * 0.9, z: -0.02 });
        R.part('head', new THREE.SphereGeometry(0.035, 6, 4), 0xf0d040, { x: i * 0.25, y: y0 + 0.18 - Math.abs(i) * 0.12, z: -0.02 });
      }
      break;
    case 'cap':
      R.part('head', new THREE.SphereGeometry(headR * 1.1, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.45), hc, { y: headR * 1.0 });
      R.part('head', new THREE.BoxGeometry(0.03, 0.03, 0.18), def.feather ?? 0xd83a3a, { x: 0.1, y: headR * 1.6, z: -0.05, rx: 0.5 });
      break;
    case 'bandana':
      R.part('head', new THREE.SphereGeometry(headR * 1.1, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.5), hc, { y: headR * 0.95 });
      R.part('head', new THREE.BoxGeometry(headR * 1.8, 0.07, 0.06), hc, { y: headR * 0.55, z: headR * 0.88 });
      break;
    default: break;
  }
  if (def.mask) R.part('head', new THREE.BoxGeometry(headR * 1.7, 0.09, 0.05), def.mask, { y: headR * 0.6, z: headR * 0.84 });
  if (def.beak) R.part('head', new THREE.ConeGeometry(0.05, 0.2, 4), def.beak, { y: headR * 0.8, z: headR * 1.0, rx: Math.PI / 2 });
}

function buildSkeletonParts(R, def) {
  const bone = def.boneColor ?? 0xe8e0c8;
  const dark = 0x3a3428;
  const headR = 0.13;
  R.part('hips', new THREE.BoxGeometry(0.26, 0.1, 0.14), bone, { y: 0.03 });
  R.part('spine', new THREE.CylinderGeometry(0.03, 0.03, 0.26, 5), bone, { y: 0.12 });
  for (let i = 0; i < 4; i++) {
    const w = 0.3 - Math.abs(i - 1.2) * 0.04;
    R.part('chest', new THREE.TorusGeometry(w / 2, 0.018, 4, 8, Math.PI * 1.6), bone, { y: 0.02 + i * 0.075, rx: Math.PI / 2, rz: Math.PI * 1.3, sy: 0.6 });
  }
  R.part('chest', new THREE.BoxGeometry(0.36, 0.04, 0.06), bone, { y: 0.28 });
  R.part('neck', new THREE.CylinderGeometry(0.025, 0.025, 0.12, 5), bone, { y: 0.04 });
  R.part('head', new THREE.SphereGeometry(headR, 8, 6), bone, { y: headR * 0.95, sx: 0.9, sy: 1.0 });
  R.part('head', new THREE.BoxGeometry(0.15, 0.06, 0.12), bone, { y: 0.02, z: 0.05 });
  for (const sx of [-1, 1]) R.part('head', new THREE.SphereGeometry(0.03, 5, 4), def.eyes ?? 0x40e0ff, { x: sx * 0.045, y: headR * 0.95, z: headR * 0.82, glow: true });
  R.part('head', new THREE.BoxGeometry(0.03, 0.04, 0.02), dark, { y: headR * 0.65, z: headR * 0.9 });
  for (const s of ['L', 'R']) {
    R.part('shoulder' + s, new THREE.CylinderGeometry(0.022, 0.022, 0.26, 5), bone, { y: -0.13 });
    R.part('elbow' + s, new THREE.CylinderGeometry(0.02, 0.018, 0.24, 5), bone, { y: -0.12 });
    R.part('hand' + s, new THREE.BoxGeometry(0.06, 0.09, 0.04), bone, { y: -0.04 });
    R.part('thigh' + s, new THREE.CylinderGeometry(0.028, 0.024, 0.42, 5), bone, { y: -0.21 });
    R.part('knee' + s, new THREE.CylinderGeometry(0.024, 0.02, 0.42, 5), bone, { y: -0.21 });
    R.part('foot' + s, new THREE.BoxGeometry(0.08, 0.05, 0.18), bone, { y: -0.03, z: 0.04 });
  }
  if (def.armor) {
    const plate = new THREE.CylinderGeometry(0.29, 0.24, 0.32, 4, 1);
    plate.rotateY(Math.PI / 4);
    R.part('chest', plate, def.armor, { y: 0.12, sz: 0.62 });
    for (const s of ['L', 'R']) R.part('shoulder' + s, new THREE.SphereGeometry(0.1, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), def.armor, { sy: 0.9 });
  }
  addHat(R, def, headR);
  const built = R.build({ metalness: 0.1 });
  built.headR = headR;
  built.height = 1.8;
  return built;
}

// ======================= Quadrúpede (lobo) =======================
export function buildQuadruped(def = {}) {
  const R = new RigBuilder();
  const s = def.scale ?? 1;
  const fur = def.fur ?? 0x6a6460;
  const dark = def.dark ?? 0x3a3634;
  const belly = def.belly ?? 0xb8b0a4;
  const legH = 0.32 * s;
  R.bone('root', null, 0, 0, 0);
  R.bone('body', 'root', 0, legH * 2 + 0.06 * s, 0);
  R.bone('chest', 'body', 0, 0.02 * s, 0.32 * s);
  R.bone('neck', 'chest', 0, 0.08 * s, 0.18 * s);
  R.bone('head', 'neck', 0, 0.06 * s, 0.12 * s);
  R.bone('jaw', 'head', 0, -0.04 * s, 0.08 * s);
  R.bone('pelvis', 'body', 0, 0, -0.3 * s);
  R.bone('tail1', 'pelvis', 0, 0.05 * s, -0.16 * s);
  R.bone('tail2', 'tail1', 0, 0, -0.22 * s);
  const legs = [['FL', 'chest', 0.13, 0.05], ['FR', 'chest', -0.13, 0.05], ['BL', 'pelvis', 0.13, -0.02], ['BR', 'pelvis', -0.13, -0.02]];
  for (const [n, p, x, z] of legs) {
    R.bone('leg' + n, p, x * s, -0.04 * s, z * s);
    R.bone('low' + n, 'leg' + n, 0, -legH, 0);
    R.bone('paw' + n, 'low' + n, 0, -legH, 0);
  }
  R.part('body', new THREE.BoxGeometry(0.3 * s, 0.28 * s, 0.5 * s), fur, { jitter: 0.02 * s, seed: 3 });
  R.part('chest', new THREE.BoxGeometry(0.34 * s, 0.34 * s, 0.32 * s), fur, { jitter: 0.02 * s, seed: 4 });
  R.part('chest', new THREE.BoxGeometry(0.26 * s, 0.12 * s, 0.3 * s), belly, { y: -0.14 * s });
  R.part('pelvis', new THREE.BoxGeometry(0.28 * s, 0.26 * s, 0.26 * s), fur, { jitter: 0.02 * s, seed: 5 });
  R.part('neck', new THREE.BoxGeometry(0.2 * s, 0.2 * s, 0.24 * s), fur, { rx: -0.5 });
  R.part('head', new THREE.BoxGeometry(0.22 * s, 0.2 * s, 0.22 * s), fur);
  R.part('head', new THREE.BoxGeometry(0.12 * s, 0.1 * s, 0.2 * s), dark, { y: -0.02 * s, z: 0.18 * s });
  R.part('head', new THREE.BoxGeometry(0.06 * s, 0.05 * s, 0.04 * s), 0x111111, { y: 0.02 * s, z: 0.29 * s });
  R.part('jaw', new THREE.BoxGeometry(0.1 * s, 0.04 * s, 0.18 * s), dark, { z: 0.08 * s });
  for (const sx of [-1, 1]) {
    R.part('head', new THREE.ConeGeometry(0.05 * s, 0.13 * s, 4), dark, { x: sx * 0.07 * s, y: 0.14 * s, z: -0.03 * s });
    R.part('head', new THREE.BoxGeometry(0.04 * s, 0.03 * s, 0.02 * s), def.eyes ?? 0xffd040, { x: sx * 0.065 * s, y: 0.04 * s, z: 0.111 * s, glow: !!def.eyeGlow });
  }
  R.part('tail1', new THREE.ConeGeometry(0.07 * s, 0.26 * s, 5), fur, { z: -0.1 * s, rx: -Math.PI / 2 });
  R.part('tail2', new THREE.ConeGeometry(0.06 * s, 0.3 * s, 5), def.tailTip ?? dark, { z: -0.12 * s, rx: -Math.PI / 2 });
  for (const [n] of legs) {
    R.part('leg' + n, new THREE.BoxGeometry(0.1 * s, legH, 0.11 * s), fur, { y: -legH / 2 });
    R.part('low' + n, new THREE.BoxGeometry(0.075 * s, legH, 0.08 * s), dark, { y: -legH / 2 });
    R.part('paw' + n, new THREE.BoxGeometry(0.09 * s, 0.05 * s, 0.12 * s), dark, { y: 0.0, z: 0.02 * s });
  }
  if (def.extra) def.extra(R, s);
  const built = R.build({ roughness: 0.95 });
  built.height = legH * 2 + 0.45 * s;
  return built;
}

// ======================= Eco Sombrio (espectro flutuante) =======================
export function buildWisp(def = {}) {
  const R = new RigBuilder();
  const s = def.scale ?? 1;
  const c = def.color ?? 0x1a1024;
  const c2 = def.color2 ?? 0x3a1a5a;
  R.bone('root', null, 0, 0, 0);
  R.bone('body', 'root', 0, 1.2 * s, 0);
  R.bone('head', 'body', 0, 0.35 * s, 0.05 * s);
  R.bone('tail1', 'body', 0, -0.3 * s, -0.05 * s);
  R.bone('tail2', 'tail1', 0, -0.35 * s, -0.08 * s);
  R.bone('shoulderL', 'body', 0.28 * s, 0.2 * s, 0, 'YXZ');
  R.bone('elbowL', 'shoulderL', 0, -0.3 * s, 0);
  R.bone('shoulderR', 'body', -0.28 * s, 0.2 * s, 0, 'YXZ');
  R.bone('elbowR', 'shoulderR', 0, -0.3 * s, 0);
  R.part('body', new THREE.IcosahedronGeometry(0.32 * s, 1), c, { sy: 1.3, jitter: 0.04 * s, seed: 7 });
  R.part('head', new THREE.IcosahedronGeometry(0.22 * s, 1), c, { jitter: 0.03 * s, seed: 8 });
  R.part('head', new THREE.ConeGeometry(0.2 * s, 0.4 * s, 6), c2, { y: 0.15 * s, z: -0.1 * s, rx: -0.8 });
  for (const sx of [-1, 1]) R.part('head', new THREE.SphereGeometry(0.045 * s, 5, 4), def.eyes ?? 0xc070ff, { x: sx * 0.08 * s, y: 0.02 * s, z: 0.18 * s, glow: true });
  R.part('tail1', new THREE.ConeGeometry(0.24 * s, 0.5 * s, 6), c, { y: -0.15 * s, rx: Math.PI });
  R.part('tail2', new THREE.ConeGeometry(0.14 * s, 0.5 * s, 5), c2, { y: -0.2 * s, rx: Math.PI });
  for (const sd of ['L', 'R']) {
    R.part('shoulder' + sd, new THREE.ConeGeometry(0.07 * s, 0.35 * s, 5), c, { y: -0.15 * s, rx: Math.PI });
    R.part('elbow' + sd, new THREE.ConeGeometry(0.05 * s, 0.4 * s, 4), c2, { y: -0.2 * s, rx: Math.PI });
    for (let k = -1; k <= 1; k++) R.part('elbow' + sd, new THREE.ConeGeometry(0.015 * s, 0.18 * s, 3), 0xd0a0ff, { x: k * 0.03 * s, y: -0.42 * s, rx: Math.PI, glow: true });
  }
  const built = R.build({ roughness: 0.6 });
  built.mesh.material.transparent = true;
  built.mesh.material.opacity = 0.92;
  built.height = 1.7 * s;
  return built;
}

// ======================= Rabisco (criatura cartunesca) =======================
export function buildDoodle(def = {}) {
  const R = new RigBuilder();
  const s = def.scale ?? 1;
  const body = def.body ?? 0xffffff;
  const accent = def.accent ?? 0x2a2a2a;
  R.bone('root', null, 0, 0, 0);
  R.bone('hips', 'root', 0, 0.55 * s, 0);
  R.bone('spine', 'hips', 0, 0.05 * s, 0);
  R.bone('chest', 'spine', 0, 0.3 * s, 0);
  R.bone('neck', 'chest', 0, 0.2 * s, 0);
  R.bone('head', 'neck', 0, 0.05 * s, 0);
  R.bone('shoulderL', 'chest', 0.28 * s, 0.05 * s, 0, 'YXZ');
  R.bone('elbowL', 'shoulderL', 0, -0.25 * s, 0);
  R.bone('handL', 'elbowL', 0, -0.25 * s, 0);
  R.bone('shoulderR', 'chest', -0.28 * s, 0.05 * s, 0, 'YXZ');
  R.bone('elbowR', 'shoulderR', 0, -0.25 * s, 0);
  R.bone('handR', 'elbowR', 0, -0.25 * s, 0);
  R.bone('thighL', 'hips', 0.12 * s, 0, 0);
  R.bone('kneeL', 'thighL', 0, -0.26 * s, 0);
  R.bone('footL', 'kneeL', 0, -0.26 * s, 0);
  R.bone('thighR', 'hips', -0.12 * s, 0, 0);
  R.bone('kneeR', 'thighR', 0, -0.26 * s, 0);
  R.bone('footR', 'kneeR', 0, -0.26 * s, 0);
  R.part('chest', new THREE.SphereGeometry(0.34 * s, 12, 10), body, { y: -0.08 * s, sy: 1.15 });
  R.part('head', new THREE.SphereGeometry(0.3 * s, 12, 10), body, { y: 0.22 * s });
  // olhos grandes
  for (const sx of [-1, 1]) {
    R.part('head', new THREE.SphereGeometry(0.1 * s, 10, 8), 0xffffff, { x: sx * 0.11 * s, y: 0.28 * s, z: 0.22 * s, sz: 0.6 });
    R.part('head', new THREE.SphereGeometry(0.05 * s, 8, 6), 0x111111, { x: sx * 0.1 * s, y: 0.27 * s, z: 0.29 * s, sz: 0.5, outline: false });
  }
  // sorriso
  R.part('head', new THREE.TorusGeometry(0.1 * s, 0.018 * s, 4, 10, Math.PI), 0x111111, { y: 0.15 * s, z: 0.27 * s, rz: Math.PI, outline: false });
  if (def.hat) R.part('head', new THREE.ConeGeometry(0.16 * s, 0.35 * s, 8), def.hat, { y: 0.6 * s, rz: 0.3 });
  if (def.paint) R.part('chest', new THREE.SphereGeometry(0.12 * s, 8, 6), def.paint, { y: 0.0, z: 0.3 * s, sz: 0.4, outline: false });
  for (const sd of ['L', 'R']) {
    R.part('shoulder' + sd, new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.26 * s, 6), accent, { y: -0.12 * s });
    R.part('elbow' + sd, new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.26 * s, 6), accent, { y: -0.12 * s });
    R.part('hand' + sd, new THREE.SphereGeometry(0.09 * s, 8, 6), 0xffffff, { y: -0.06 * s });
    R.part('thigh' + sd, new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.26 * s, 6), accent, { y: -0.13 * s });
    R.part('knee' + sd, new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.26 * s, 6), accent, { y: -0.13 * s });
    R.part('foot' + sd, new THREE.SphereGeometry(0.1 * s, 8, 6), def.shoes ?? 0xd83a3a, { y: -0.02 * s, z: 0.05 * s, sz: 1.5, sy: 0.6 });
  }
  if (def.extra) def.extra(R, s);
  const built = R.build({ toon: true, outline: 0.022 * s });
  built.height = 1.45 * s;
  return built;
}

// ======================= Golem de pedra =======================
export function buildGolem(def = {}) {
  const R = new RigBuilder();
  const s = def.scale ?? 1;
  const rock = def.rock ?? 0x7a756c;
  const rock2 = def.rock2 ?? 0x5a564e;
  const glow = def.glow ?? 0xff8a30;
  R.bone('root', null, 0, 0, 0);
  R.bone('hips', 'root', 0, 1.0 * s, 0);
  R.bone('spine', 'hips', 0, 0.2 * s, 0);
  R.bone('chest', 'spine', 0, 0.45 * s, 0);
  R.bone('neck', 'chest', 0, 0.4 * s, 0.1 * s);
  R.bone('head', 'neck', 0, 0.05 * s, 0.05 * s);
  R.bone('shoulderL', 'chest', 0.62 * s, 0.25 * s, 0, 'YXZ');
  R.bone('elbowL', 'shoulderL', 0, -0.55 * s, 0);
  R.bone('handL', 'elbowL', 0, -0.55 * s, 0);
  R.bone('shoulderR', 'chest', -0.62 * s, 0.25 * s, 0, 'YXZ');
  R.bone('elbowR', 'shoulderR', 0, -0.55 * s, 0);
  R.bone('handR', 'elbowR', 0, -0.55 * s, 0);
  R.bone('thighL', 'hips', 0.3 * s, -0.05 * s, 0);
  R.bone('kneeL', 'thighL', 0, -0.48 * s, 0);
  R.bone('footL', 'kneeL', 0, -0.45 * s, 0);
  R.bone('thighR', 'hips', -0.3 * s, -0.05 * s, 0);
  R.bone('kneeR', 'thighR', 0, -0.48 * s, 0);
  R.bone('footR', 'kneeR', 0, -0.45 * s, 0);
  let seed = 11;
  const J = (g) => ({ jitter: 0.06 * s, seed: seed++ });
  R.part('hips', new THREE.BoxGeometry(0.8 * s, 0.4 * s, 0.55 * s), rock2, J());
  R.part('spine', new THREE.BoxGeometry(0.85 * s, 0.5 * s, 0.6 * s), rock, { y: 0.2 * s, ...J() });
  R.part('chest', new THREE.DodecahedronGeometry(0.62 * s, 0), rock, { y: 0.2 * s, sx: 1.35, sz: 0.9, ...J() });
  R.part('chest', new THREE.OctahedronGeometry(0.2 * s, 0), glow, { y: 0.25 * s, z: 0.5 * s, glow: true });
  R.part('head', new THREE.BoxGeometry(0.42 * s, 0.36 * s, 0.4 * s), rock2, { y: 0.15 * s, ...J() });
  for (const sx of [-1, 1]) R.part('head', new THREE.BoxGeometry(0.08 * s, 0.05 * s, 0.03 * s), glow, { x: sx * 0.1 * s, y: 0.17 * s, z: 0.2 * s, glow: true });
  for (const sd of ['L', 'R']) {
    R.part('shoulder' + sd, new THREE.DodecahedronGeometry(0.3 * s, 0), rock2, { y: 0.0, ...J() });
    R.part('shoulder' + sd, new THREE.BoxGeometry(0.32 * s, 0.5 * s, 0.32 * s), rock, { y: -0.3 * s, ...J() });
    R.part('elbow' + sd, new THREE.BoxGeometry(0.34 * s, 0.5 * s, 0.34 * s), rock, { y: -0.25 * s, ...J() });
    R.part('hand' + sd, new THREE.DodecahedronGeometry(0.28 * s, 0), rock2, { y: -0.12 * s, ...J() });
    R.part('thigh' + sd, new THREE.BoxGeometry(0.38 * s, 0.5 * s, 0.38 * s), rock, { y: -0.24 * s, ...J() });
    R.part('knee' + sd, new THREE.BoxGeometry(0.34 * s, 0.46 * s, 0.34 * s), rock2, { y: -0.23 * s, ...J() });
    R.part('foot' + sd, new THREE.BoxGeometry(0.42 * s, 0.16 * s, 0.55 * s), rock2, { y: -0.04 * s, z: 0.08 * s, ...J() });
  }
  if (def.moss) {
    R.part('chest', new THREE.BoxGeometry(0.9 * s, 0.12 * s, 0.5 * s), 0x4a7a2a, { y: 0.65 * s, ...J() });
    for (const sd of ['L', 'R']) R.part('shoulder' + sd, new THREE.BoxGeometry(0.4 * s, 0.1 * s, 0.4 * s), 0x4a7a2a, { y: 0.22 * s, ...J() });
  }
  const built = R.build({ roughness: 0.95 });
  built.height = 2.9 * s;
  return built;
}

// ======================= Armas e acessórios (não-skinned, presos a ossos) =======================
const weaponMats = {};
function wmat(color, metal = 0.7, rough = 0.35, emissive = 0x000000) {
  const k = color + '_' + metal + '_' + emissive;
  if (!weaponMats[k]) weaponMats[k] = new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough, flatShading: true, emissive, emissiveIntensity: emissive ? 1.2 : 0 });
  return weaponMats[k];
}

export function makeSword(o = {}) {
  const g = new THREE.Group();
  const len = o.length ?? 0.95;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, len), wmat(o.blade ?? 0xc8ccd4, 0.6, 0.35, o.glow ?? 0x000000));
  blade.position.z = len / 2 + 0.1;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.14, 4), blade.material);
  tip.rotation.x = Math.PI / 2; tip.rotation.y = Math.PI / 4; tip.scale.set(1, 1, 0.3);
  tip.position.z = len + 0.17;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.05), wmat(o.guard ?? 0x8a6a2a, 0.6, 0.4));
  guard.position.z = 0.1;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.18, 6), wmat(0x3a2414, 0, 0.9));
  grip.rotation.x = Math.PI / 2;
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), guard.material);
  pommel.position.z = -0.1;
  g.add(blade, tip, guard, grip, pommel);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  g.userData.tipLocal = new THREE.Vector3(0, 0, len + 0.2);
  return g;
}

export function makeShield(o = {}) {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 10), wmat(o.color ?? 0x7a2a22, 0.1, 0.8));
  face.rotation.z = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 4, 10), wmat(0x8a8a90, 0.7, 0.4));
  rim.rotation.y = Math.PI / 2;
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), wmat(o.boss ?? 0xd8b040, 0.7, 0.35));
  boss.rotation.z = -Math.PI / 2;
  boss.position.x = 0.03;
  g.add(face, rim, boss);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

export function makeStaff(o = {}) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.7, 6), wmat(o.wood ?? 0x5a3a22, 0, 0.9));
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = 0.35;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), wmat(o.gem ?? 0x9a5aff, 0.2, 0.2, o.gem ?? 0x9a5aff));
  gem.position.z = 1.25;
  g.add(shaft, gem);
  g.userData.tipLocal = new THREE.Vector3(0, 0, 1.25);
  return g;
}

export function makeDagger(o = {}) {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.32), wmat(o.blade ?? 0xb8bcc4, 0.6, 0.35));
  blade.position.z = 0.22;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), wmat(0x3a3a3a, 0.5, 0.5));
  guard.position.z = 0.06;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 5), wmat(0x2a1a10, 0, 0.9));
  grip.rotation.x = Math.PI / 2;
  g.add(blade, guard, grip);
  return g;
}

export function makeClub() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.035, 0.8, 6), wmat(0x5a3a22, 0, 0.9));
  m.rotation.x = Math.PI / 2;
  m.position.z = 0.35;
  g.add(m);
  return g;
}

export function makeSpear() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.0, 6), wmat(0x6a4a2a, 0, 0.9));
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = 0.5;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 4), wmat(0xb8bcc4, 0.6, 0.35));
  tip.rotation.x = Math.PI / 2;
  tip.position.z = 1.6;
  g.add(shaft, tip);
  return g;
}

export function makeBow() {
  const g = new THREE.Group();
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.018, 4, 12, Math.PI * 0.9), wmat(0x6a4a2a, 0, 0.9));
  arc.rotation.y = Math.PI / 2;
  arc.rotation.x = Math.PI / 2 + Math.PI * 0.05;
  g.add(arc);
  return g;
}

// Capa dinâmica (malha simples presa ao peito)
export function makeCape(color = 0x7a1a1a, w = 0.5, h = 1.0) {
  const geo = new THREE.PlaneGeometry(w, h, 4, 6);
  geo.translate(0, -h / 2, 0);
  {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const t = -y / h;
      const nx = x / (w / 2);
      p.setX(i, x * (0.72 + 0.5 * t));
      p.setZ(i, nx * nx * (0.07 + 0.08 * t));
    }
    geo.computeVertexNormals();
  }
  const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, flatShading: true, roughness: 0.9 });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  // guarda posições originais para animação de ondulação
  m.userData.base = Float32Array.from(geo.attributes.position.array);
  return m;
}
