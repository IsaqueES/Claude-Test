// Construtores procedurais de estruturas medievais.
// Cada função usa um Brush já posicionado (push) e desenha em coordenadas locais (y=0 é o chão).
import { RNG } from '../core/math.js';

export const PAL = {
  stone: 0x8a857c, stoneDark: 0x6a665f, stoneLight: 0xa8a296, cobble: 0x7c776e,
  plaster: 0xe6dcc4, plasterWarm: 0xe8d4b0, beam: 0x4a3222, wood: 0x6e4b2e, woodLight: 0x8e6a44, woodDark: 0x3e2a1a,
  thatch: 0xb8964e, thatchDark: 0x96773a, tile: 0x9c4a32, tileDark: 0x7a3826, slate: 0x4c5560,
  door: 0x4a2e1a, iron: 0x3a3a40, gold: 0xd4a840, red: 0x9a2a24, blue: 0x2a4a8a, green: 0x3a6a2a,
  cloth: 0xc8b890, glass: 0x1a2a3a, sand: 0xcab28a, sandDark: 0xa89068, marble: 0xd8d0c0,
  hay: 0xd4b860, leaf: 0x4a7a2a, rift: 0x3a1a4a, riftGlow: 0xb060ff,
};

// ---------------- Casas ----------------
export function house(b, opt = {}) {
  const rng = new RNG(opt.seed || 1);
  const w = opt.w || rng.float(6, 8.5), d = opt.d || rng.float(5, 7);
  const floors = opt.floors || (rng.chance(0.4) ? 2 : 1);
  const fh = 2.8;
  const wallH = floors * fh;
  const roofType = opt.roof || (rng.chance(0.55) ? 'thatch' : 'tile');
  const roofC = roofType === 'thatch' ? (rng.chance(0.5) ? PAL.thatch : PAL.thatchDark) : (rng.chance(0.5) ? PAL.tile : PAL.tileDark);
  const plaster = rng.chance(0.5) ? PAL.plaster : PAL.plasterWarm;

  // fundação de pedra
  b.box(w + 0.4, 0.7, d + 0.4, 0, -0.3, 0, PAL.stoneDark);
  // paredes
  b.box(w, wallH, d, 0, 0.4, 0, plaster, { collide: true, pad: 0.05 });
  // vigas enxaimel
  const beamC = PAL.beam;
  const t = 0.14;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(t * 1.6, wallH, t * 1.6, sx * w / 2, 0.4, sz * d / 2, beamC);
  for (let f = 0; f <= floors; f++) {
    const y = 0.4 + f * fh - (f === floors ? t : 0);
    b.box(w + 0.05, t, t, 0, y, d / 2 + 0.02, beamC);
    b.box(w + 0.05, t, t, 0, y, -d / 2 - 0.02, beamC);
    b.box(t, t, d + 0.05, w / 2 + 0.02, y, 0, beamC);
    b.box(t, t, d + 0.05, -w / 2 - 0.02, y, 0, beamC);
  }
  // vigas verticais/diagonais nas fachadas
  const nV = Math.max(2, Math.round(w / 2.2));
  for (let f = 0; f < floors; f++) {
    for (let i = 1; i < nV; i++) {
      const x = -w / 2 + (w / nV) * i;
      b.box(t, fh, t, x, 0.4 + f * fh, d / 2 + 0.03, beamC);
      b.box(t, fh, t, x, 0.4 + f * fh, -d / 2 - 0.03, beamC);
    }
    if (f > 0 || rng.chance(0.5)) {
      const diagL = Math.hypot(w / nV, fh);
      const ang = Math.atan2(fh, w / nV);
      b.box(t, diagL, t, -w / 2 + 0.05, 0.4 + f * fh, d / 2 + 0.04, beamC, { rz: -Math.PI / 2 + ang });
    }
  }
  // porta (frente = +z local)
  const doorX = opt.doorX ?? rng.float(-w / 4, w / 4);
  b.box(1.1, 2.0, 0.12, doorX, 0.4, d / 2 + 0.06, PAL.door);
  b.box(1.4, 0.18, 0.18, doorX, 2.4, d / 2 + 0.08, beamC);
  b.box(1.4, 0.15, 0.6, doorX, 0.25, d / 2 + 0.35, PAL.stone);
  // janelas (material de janela brilha à noite)
  for (let f = 0; f < floors; f++) {
    const y = 0.4 + f * fh + 1.1;
    const xs = f === 0 ? [doorX < 0 ? w / 4 + 0.3 : -w / 4 - 0.3] : [-w / 4, w / 4];
    for (const x of xs) {
      b.box(0.9, 0.9, 0.1, x, y, d / 2 + 0.06, 0x2a2016, { mat: 'window' });
      b.box(1.1, 0.12, 0.2, x, y - 0.1, d / 2 + 0.1, beamC);
      b.box(0.08, 0.9, 0.12, x, y, d / 2 + 0.1, beamC);
    }
    b.box(0.1, 0.9, 0.9, w / 2 + 0.06, y, 0, 0x2a2016, { mat: 'window' });
    b.box(0.1, 0.9, 0.9, -w / 2 - 0.06, y, rng.float(-0.5, 0.5), 0x2a2016, { mat: 'window' });
    b.box(0.9, 0.9, 0.1, rng.float(-w / 4, w / 4), y, -d / 2 - 0.06, 0x2a2016, { mat: 'window' });
  }
  // telhado de duas águas
  const roofH = Math.max(2.2, d * 0.55);
  const over = 0.55;
  b.prism(d + over * 2, roofH, w + over * 2, 0, 0.4 + wallH, 0, roofC, { ry: Math.PI / 2 });
  if (roofType === 'thatch') {
    b.prism(d + over * 2 + 0.2, 0.35, w + over * 2 + 0.1, 0, 0.3 + wallH, 0, PAL.thatchDark, { ry: Math.PI / 2 });
  }
  // empenas (triângulos de reboco)
  b.prism(d - 0.02, roofH - 0.1, 0.1, 0, 0.4 + wallH, 0, plaster, { ry: Math.PI / 2, sx: 1, sz: 1 });
  // chaminé
  if (opt.chimney !== false && rng.chance(0.8)) {
    const cx = rng.chance(0.5) ? w / 2 - 0.8 : -w / 2 + 0.8;
    b.box(0.8, wallH + roofH + 0.8, 0.8, cx, 0.4, -d / 4, PAL.stone);
    b.box(1.0, 0.2, 1.0, cx, 0.4 + wallH + roofH + 0.8, -d / 4, PAL.stoneDark);
    if (opt.onChimney) opt.onChimney(b.toWorld(cx, 1.4 + wallH + roofH, -d / 4));
  }
  // detalhes: barris/caixotes ao lado
  if (rng.chance(0.6)) barrel(b, w / 2 + 0.7, 0, d / 2 - 0.6);
  if (rng.chance(0.4)) crate(b, -w / 2 - 0.7, 0, d / 2 - 0.8, rng.float(0, 1));
  if (rng.chance(0.4)) { b.box(1.6, 0.5, 0.5, rng.float(-w / 3, w / 3), 0.4 + 1.6, d / 2 + 0.3, PAL.wood); b.box(1.5, 0.3, 0.4, rng.float(-w / 3, w / 3), 0.4 + 1.95, d / 2 + 0.3, 0xc04a6a); }
  return { w, d, wallH, roofH };
}

export function barrel(b, x, y, z) {
  b.cyl(0.42, 0.42, 1.0, x, y, z, PAL.wood, { seg: 10, collide: true });
  b.cyl(0.45, 0.45, 0.08, x, y + 0.15, z, PAL.iron, { seg: 10 });
  b.cyl(0.45, 0.45, 0.08, x, y + 0.8, z, PAL.iron, { seg: 10 });
}

export function crate(b, x, y, z, ry = 0, s = 0.9) {
  b.box(s, s, s, x, y, z, PAL.woodLight, { ry, collide: true });
  b.box(s + 0.04, 0.1, s + 0.04, x, y + s * 0.5 - 0.05, z, PAL.wood, { ry });
}

export function sack(b, x, y, z) {
  b.sphere(0.35, x, y + 0.3, z, PAL.cloth, { sy: 1.2 });
}

export function hayBale(b, x, y, z, ry = 0) {
  b.cyl(0.7, 0.7, 1.4, x, y + 0.7, z, PAL.hay, { rz: Math.PI / 2, ry, seg: 10 });
  b.colCircle(x, z, 0.8, -1, 1.5);
}

// ---------------- Taverna ----------------
export function tavern(b, opt = {}) {
  const w = 11, d = 8;
  b.box(w + 0.5, 0.7, d + 0.5, 0, -0.3, 0, PAL.stoneDark);
  b.box(w, 3.0, d, 0, 0.4, 0, PAL.stone, { collide: true });
  b.box(w + 0.6, 2.8, d + 0.6, 0, 3.4, 0, PAL.plasterWarm);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.25, 2.8, 0.25, sx * (w / 2 + 0.3), 3.4, sz * (d / 2 + 0.3), PAL.beam);
  b.box(w + 0.7, 0.25, d + 0.7, 0, 3.3, 0, PAL.beam);
  for (let i = -2; i <= 2; i++) {
    b.box(0.18, 2.8, 0.18, i * 2.2, 3.4, d / 2 + 0.32, PAL.beam);
    b.box(0.18, 2.8, 0.18, i * 2.2, 3.4, -d / 2 - 0.32, PAL.beam);
  }
  b.prism(d + 2, 4, w + 2, 0, 6.2, 0, PAL.tileDark, { ry: Math.PI / 2 });
  b.prism(d - 0.2, 3.9, 0.12, 0, 6.2, 0, PAL.plasterWarm, { ry: Math.PI / 2 });
  // porta dupla
  b.box(2.0, 2.4, 0.14, 0, 0.4, d / 2 + 0.07, PAL.door);
  b.box(2.4, 0.3, 0.3, 0, 2.8, d / 2 + 0.12, PAL.beam);
  // janelas
  for (const x of [-3.5, 3.5]) {
    b.box(1.4, 1.1, 0.12, x, 1.2, d / 2 + 0.07, 0x2a2016, { mat: 'window' });
    for (const x2 of [-2.2, 0, 2.2, 4.4, -4.4]) b.box(1.0, 1.0, 0.12, x2, 4.3, d / 2 + 0.36, 0x2a2016, { mat: 'window' });
  }
  for (const z of [-2, 2]) {
    b.box(0.12, 1.0, 1.0, w / 2 + 0.36, 4.3, z, 0x2a2016, { mat: 'window' });
    b.box(0.12, 1.0, 1.0, -w / 2 - 0.36, 4.3, z, 0x2a2016, { mat: 'window' });
  }
  // chaminé
  b.box(1.2, 10.5, 1.2, w / 2 - 1.2, 0.4, -d / 4, PAL.stone);
  if (opt.onChimney) opt.onChimney(b.toWorld(w / 2 - 1.2, 11.2, -d / 4));
  // placa pendurada
  b.box(0.15, 0.15, 1.8, w / 2 - 1.5, 3.0, d / 2 + 0.9, PAL.woodDark);
  b.box(0.1, 1.0, 1.3, w / 2 - 1.5, 1.85, d / 2 + 1.3, PAL.woodLight);
  b.sphere(0.32, w / 2 - 1.42, 2.35, d / 2 + 1.3, PAL.gold, { mat: 'metal', sx: 0.4 });
  // mesas externas
  for (const x of [-3.5, 3.5]) {
    b.box(1.6, 0.1, 0.9, x, 0.85, d / 2 + 2.2, PAL.woodLight);
    b.box(0.15, 0.85, 0.15, x, 0, d / 2 + 2.2, PAL.wood);
    b.box(1.6, 0.08, 0.3, x, 0.45, d / 2 + 1.5, PAL.wood);
    b.box(1.6, 0.08, 0.3, x, 0.45, d / 2 + 2.9, PAL.wood);
    b.colBox(x, d / 2 + 2.2, 0.9, 0.9, 0, 1);
  }
  barrel(b, -w / 2 - 0.8, 0, d / 2 - 0.5);
  barrel(b, -w / 2 - 0.8, 0, d / 2 - 1.5);
  barrel(b, -w / 2 - 0.6, 1.0, d / 2 - 1.0);
}

// ---------------- Ferraria ----------------
export function smithy(b, opt = {}) {
  const w = 8, d = 6;
  b.box(w + 0.4, 0.4, d + 0.4, 0, -0.2, 0, PAL.stoneDark);
  // parede de fundo e lateral
  b.box(w, 3.2, 0.5, 0, 0.2, -d / 2, PAL.stone, { collide: true });
  b.box(0.5, 3.2, d, -w / 2, 0.2, 0, PAL.stone, { collide: true });
  // postes
  for (const x of [w / 2 - 0.2]) for (const z of [-d / 2 + 0.2, d / 2 - 0.2]) b.box(0.3, 3.2, 0.3, x, 0.2, z, PAL.beam, { collide: true });
  b.box(0.3, 3.2, 0.3, -w / 2 + 0.2, 0.2, d / 2 - 0.2, PAL.beam, { collide: true });
  b.prism(d + 1.4, 2.2, w + 1, 0, 3.4, 0, PAL.slate, { ry: Math.PI / 2 });
  // forja
  b.box(2.2, 1.2, 1.6, -w / 2 + 1.6, 0.2, -d / 2 + 1.1, PAL.stoneDark, { collide: true });
  b.box(1.6, 0.25, 1.1, -w / 2 + 1.6, 1.4, -d / 2 + 1.1, 0xff6a1a, { mat: 'glow' });
  b.box(1.0, 4.5, 1.0, -w / 2 + 1.6, 1.4, -d / 2 + 0.8, PAL.stone);
  if (opt.onForge) opt.onForge(b.toWorld(-w / 2 + 1.6, 1.8, -d / 2 + 1.1));
  if (opt.onChimney) opt.onChimney(b.toWorld(-w / 2 + 1.6, 6.3, -d / 2 + 0.8));
  // bigorna
  anvil(b, 1.0, 0.2, 0.5);
  // barril de água, armas na parede
  barrel(b, w / 2 - 1.2, 0.2, -d / 2 + 1.0);
  for (let i = 0; i < 4; i++) {
    b.box(0.08, 1.3, 0.25, -1.5 + i * 0.7, 1.4, -d / 2 + 0.3, 0xb8bcc4, { mat: 'metal' });
    b.box(0.35, 0.08, 0.3, -1.5 + i * 0.7, 1.45, -d / 2 + 0.32, PAL.iron, { mat: 'metal' });
  }
  // escudo pendurado
  b.cyl(0.55, 0.55, 0.1, 2.4, 1.9, -d / 2 + 0.32, PAL.red, { rx: Math.PI / 2, seg: 12 });
  b.cyl(0.2, 0.2, 0.14, 2.4, 1.9, -d / 2 + 0.36, PAL.gold, { rx: Math.PI / 2, seg: 8, mat: 'metal' });
}

export function anvil(b, x, y, z) {
  b.box(0.6, 0.5, 0.5, x, y, z, PAL.woodDark, { collide: true });
  b.box(0.35, 0.3, 0.3, x, y + 0.5, z, PAL.iron, { mat: 'metal' });
  b.box(0.9, 0.25, 0.4, x, y + 0.8, z, PAL.iron, { mat: 'metal' });
  b.cone(0.18, 0.4, x + 0.6, y + 0.92, z, PAL.iron, { rz: -Math.PI / 2, mat: 'metal', seg: 6 });
}

// ---------------- Capela ----------------
export function chapel(b, opt = {}) {
  const w = 7, d = 13;
  b.box(w + 0.6, 0.6, d + 0.6, 0, -0.2, 0, PAL.stoneDark);
  b.box(w, 5.5, d, 0, 0.4, 0, PAL.stoneLight, { collide: true });
  b.prism(w + 1.2, 4.2, d + 0.8, 0, 5.9, 0, PAL.slate);
  // contrafortes
  for (let i = -1; i <= 1; i++) {
    b.box(0.6, 4, 0.8, w / 2 + 0.3, 0.4, i * 4, PAL.stone);
    b.box(0.6, 4, 0.8, -w / 2 - 0.3, 0.4, i * 4, PAL.stone);
  }
  // torre do sino (frente +z)
  b.box(3.4, 11, 3.4, 0, 0.4, d / 2 + 1.0, PAL.stoneLight, { collide: true });
  b.box(3.8, 0.4, 3.8, 0, 11.4, d / 2 + 1.0, PAL.stone);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.5, 2.4, 0.5, sx * 1.5, 11.8, d / 2 + 1.0 + sz * 1.5, PAL.stone);
  b.pyramid(4.0, 5.5, 4.0, 0, 14.2, d / 2 + 1.0, PAL.slate);
  b.cyl(0.6, 0.9, 1.0, 0, 12.3, d / 2 + 1.0, PAL.gold, { mat: 'metal', seg: 10 });
  // cruz/sol no topo
  b.box(0.15, 1.6, 0.15, 0, 19.6, d / 2 + 1.0, PAL.gold, { mat: 'metal' });
  b.box(0.9, 0.15, 0.15, 0, 20.6, d / 2 + 1.0, PAL.gold, { mat: 'metal' });
  // porta arqueada
  b.box(1.8, 2.8, 0.2, 0, 0.4, d / 2 + 2.75, PAL.door);
  b.cyl(0.9, 0.9, 0.2, 0, 3.2, d / 2 + 2.75, PAL.door, { rx: Math.PI / 2, seg: 12 });
  // vitrais (brilham)
  for (let i = -1; i <= 1; i++) {
    b.box(0.12, 2.4, 1.1, w / 2 + 0.06, 2.2, i * 4 + 2, 0x6a3aa0, { mat: 'window' });
    b.box(0.12, 2.4, 1.1, -w / 2 - 0.06, 2.2, i * 4 + 2, 0x3a5aa0, { mat: 'window' });
  }
  b.cyl(1.2, 1.2, 0.12, 0, 4.2, -d / 2 - 0.06, 0xa04a3a, { rx: Math.PI / 2, seg: 12, mat: 'window' });
}

// ---------------- Poço ----------------
export function well(b) {
  b.cyl(1.3, 1.4, 1.0, 0, 0, 0, PAL.stone, { seg: 12, collide: true });
  b.cyl(1.05, 1.05, 0.05, 0, 0.8, 0, 0x1a3040, { seg: 12 });
  for (const sx of [-1, 1]) b.box(0.18, 2.6, 0.18, sx * 1.1, 0.9, 0, PAL.wood);
  b.box(2.6, 0.15, 0.15, 0, 3.0, 0, PAL.wood);
  b.prism(2.6, 1.0, 3.0, 0, 3.3, 0, PAL.thatch, { ry: Math.PI / 2 });
  b.cyl(0.25, 0.2, 0.35, 0.2, 1.9, 0, PAL.wood, { seg: 8 });
  b.box(0.03, 1.0, 0.03, 0.2, 2.2, 0, 0x8a7a5a);
}

// ---------------- Barraca de feira ----------------
export function stall(b, opt = {}) {
  const rng = new RNG(opt.seed || 3);
  const cloth = opt.cloth || rng.pick([0xb83a2a, 0x2a5aa8, 0xd8a83a, 0x3a8a4a, 0x8a3a8a]);
  const w = 3.2, d = 2.0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.15, sz > 0 ? 2.3 : 2.8, 0.15, sx * w / 2, 0, sz * d / 2, PAL.wood);
  b.box(w + 0.3, 0.08, d + 0.6, 0, 2.55, 0, cloth, { rx: -0.24 });
  b.box(w, 0.9, 0.7, 0, 0, d / 2 - 0.35, PAL.woodLight, { collide: true });
  b.colBox(0, 0, w / 2, d / 2, 0, 2.5);
  // mercadorias
  const goods = [0xd84a2a, 0xe8c84a, 0x6ab84a, 0xa86a3a, 0xc8c8d0];
  for (let i = 0; i < 6; i++) b.sphere(0.16, -w / 2 + 0.4 + i * 0.48, 1.05, d / 2 - 0.35 + rng.float(-0.15, 0.15), rng.pick(goods));
  crate(b, w / 2 + 0.5, 0, -0.3, 0.3, 0.7);
  sack(b, -w / 2 - 0.5, 0, 0.2);
}

// ---------------- Cercas ----------------
export function fenceLine(b, pts, opt = {}) {
  const c = opt.color || PAL.wood;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 2.4));
    const ang = Math.atan2(bx - ax, bz - az);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const y = opt.heightAt ? opt.heightAt(x, z) - b.origin.y : 0;
      b.box(0.16, 1.2, 0.16, x, y - 0.2, z, c);
    }
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const my = opt.heightAt ? opt.heightAt(mx, mz) - b.origin.y : 0;
    b.box(0.08, 0.1, len, mx, my + 0.6, mz, c, { ry: ang });
    b.box(0.08, 0.1, len, mx, my + 0.25, mz, c, { ry: ang });
    if (opt.collide !== false) b.colBox(mx, mz, 0.15, len / 2, my - 1, my + 1.0, ang);
  }
}

// ---------------- Moinho de vento ----------------
export function windmill(b, opt = {}) {
  b.cyl(2.6, 3.6, 9, 0, 0, 0, PAL.stoneLight, { seg: 10, collide: true });
  b.cone(3.4, 3.4, 0, 9, 0, PAL.thatch, { seg: 10 });
  b.box(1.3, 2.2, 0.2, 0, 0, 3.45, PAL.door, { ry: 0 });
  for (const y of [3.5, 6.5]) b.box(0.8, 0.8, 0.15, 0, y, 3.2, 0x2a2016, { mat: 'window', rx: -0.12 });
  b.box(0.8, 0.8, 1.0, 0, 8.0, 3.0, PAL.woodDark);
  // pás são dinâmicas: devolve o ponto do eixo
  return b.toWorld(0, 8.4, 3.6);
}

// ---------------- Torres e muralhas ----------------
export function tower(b, opt = {}) {
  const r = opt.r || 3, h = opt.h || 12;
  b.cyl(r, r * 1.08, h, 0, 0, 0, opt.color || PAL.stone, { seg: 10, collide: true });
  // ameias
  b.cyl(r + 0.4, r + 0.4, 0.6, 0, h, 0, PAL.stoneDark, { seg: 10 });
  const nM = 8;
  for (let i = 0; i < nM; i++) {
    const a = (i / nM) * Math.PI * 2;
    b.box(0.9, 1.0, 0.7, Math.sin(a) * (r + 0.1), h + 0.6, Math.cos(a) * (r + 0.1), PAL.stone, { ry: a });
  }
  if (opt.roof !== false) {
    b.cone(r + 0.9, r * 2.2, 0, h + 0.6, 0, opt.roofColor || PAL.slate, { seg: 10 });
    if (opt.flag) {
      b.box(0.1, 2.2, 0.1, 0, h + 0.6 + r * 2.2, 0, PAL.iron);
      b.box(0.05, 0.7, 1.2, 0, h + 1.9 + r * 2.2, 0.6, opt.flag);
    }
  }
  // janelas em seteira
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    b.box(0.25, 1.0, 0.12, Math.sin(a) * (r + 0.02), h * 0.55, Math.cos(a) * (r + 0.02), 0x111111, { ry: a });
  }
}

export function wallSegment(b, len, h = 7, thick = 2.2, opt = {}) {
  // ao longo do eixo x local, centrado
  b.box(len, h, thick, 0, -1.5, 0, opt.color || PAL.stone, { collide: true, camera: true });
  b.box(len, 0.5, thick + 0.4, 0, h - 1.5, 0, PAL.stoneDark);
  const n = Math.floor(len / 1.6);
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + 0.8 + i * (len / n);
    b.box(0.9, 1.0, 0.5, x, h - 1.0, thick / 2, PAL.stone);
    b.box(0.9, 1.0, 0.5, x, h - 1.0, -thick / 2, PAL.stone);
  }
}

// ---------------- Castelo de Valdren ----------------
export function castle(b, opt = {}) {
  const hw = 40, hdN = -36, hdS = 30; // limites locais: x ±40, z de -36 (norte) a 30 (sul)
  const H = 9;
  // muralhas (sul com portão, norte com portão)
  const gateW = 8;
  const seg = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    b.push((x0 + x1) / 2, 0, (z0 + z1) / 2, Math.atan2(z1 - z0, x1 - x0) * -1);
    wallSegment(b, len, H, 2.4);
    b.pop();
  };
  seg(-hw, hdS, -gateW / 2 - 2.5, hdS);
  seg(gateW / 2 + 2.5, hdS, hw, hdS);
  seg(-hw, hdN, -gateW / 2 - 2.5, hdN);
  seg(gateW / 2 + 2.5, hdN, hw, hdN);
  seg(-hw, hdN, -hw, hdS);
  seg(hw, hdN, hw, hdS);
  // torres dos cantos
  for (const [x, z] of [[-hw, hdS], [hw, hdS], [-hw, hdN], [hw, hdN]]) {
    b.push(x, -1, z, 0); tower(b, { r: 3.6, h: 14, flag: PAL.red }); b.pop();
  }
  // portaria sul e norte
  for (const [z, name] of [[hdS, 'south'], [hdN, 'north']]) {
    for (const sx of [-1, 1]) { b.push(sx * (gateW / 2 + 2.2), -1, z, 0); tower(b, { r: 2.6, h: 12, roof: true, flag: PAL.blue }); b.pop(); }
    b.box(gateW + 2, 3, 3.2, 0, 6.5, z, PAL.stone);
    b.box(gateW + 2.4, 0.5, 3.6, 0, 9.5, z, PAL.stoneDark);
    // grade (aberta, decorativa acima)
    for (let i = -3; i <= 3; i++) b.box(0.12, 1.4, 0.12, i * 1.1, 5.1, z, PAL.iron, { mat: 'metal' });
    if (opt.onGate) opt.onGate(name, b.toWorld(0, 0, z));
  }
  // torre de menagem (keep) ao norte do pátio
  b.push(0, 0, -20, 0);
  b.box(26, 14, 14, 0, -1, 0, PAL.stoneLight, { collide: true });
  b.box(27, 0.6, 15, 0, 13, 0, PAL.stoneDark);
  for (let i = 0; i < 14; i++) b.box(1.0, 1.1, 0.6, -12.5 + i * 1.92, 13.6, 7.2, PAL.stoneLight);
  for (const sx of [-1, 1]) { b.push(sx * 13, -1, 7, 0); tower(b, { r: 3.0, h: 19, flag: PAL.red }); b.pop(); }
  for (const sx of [-1, 1]) { b.push(sx * 13, -1, -7, 0); tower(b, { r: 3.0, h: 17 }); b.pop(); }
  // torre alta central (onde ficava o Coração)
  b.push(0, 13, -1, 0); tower(b, { r: 4.2, h: 16, roof: false }); b.pop();
  b.cyl(5.2, 5.2, 0.6, 0, 29, -1, PAL.stoneDark, { seg: 12 });
  // suporte vazio do Coração (cristal quebrado)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.cone(0.6, 2.4, Math.sin(a) * 1.6, 29.5, -1 + Math.cos(a) * 1.6, PAL.riftGlow, { mat: 'rift', rx: Math.sin(a) * 0.5, rz: Math.cos(a) * 0.5, seg: 5 });
  }
  // grande portão do salão
  b.box(4.6, 6, 0.3, 0, -0.5, 7.05, PAL.door);
  b.cyl(2.3, 2.3, 0.3, 0, 5.5, 7.05, PAL.door, { rx: Math.PI / 2, seg: 12 });
  // estandartes
  for (const sx of [-1, 1]) {
    b.box(1.6, 6, 0.1, sx * 6, 4.5, 7.1, PAL.red);
    b.box(0.8, 0.8, 0.12, sx * 6, 8.0, 7.15, PAL.gold, { mat: 'metal', rz: Math.PI / 4 });
  }
  // escadaria
  for (let i = 0; i < 4; i++) b.box(9 - i * 0.4, 0.3, 1.0, 0, -0.9 + i * 0.3, 8.8 - i * 0.6, PAL.stone);
  b.pop();
  // capela do castelo / biblioteca (lado oeste) onde está o diário
  b.push(-27, 0, 0, 0);
  b.box(10, 6, 14, 0, -1, 0, PAL.stone, { collide: true });
  b.prism(11, 3.5, 15, 0, 5, 0, PAL.slate);
  b.box(2, 3, 0.2, 5.05, -1, 0, PAL.door, { ry: Math.PI / 2 });
  b.pop();
  // estábulos/quartel (leste) parcialmente destruídos
  b.push(28, 0, 2, 0);
  b.box(9, 4.5, 16, 0, -1, 0, PAL.stone, { collide: true });
  b.prism(10, 2.6, 17, 0, 3.5, 0, PAL.tileDark);
  b.pop();
  // escombros espalhados
  const rng = new RNG(77);
  for (let i = 0; i < 26; i++) {
    const x = rng.float(-34, 34), z = rng.float(-6, 26);
    if (Math.abs(x) < 6) continue;
    b.dod(rng.float(0.4, 1.1), x, -0.6, z, rng.chance(0.5) ? PAL.stone : PAL.stoneDark, { rx: rng.float(0, 3), ry: rng.float(0, 3) });
  }
  // poço do pátio e estátua do rei
  b.push(-12, 0, 16, 0); well(b); b.pop();
  b.push(12, 0, 16, 0);
  b.box(2.6, 1.4, 2.6, 0, -1, 0, PAL.stone, { collide: true });
  statue(b, 0, 0.4, 0, PAL.stoneLight, 1.4);
  b.pop();
}

export function statue(b, x, y, z, color, s = 1) {
  b.box(0.8 * s, 1.2 * s, 0.5 * s, x, y + 1.4 * s, z, color);
  b.box(0.3 * s, 1.4 * s, 0.35 * s, x - 0.2 * s, y, z, color);
  b.box(0.3 * s, 1.4 * s, 0.35 * s, x + 0.2 * s, y, z, color);
  b.sphere(0.32 * s, x, y + 2.95 * s, z, color);
  b.cone(0.35 * s, 0.35 * s, x, y + 3.2 * s, z, PAL.gold, { mat: 'metal', seg: 5 });
  b.box(0.12 * s, 1.8 * s, 0.12 * s, x + 0.55 * s, y + 1.2 * s, z + 0.3 * s, color, { rx: -0.3 });
  b.box(1.1 * s, 1.4 * s, 0.15 * s, x, y + 1.2 * s, z - 0.32 * s, PAL.red);
}

// ---------------- Templo do Sol Caído ----------------
export function temple(b, opt = {}) {
  // plataforma em degraus
  b.box(30, 0.9, 30, 0, -0.6, 0, PAL.sandDark);
  b.colPlatform(0, 0, 15, 15, 0.3);
  b.box(26, 0.6, 26, 0, 0.3, 0, PAL.sand);
  b.colPlatform(0, 0, 13, 13, 0.9);
  // degraus de acesso (oeste, -x)
  for (let i = 0; i < 2; i++) b.box(1.2, 0.3 * (i + 1), 10, -16.2 + i * 1.2, -0.3, 0, PAL.sand);
  const colH = 7;
  const rng = new RNG(31);
  // colunata circular, algumas quebradas
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = Math.sin(a) * 11, z = Math.cos(a) * 11;
    const broken = rng.chance(0.35);
    const h = broken ? rng.float(2, 4.5) : colH;
    b.cyl(0.7, 0.8, 0.5, x, 0.9, z, PAL.sandDark, { seg: 10 });
    b.cyl(0.55, 0.6, h, x, 1.4, z, PAL.marble, { seg: 10, collide: true });
    if (!broken) b.box(1.6, 0.5, 1.6, x, 1.4 + h, z, PAL.sandDark);
    else b.cyl(0.55, 0.55, 1.2, x + rng.float(-2.5, 2.5), 0.9, z + rng.float(-2.5, 2.5), PAL.marble, { rz: Math.PI / 2, ry: rng.float(0, 3), seg: 10 });
  }
  // arquitraves remanescentes
  for (let i = 0; i < 12; i += 3) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    b.box(6, 0.8, 1.2, Math.sin(a) * 11, 9.0, Math.cos(a) * 11, PAL.sand, { ry: a + Math.PI / 2 });
  }
  // santuário interno (com porta selada)
  b.push(0, 0.9, 0, 0);
  b.box(8, 5.5, 8, 0, 0, 0, PAL.sand, { collide: true });
  b.box(9, 0.5, 9, 0, 5.5, 0, PAL.sandDark);
  b.pyramid(8.6, 3.6, 8.6, 0, 6.0, 0, PAL.gold, { mat: 'metal' });
  // disco solar na fachada oeste
  b.cyl(1.4, 1.4, 0.2, -4.08, 4.1, 0, PAL.gold, { rz: Math.PI / 2, seg: 16, mat: 'metal' });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.box(0.15, 0.7, 0.2, -4.1, 4.1 + Math.sin(a) * 1.9, Math.cos(a) * 1.9, PAL.gold, { mat: 'metal', rx: -a });
  }
  b.pop();
  if (opt.onDoor) opt.onDoor(b.toWorld(-4.3, 0.9, 0));
}

export function brazier(b, x, y, z, opt = {}) {
  b.cyl(0.25, 0.35, 1.2, x, y, z, opt.color || PAL.iron, { seg: 8, mat: 'metal', collide: true });
  b.cyl(0.75, 0.35, 0.5, x, y + 1.2, z, opt.color || PAL.iron, { seg: 10, mat: 'metal' });
  return b.toWorld(x, y + 1.7, z);
}

// ---------------- Santuário (pedestal + pilares) ----------------
export function shrine(b, opt = {}) {
  const c = opt.color || PAL.stoneLight;
  b.cyl(5.5, 6, 0.6, 0, -0.3, 0, PAL.stoneDark, { seg: 12 });
  b.cyl(4.5, 4.8, 0.3, 0, 0.3, 0, c, { seg: 12 });
  b.colPlatform(0, 0, 4.0, 4.0, 0.3, Math.PI / 4);
  b.colPlatform(0, 0, 3.2, 3.2, 0.6, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const h = i % 2 ? 3.5 : 4.5;
    b.box(0.8, h, 0.8, Math.sin(a) * 4, 0.3, Math.cos(a) * 4, c, { ry: a, collide: true });
    b.box(1.1, 0.4, 1.1, Math.sin(a) * 4, 0.3 + h, Math.cos(a) * 4, PAL.stoneDark, { ry: a });
  }
  return brazier(b, 0, 0.6, 0, { color: opt.brazierColor });
}

// ---------------- Pedra-guia (teleporte) ----------------
export function waystone(b) {
  b.cyl(1.5, 1.8, 0.4, 0, -0.1, 0, PAL.stoneDark, { seg: 8 });
  b.box(0.9, 3.2, 0.6, 0, 0.3, 0, 0x6a7078, { collide: true });
  b.pyramid(0.9, 0.7, 0.6, 0, 3.5, 0, 0x6a7078);
  b.box(0.3, 1.6, 0.05, 0, 1.0, 0.31, 0x5ae0ff, { mat: 'glow' });
  b.box(0.3, 1.6, 0.05, 0, 1.0, -0.31, 0x5ae0ff, { mat: 'glow' });
}

// ---------------- Acampamentos ----------------
export function tent(b, x, z, ry = 0, color = 0x8a6a4a, s = 1) {
  b.push(x, 0, z, ry);
  b.prism(3.2 * s, 2.4 * s, 4 * s, 0, 0, 0, color);
  b.box(0.12, 2.6 * s, 0.12, 0, 0, 2.05 * s, PAL.woodDark);
  b.box(0.12, 2.6 * s, 0.12, 0, 0, -2.05 * s, PAL.woodDark);
  b.colBox(0, 0, 1.6 * s, 2 * s, 0, 2.4 * s);
  b.pop();
}

export function campfire(b, x, y, z) {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.dod(0.28, x + Math.sin(a) * 0.8, y + 0.1, z + Math.cos(a) * 0.8, PAL.stoneDark);
  }
  for (let i = 0; i < 4; i++) b.box(0.18, 0.18, 1.3, x, y + 0.15, z, PAL.woodDark, { ry: (i / 4) * Math.PI });
  return b.toWorld(x, y + 0.3, z);
}

export function palisade(b, cx, cz, r, gapAngle = 0, gapSize = 0.35, heightAt) {
  const n = Math.floor((Math.PI * 2 * r) / 0.75);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let da = Math.abs(((a - gapAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
    if (da < gapSize) continue;
    const x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r;
    const y = heightAt ? heightAt(x, z) - b.origin.y : 0;
    const h = 3.2 + ((i * 37) % 7) * 0.12;
    b.cyl(0.32, 0.36, h, x, y - 0.5, z, PAL.wood, { seg: 6 });
    b.cone(0.32, 0.6, x, y - 0.5 + h, z, PAL.woodLight, { seg: 6 });
  }
  // colisores aproximados em segmentos
  const segs = 28;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    let da = Math.abs(((am - gapAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
    if (da < gapSize) continue;
    const x0 = cx + Math.sin(a0) * r, z0 = cz + Math.cos(a0) * r, x1 = cx + Math.sin(a1) * r, z1 = cz + Math.cos(a1) * r;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const y = heightAt ? heightAt((x0 + x1) / 2, (z0 + z1) / 2) - b.origin.y : 0;
    b.colBox((x0 + x1) / 2, (z0 + z1) / 2, len / 2 + 0.2, 0.45, y - 2, y + 3.5, Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2);
  }
}

export function watchtower(b, x, z, h = 5) {
  b.push(x, 0, z, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.25, h + 1.2, 0.25, sx * 1.2, 0, sz * 1.2, PAL.wood);
  b.colBox(0, 0, 1.4, 1.4, 0, h);
  b.box(3.0, 0.2, 3.0, 0, h, 0, PAL.woodLight);
  for (const sz of [-1, 1]) b.box(3.0, 0.8, 0.12, 0, h + 0.2, sz * 1.45, PAL.wood);
  for (const sx of [-1, 1]) b.box(0.12, 0.8, 3.0, sx * 1.45, h + 0.2, 0, PAL.wood);
  b.pyramid(3.6, 1.6, 3.6, 0, h + 1.2, 0, PAL.thatchDark);
  b.pop();
}

// ---------------- Cemitério ----------------
export function tombstone(b, x, y, z, ry = 0, rng) {
  const t = rng ? rng.int(0, 2) : 0;
  if (t === 0) {
    b.box(0.7, 1.0, 0.2, x, y, z, PAL.stoneLight, { ry, rx: rng ? rng.float(-0.12, 0.12) : 0 });
    b.cyl(0.35, 0.35, 0.2, x, y + 1.0, z, PAL.stoneLight, { rx: Math.PI / 2, ry, seg: 8 });
  } else if (t === 1) {
    b.box(0.18, 1.4, 0.18, x, y, z, PAL.stone, { ry });
    b.box(0.8, 0.18, 0.18, x, y + 0.95, z, PAL.stone, { ry });
  } else {
    b.box(0.9, 0.7, 0.3, x, y, z, PAL.stoneDark, { ry });
  }
  b.box(0.8, 0.12, 1.6, x, y, z + 0.9, 0x5a4a32, { ry });
}

export function blackStone(b) {
  b.cyl(2.2, 2.6, 0.4, 0, -0.1, 0, PAL.stoneDark, { seg: 7 });
  b.box(1.6, 4.4, 1.0, 0, 0.2, 0, 0x14101a, { rz: 0.06, collide: true });
  b.pyramid(1.6, 1.2, 1.0, 0.13, 4.6, 0, 0x14101a, { rz: 0.06 });
  b.box(0.12, 2.6, 0.02, 0.05, 1.1, 0.51, 0x9a4aff, { mat: 'glow' });
  b.box(0.7, 0.1, 0.02, 0.05, 2.6, 0.51, 0x9a4aff, { mat: 'glow' });
}

// ---------------- Pedras em círculo (Bosque) ----------------
export function stoneCircle(b, r = 9, n = 9) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const h = 3 + (i % 3) * 0.6;
    b.box(1.3, h, 0.8, Math.sin(a) * r, -0.3, Math.cos(a) * r, 0x7a8078, { ry: a, rz: (i % 2 ? 0.05 : -0.04), collide: true });
    b.box(0.3, 0.8, 0.02, Math.sin(a) * (r - 0.41), h * 0.55, Math.cos(a) * (r - 0.41), 0x6affb0, { ry: a, mat: 'glow' });
  }
  // altar
  b.box(3, 1.0, 1.6, 0, -0.2, 0, 0x7a8078, { collide: true });
  b.box(3.2, 0.2, 1.8, 0, 0.8, 0, 0x6a7068);
}

// ---------------- Torre do eremita ----------------
export function hermitTower(b) {
  b.cyl(3.6, 4.2, 4, 0, -0.5, 0, PAL.stoneDark, { seg: 9, collide: true });
  b.cyl(3.0, 3.4, 9, 0, 3.5, 0, PAL.stone, { seg: 9 });
  b.cyl(3.3, 3.0, 5, 0.4, 12.5, 0.2, PAL.stoneLight, { seg: 9, rz: 0.06 });
  b.cone(4.2, 6.5, 0.8, 17.5, 0.3, 0x3a3a8a, { seg: 9, rz: 0.12 });
  b.sphere(0.5, 1.7, 24.0, 0.3, 0x9adaff, { mat: 'glow' });
  b.box(1.4, 2.4, 0.2, 0, -0.5, 4.15, PAL.door);
  for (const y of [5, 9, 14]) b.box(0.8, 1.1, 0.2, 0, y, 3.2, 0x2a2016, { mat: 'window', rx: -0.1 });
  // escadaria externa espiral até a varanda
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 1.6 + Math.PI;
    b.box(1.4, 0.25, 0.9, Math.sin(a) * 4.6, i * 0.55, Math.cos(a) * 4.6, PAL.stoneLight, { ry: a + Math.PI / 2 });
  }
  b.cyl(4.6, 4.6, 0.35, 0, 9.9, 0, PAL.stoneLight, { seg: 12 });
}

// ---------------- Ponte ----------------
export function bridge(b, len, width) {
  const hw = width / 2;
  b.box(width, 0.35, len, 0, -0.35, 0, PAL.woodLight);
  for (let i = 0; i < Math.floor(len / 0.8); i++) b.box(width + 0.1, 0.06, 0.12, 0, 0.0, -len / 2 + 0.4 + i * 0.8, PAL.wood);
  for (const sx of [-1, 1]) {
    b.box(0.2, 0.15, len, sx * hw, 1.0, 0, PAL.wood);
    for (let i = 0; i <= 5; i++) b.box(0.22, 1.1, 0.22, sx * hw, -0.1, -len / 2 + (len / 5) * i, PAL.woodDark);
    b.colBox(sx * (hw + 0.1), 0, 0.15, len / 2, -0.5, 1.2);
  }
  // pilares
  for (const z of [-len / 2 + 1, 0, len / 2 - 1]) for (const sx of [-1, 1]) b.cyl(0.25, 0.3, 4, sx * (hw - 0.3), -4.3, z, PAL.woodDark, { seg: 6 });
}

// ---------------- Luminárias ----------------
export function torchPost(b, x, y, z) {
  b.box(0.18, 2.2, 0.18, x, y, z, PAL.woodDark);
  b.cyl(0.18, 0.1, 0.35, x, y + 2.2, z, PAL.iron, { seg: 6, mat: 'metal' });
  b.colCircle(x, z, 0.25, y - 1, y + 2.5);
  return b.toWorld(x, y + 2.7, z);
}

export function lampPost(b, x, y, z) {
  b.box(0.2, 3.2, 0.2, x, y, z, PAL.iron, { mat: 'metal' });
  b.box(0.8, 0.12, 0.12, x + 0.3, y + 3.1, z, PAL.iron, { mat: 'metal' });
  b.box(0.4, 0.5, 0.4, x + 0.6, y + 2.5, z, 0xffe0a0, { mat: 'window' });
  b.colCircle(x, z, 0.25, y - 1, y + 3.4);
  return b.toWorld(x + 0.6, y + 2.75, z);
}

export function signpost(b, x, y, z, ry = 0) {
  b.box(0.15, 2.4, 0.15, x, y, z, PAL.wood);
  b.box(1.4, 0.35, 0.08, x + 0.5, y + 2.0, z, PAL.woodLight, { ry });
  b.box(1.2, 0.3, 0.08, x - 0.4, y + 1.55, z, PAL.woodLight, { ry: ry + 0.6 });
}

export function cart(b, x, y, z, ry = 0) {
  b.push(x, y, z, ry);
  b.box(1.6, 0.5, 2.6, 0, 0.7, 0, PAL.woodLight, { collide: true });
  b.box(1.7, 0.4, 0.1, 0, 1.2, 1.3, PAL.wood);
  b.box(1.7, 0.4, 0.1, 0, 1.2, -1.3, PAL.wood);
  for (const sx of [-1, 1]) b.cyl(0.6, 0.6, 0.15, sx * 0.9, 0.6, 0.4, PAL.woodDark, { rz: Math.PI / 2, seg: 10 });
  b.box(0.1, 0.1, 2.2, 0.3, 0.6, 2.3, PAL.wood);
  b.box(0.1, 0.1, 2.2, -0.3, 0.6, 2.3, PAL.wood);
  for (let i = 0; i < 3; i++) b.sphere(0.35, -0.3 + i * 0.3, 1.2, -0.5 + i * 0.4, PAL.hay);
  b.pop();
}

export function bench(b, x, y, z, ry = 0) {
  b.box(1.8, 0.1, 0.45, x, y + 0.45, z, PAL.woodLight, { ry });
  b.box(0.12, 0.45, 0.4, x - 0.7, y, z, PAL.wood, { ry });
  b.box(0.12, 0.45, 0.4, x + 0.7, y, z, PAL.wood, { ry });
}

export function trainingDummy(b, x, y, z) {
  b.box(0.15, 1.8, 0.15, x, y, z, PAL.wood);
  b.box(1.2, 0.12, 0.12, x, y + 1.4, z, PAL.wood);
  b.sphere(0.35, x, y + 1.4, z, PAL.hay, { sy: 1.4 });
  b.sphere(0.22, x, y + 2.05, z, PAL.cloth);
  b.colCircle(x, z, 0.4, y - 1, y + 2.2);
}

// ---------------- Ruínas genéricas ----------------
export function ruinWall(b, len, h, rng) {
  const n = Math.max(2, Math.floor(len / 1.2));
  for (let i = 0; i < n; i++) {
    const hh = h * rng.float(0.3, 1);
    b.box(len / n + 0.02, hh, 1.0, -len / 2 + (i + 0.5) * (len / n), -0.3, 0, rng.chance(0.5) ? PAL.stone : PAL.stoneDark);
  }
  b.colBox(0, 0, len / 2, 0.55, -1, h);
}

// ---------------- Cristais da Fenda ----------------
export function riftCrystals(b, x, y, z, rng, scale = 1) {
  const n = rng.int(3, 6);
  for (let i = 0; i < n; i++) {
    const h = rng.float(1.5, 4.5) * scale;
    b.cone(rng.float(0.3, 0.7) * scale, h, x + rng.float(-1, 1) * scale, y - 0.3, z + rng.float(-1, 1) * scale, rng.chance(0.5) ? 0xb060ff : 0xff60d0,
      { mat: 'rift', rx: rng.float(-0.5, 0.5), rz: rng.float(-0.5, 0.5), seg: 5 });
  }
  b.colCircle(x, z, 1.2 * scale, y - 1, y + 3 * scale);
}
