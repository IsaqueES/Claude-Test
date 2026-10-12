// Posiciona as estruturas do reino e devolve âncoras para objetos dinâmicos.
import { RNG } from '../core/math.js';
import { LOC, WAYSTONES, CASTLE_H, RIFT_H } from './WorldMap.js';
import * as B from './Builders.js';

const PAL = B.PAL;

export function buildStructures(brush, terrain, collision) {
  const T = terrain;
  const H = (x, z) => T.heightAt(x, z);
  const A = {
    chimneys: [], torches: [], lamps: [], waystones: [], braziers: {}, windmillHub: null,
    forge: null, campfires: [], anchors: {}, npcSpots: {}, bridges: [],
  };
  const rng = new RNG(2024);
  const at = (x, z, ry = 0, yOff = 0) => brush.push(x, H(x, z) + yOff, z, ry);
  const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z); // rotação para +z local apontar ao alvo
  const occupied = [];
  const free = (x, z, r) => occupied.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + r);
  const occupy = (x, z, r) => occupied.push({ x, z, r });

  // ======================== BRUMAVALE ========================
  const V = LOC.brumavale;
  const vy = H(V.x, V.z);
  // Poço central
  at(V.x, V.z); B.well(brush); brush.pop(); occupy(V.x, V.z, 3);
  // Taverna
  const tav = { x: -20, z: 100 };
  at(tav.x, tav.z, faceTo(tav.x, tav.z, V.x, V.z)); B.tavern(brush, { onChimney: (p) => A.chimneys.push(p) }); brush.pop(); occupy(tav.x, tav.z, 8);
  A.anchors.tavernDoor = { x: tav.x + 4.5, z: tav.z + 4.5 };
  // Ferraria de Bram
  const sm = { x: 22, z: 99 };
  at(sm.x, sm.z, faceTo(sm.x, sm.z, V.x, V.z) ); B.smithy(brush, { onForge: (p) => (A.forge = p), onChimney: (p) => A.chimneys.push(p) }); brush.pop(); occupy(sm.x, sm.z, 6.5);
  // Capela
  const ch = { x: -32, z: 142 };
  at(ch.x, ch.z, faceTo(ch.x, ch.z, V.x, V.z)); B.chapel(brush); brush.pop(); occupy(ch.x, ch.z + 2, 10);
  // Casa da Anciã Mirela (telhado de ardósia azulada)
  const mi = { x: 24, z: 141 };
  at(mi.x, mi.z, faceTo(mi.x, mi.z, V.x, V.z)); B.house(brush, { seed: 11, w: 7, d: 6, floors: 2, roof: 'tile', onChimney: (p) => A.chimneys.push(p) }); brush.pop(); occupy(mi.x, mi.z, 6.5);
  // Casa do jogador
  const ph = { x: -16, z: 153 };
  at(ph.x, ph.z, faceTo(ph.x, ph.z, V.x, V.z)); B.house(brush, { seed: 5, w: 6.5, d: 5.5, floors: 1, roof: 'thatch', onChimney: (p) => A.chimneys.push(p) }); brush.pop(); occupy(ph.x, ph.z, 6);
  A.anchors.playerHome = { x: ph.x + (V.x - ph.x) * 0.18, z: ph.z + (V.z - ph.z) * 0.18 };
  // Casas genéricas em anéis
  let seed = 100;
  for (const ring of [27, 37, 45]) {
    const n = Math.floor((Math.PI * 2 * ring) / 13);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.37;
      const x = V.x + Math.cos(a) * ring, z = V.z + Math.sin(a) * ring;
      if (T.roadDist(x, z) < 7.5) continue;
      if (!free(x, z, 5.5)) continue;
      if (T.slopeAt(x, z) > 0.3) continue;
      at(x, z, faceTo(x, z, V.x, V.z) + rng.float(-0.15, 0.15));
      B.house(brush, { seed: seed++, onChimney: (p) => A.chimneys.push(p) });
      brush.pop();
      occupy(x, z, 5.5);
    }
  }
  // Barracas da feira em volta da praça
  const stallAngles = [0.35, 1.25, 2.2, 3.55, 4.4, 5.6];
  stallAngles.forEach((a, i) => {
    const x = V.x + Math.cos(a) * 11, z = V.z + Math.sin(a) * 11;
    if (T.roadDist(x, z) < 2.5) return;
    at(x, z, faceTo(x, z, V.x, V.z)); B.stall(brush, { seed: 30 + i }); brush.pop();
    occupy(x, z, 2.5);
    if (i === 1) A.anchors.merchant = { x: V.x + Math.cos(a) * 9.3, z: V.z + Math.sin(a) * 9.3 };
  });
  // Lampiões da praça e tochas nas estradas
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const x = V.x + Math.cos(a) * 16.5, z = V.z + Math.sin(a) * 16.5;
    if (T.roadDist(x, z) < 1) continue;
    at(x, z); A.lamps.push(B.lampPost(brush, 0, 0, 0)); brush.pop();
  }
  // Bonecos de treino perto da ferraria
  for (let i = 0; i < 3; i++) { const x = 34 + i * 2.5, z = 92 - i; at(x, z); B.trainingDummy(brush, 0, 0, 0); brush.pop(); }
  A.anchors.dummies = { x: 36, z: 91 };
  // Carroça, bancos, barris
  at(-6, 92, 0.4); B.cart(brush, 0, 0, 0, 0); brush.pop();
  at(6, 130, 0); B.bench(brush, 0, 0, 0, 0.5); brush.pop();
  at(-7, 128, 0); B.bench(brush, 0, 0, 0, -0.5); brush.pop();
  // Placa na entrada norte
  at(6, 80); B.signpost(brush, 0, 0, 0, 0.3); brush.pop();
  // Cercas no perímetro (parcial)
  const fencePts = [];
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    fencePts.push([V.x + Math.cos(a) * 52, V.z + Math.sin(a) * 52]);
  }
  // divide em trechos fora das estradas
  let run = [];
  const flush = () => { if (run.length > 1) { brush.push(0, 0, 0, 0); B.fenceLine(brush, run, { heightAt: H }); brush.pop(); } run = []; };
  for (const p of fencePts) { if (T.roadDist(p[0], p[1]) < 4) flush(); else run.push(p); }
  flush();

  // ======================== FAZENDA ========================
  const F = LOC.farm;
  at(F.x - 12, F.z - 14, faceTo(F.x - 12, F.z - 14, V.x, V.z)); B.house(brush, { seed: 77, w: 7.5, d: 6, floors: 1, roof: 'thatch', onChimney: (p) => A.chimneys.push(p) }); brush.pop();
  A.anchors.farmhouse = { x: F.x - 9, z: F.z - 9 };
  // celeiro
  at(F.x + 12, F.z - 14, -0.2);
  brush.box(10, 5, 8, 0, 0, 0, 0x9a3a2a, { collide: true });
  brush.prism(9.4, 4, 10.6, 0, 5, 0, PAL.woodDark, { ry: Math.PI / 2 });
  brush.box(3.6, 4, 0.15, 0, 0, 4.05, PAL.wood);
  brush.box(3.6, 0.2, 0.2, 0, 2, 4.12, 0xe8e0d0, { rz: 0.84 });
  brush.box(3.6, 0.2, 0.2, 0, 2, 4.12, 0xe8e0d0, { rz: -0.84 });
  brush.pop();
  for (let i = 0; i < 6; i++) { const x = F.x + 4 + rng.float(-3, 3), z = F.z - 6 + rng.float(-2, 2); at(x, z); B.hayBale(brush, 0, 0, 0, rng.float(0, 3)); brush.pop(); }
  // curral das ovelhas
  const pen = { x: F.x + 14, z: F.z + 12 };
  A.anchors.sheepPen = pen;
  brush.push(0, 0, 0, 0);
  B.fenceLine(brush, [[pen.x - 6, pen.z - 6], [pen.x + 6, pen.z - 6], [pen.x + 6, pen.z + 6], [pen.x - 6, pen.z + 6], [pen.x - 6, pen.z + 2]], { heightAt: H });
  brush.pop();
  // espantalho
  at(F.x + 2, F.z + 4);
  brush.box(0.12, 2.6, 0.12, 0, 0, 0, PAL.wood); brush.box(1.8, 0.1, 0.1, 0, 1.9, 0, PAL.wood);
  brush.box(0.6, 0.8, 0.3, 0, 1.4, 0, 0x6a5a8a); brush.sphere(0.25, 0, 2.5, 0, PAL.hay); brush.cone(0.5, 0.4, 0, 2.62, 0, PAL.thatch);
  brush.pop();

  // ======================== MOINHO ========================
  const M = LOC.mill;
  at(M.x, M.z, faceTo(M.x, M.z, V.x, V.z)); A.windmillHub = B.windmill(brush); A.windmillYaw = faceTo(M.x, M.z, V.x, V.z); brush.pop();
  at(M.x - 7, M.z + 5, faceTo(M.x - 7, M.z + 5, V.x, V.z)); B.house(brush, { seed: 55, w: 6, d: 5, floors: 1, roof: 'tile', onChimney: (p) => A.chimneys.push(p) }); brush.pop();
  for (let i = 0; i < 5; i++) { at(M.x + 4 + i * 0.6, M.z - 2); B.sack(brush, 0, 0, 0); brush.pop(); }
  A.anchors.mill = { x: M.x, z: M.z + 6 };

  // ======================== CEMITÉRIO ========================
  const C = LOC.cemetery;
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const gap = Math.abs(((a - 0.0 + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.3; // portão a leste
    if (gap) continue;
    const x = C.x + Math.cos(a) * 16, z = C.z + Math.sin(a) * 16;
    at(x, z, -a); brush.box(4.2, 1.1, 0.7, 0, -0.3, 0, PAL.stoneDark, { collide: true }); brush.pop();
  }
  for (let row = -3; row <= 3; row++) for (let col = -3; col <= 2; col++) {
    const x = C.x + col * 3.2 + rng.float(-0.4, 0.4), z = C.z + row * 3.4;
    if (Math.hypot(x - C.x + 4, z - C.z - 8) < 4) continue;
    if (rng.chance(0.25)) continue;
    at(x, z); B.tombstone(brush, 0, -0.1, 0, Math.PI / 2 + rng.float(-0.2, 0.2), rng); brush.pop();
  }
  const bs = { x: C.x - 4, z: C.z + 9 };
  at(bs.x, bs.z, Math.PI); B.blackStone(brush); brush.pop();
  A.anchors.blackStone = bs;
  // mausoléu
  at(C.x - 10, C.z - 6, Math.PI / 2);
  brush.box(4, 3.2, 5, 0, 0, 0, PAL.stoneLight, { collide: true }); brush.prism(4.6, 1.6, 5.6, 0, 3.2, 0, PAL.stone, { ry: 0 });
  brush.box(1.2, 2, 0.1, 0, 0, 2.52, 0x222222);
  brush.pop();

  // ======================== SANTUÁRIO DA CHAMA ========================
  const FS = LOC.flameShrine;
  at(FS.x, FS.z); A.braziers.flame = B.shrine(brush, { color: 0xb8a088 }); brush.pop();
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.5; at(FS.x + Math.cos(a) * 8.5, FS.z + Math.sin(a) * 8.5, a); B.ruinWall(brush, 5, 2.5, rng); brush.pop(); }

  // ======================== ACAMPAMENTO DO CORVO ========================
  const BC = LOC.banditCamp;
  const bcy = H(BC.x, BC.z);
  brush.push(0, 0, 0, 0);
  B.palisade(brush, BC.x, BC.z, 25, 0.86, 0.3, H);
  brush.pop();
  const tentColors = [0x5a4a3a, 0x4a3a2a, 0x6a5040, 0x3a3a3a];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.9;
    const x = BC.x + Math.sin(a) * 16, z = BC.z + Math.cos(a) * 16;
    brush.push(0, H(x, z), 0, 0); B.tent(brush, x, z, a + Math.PI, tentColors[i % 4]); brush.pop();
  }
  at(BC.x, BC.z); A.campfires.push(B.campfire(brush, 0, 0, 0)); brush.pop();
  // plataforma do Corvo (torre de vigia)
  brush.push(0, H(BC.x - 9, BC.z - 10), 0, 0); B.watchtower(brush, BC.x - 9, BC.z - 10, 3.4); brush.pop();
  A.anchors.corvo = { x: BC.x - 6, z: BC.z - 6 };
  // jaula de Tomás
  const cage = { x: BC.x + 8, z: BC.z - 10 };
  at(cage.x, cage.z);
  brush.box(3, 0.2, 3, 0, 0, 0, PAL.woodDark); brush.box(3.1, 0.2, 3.1, 0, 2.6, 0, PAL.woodDark);
  for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) {
    if (k === 0 || k === 3 || i === 0 || i === 3) brush.box(0.1, 2.6, 0.1, -1.4 + i * 0.93, 0, -1.4 + k * 0.93, PAL.iron, { mat: 'metal' });
  }
  brush.pop();
  A.anchors.cage = cage;
  A.cageCollider = collision.addBox(cage.x, cage.z, 1.55, 1.55, 0, { y0: bcy - 1, y1: bcy + 3 });
  // caixotes e estandartes
  for (let i = 0; i < 8; i++) { const x = BC.x + rng.float(-12, 12), z = BC.z + rng.float(-12, 12); if (Math.hypot(x - BC.x, z - BC.z) < 5) continue; at(x, z); rng.chance(0.5) ? B.crate(brush, 0, 0, 0, rng.float(0, 3)) : B.barrel(brush, 0, 0, 0); brush.pop(); }
  for (const a of [0.86 + 0.36, 0.86 - 0.36]) {
    const x = BC.x + Math.sin(a) * 25.5, z = BC.z + Math.cos(a) * 25.5;
    at(x, z); brush.box(0.15, 5, 0.15, 0, 0, 0, PAL.woodDark); brush.box(0.05, 1.8, 1.2, 0, 3.0, 0.6, 0x141414); brush.box(0.06, 0.6, 0.6, 0, 3.7, 0.6, 0xc8c8c8, { rx: 0.7 }); brush.pop();
    A.torches.push({ x, y: H(x, z) + 2.5, z });
  }

  // ======================== LAGO E BOSQUE ========================
  const L = LOC.lake;
  // píer na margem leste
  const pierX = L.x + L.r + 6, pierZ = L.z + 6;
  const ph2 = H(pierX + 6, pierZ);
  brush.push(pierX, 1.4, pierZ, Math.PI / 2);
  brush.box(2.4, 0.25, 12, 0, 0, 0, PAL.woodLight);
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) brush.cyl(0.15, 0.15, 3, sx * 1.1, -2.6, -5 + i * 3.3, PAL.woodDark, { seg: 5 });
  brush.pop();
  collision.addPlatform(pierX, pierZ, 6, 1.2, Math.PI / 2, 1.65);
  void ph2;
  // Bosque Antigo: círculo de pedras e cabana de Thalia
  const GR = LOC.grove;
  at(GR.x, GR.z); B.stoneCircle(brush, 9, 9); brush.pop();
  const hut = { x: GR.x - 14, z: GR.z + 12 };
  at(hut.x, hut.z, faceTo(hut.x, hut.z, GR.x, GR.z));
  brush.cyl(3.2, 3.4, 2.8, 0, 0, 0, 0x7a5a3a, { seg: 9, collide: true });
  brush.cone(4.4, 3.8, 0, 2.8, 0, 0x5a7a3a, { seg: 9 });
  brush.box(1.2, 2.0, 0.2, 0, 0, 3.25, PAL.door);
  brush.pop();
  A.anchors.thalia = { x: GR.x + 2, z: GR.z + 4 };

  // ======================== TORRE DE ZÉFIRO ========================
  const HT = LOC.hermitTower;
  at(HT.x, HT.z, 0.4); B.hermitTower(brush); brush.pop();
  A.anchors.hermit = { x: HT.x + 6, z: HT.z + 3 };

  // ======================== TEMPLO DO SOL CAÍDO ========================
  const TP = LOC.temple;
  at(TP.x, TP.z, Math.PI / 2 * 0); B.temple(brush, { onDoor: (p) => (A.anchors.templeDoor = p) }); brush.pop();
  A.braziers.temple = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
    const x = TP.x + Math.cos(a) * 13.8, z = TP.z + Math.sin(a) * 13.8;
    brush.push(x, H(TP.x, TP.z), z, 0);
    A.braziers.temple.push(B.brazier(brush, 0, 0.9, 0, { color: 0x8a6a2a }));
    brush.pop();
  }
  A.templeDoorCollider = collision.addBox(TP.x - 4.3, TP.z, 0.4, 1.6, 0, { y0: H(TP.x, TP.z), y1: H(TP.x, TP.z) + 5, tag: 'templeDoor' });

  // ======================== ACAMPAMENTO DA GUARDA ========================
  const GC = LOC.guardCamp;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const x = GC.x + Math.sin(a) * 12, z = GC.z + Math.cos(a) * 12;
    brush.push(0, H(x, z), 0, 0); B.tent(brush, x, z, a + Math.PI, i === 0 ? 0x2a4a8a : 0xd8d0c0, i === 0 ? 1.4 : 1); brush.pop();
  }
  at(GC.x, GC.z); A.campfires.push(B.campfire(brush, 0, 0, 0)); brush.pop();
  for (const [dx, dz] of [[-8, -6], [8, 6]]) {
    const x = GC.x + dx, z = GC.z + dz;
    at(x, z); brush.box(0.18, 6, 0.18, 0, 0, 0, PAL.iron); brush.box(0.05, 2.4, 1.4, 0, 3.4, 0.7, PAL.blue); brush.box(0.06, 0.7, 0.7, 0, 4.4, 0.7, PAL.gold, { mat: 'metal', rx: 0.78 }); brush.pop();
  }
  at(GC.x + 7, GC.z - 4, 0.5); B.stall(brush, { seed: 9, cloth: 0x2a4a8a }); brush.pop();
  A.anchors.quartermaster = { x: GC.x + 7.5, z: GC.z - 2.2 };
  A.anchors.isoldeCamp = { x: GC.x - 3, z: GC.z + 3 };
  for (let i = 0; i < 4; i++) { const x = GC.x - 12 + i * 1.5, z = GC.z - 8; at(x, z); brush.box(0.12, 1.8, 0.12, 0, 0, 0, PAL.wood); brush.box(0.08, 1.6, 0.08, 0.2, 0, 0, 0xb8bcc4, { mat: 'metal', rz: 0.1 }); brush.pop(); }
  A.torches.push({ x: GC.x - 8, y: H(GC.x - 8, GC.z - 6) + 2.5, z: GC.z - 6 });

  // ======================== CASTELO DE VALDREN ========================
  brush.push(0, CASTLE_H, -192, 0);
  B.castle(brush, { onGate: (name, p) => (A.anchors[name === 'south' ? 'castleGateS' : 'castleGateN'] = p) });
  brush.pop();
  A.anchors.diary = { x: -20.5, z: -192 };
  A.anchors.castleYard = { x: 0, z: -180 };
  for (const [x, z] of [[-6, -158], [6, -158], [-6, -226], [6, -226]]) A.torches.push({ x, y: CASTLE_H + 3, z });
  for (const [x, z] of [[-14, -186], [14, -186], [-14, -200], [14, -200]]) { brush.push(x, CASTLE_H, z, 0); A.torches.push(B.torchPost(brush, 0, 0, 0)); brush.pop(); }

  // ======================== A FENDA ========================
  const R = LOC.rift;
  // arena final
  brush.push(0, RIFT_H, -305, 0);
  brush.cyl(26, 27, 0.8, 0, -0.6, 0, 0x241830, { seg: 24 });
  brush.cyl(18, 18, 0.06, 0, 0.21, 0, 0x7a3ab0, { seg: 24, mat: 'glow' });
  brush.cyl(17.6, 17.6, 0.08, 0, 0.22, 0, 0x241830, { seg: 24 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    brush.box(1.4, 5 + (i % 2) * 2, 1.4, Math.sin(a) * 24, 0, Math.cos(a) * 24, 0x2a2036, { ry: a, collide: true });
    brush.box(0.3, 1.6, 0.05, Math.sin(a) * 23.28, 2.4, Math.cos(a) * 23.28, 0xc070ff, { ry: a, mat: 'glow' });
  }
  brush.pop();
  collision.addPlatform(0, -305, 25.5, 25.5, 0, RIFT_H + 0.2, { thickness: 1.0 });
  A.anchors.arena = { x: 0, z: -305 };
  // cristais espalhados
  for (let i = 0; i < 45; i++) {
    const x = rng.float(-100, 100), z = rng.float(-345, -258);
    if (Math.hypot(x, z + 305) < 32 || Math.abs(x) < 7) continue;
    at(x, z); B.riftCrystals(brush, 0, 0, 0, rng, rng.float(0.8, 1.8)); brush.pop();
  }
  // trilha de pedra até a arena
  for (let z = -262; z > -278; z -= 2.5) { at(rng.float(-1, 1), z); brush.box(3.2, 0.3, 2.2, 0, -0.15, 0, 0x3a2a46, { ry: rng.float(-0.2, 0.2) }); brush.pop(); }
  A.anchors.pillars = [{ x: -62, z: -282 }, { x: 62, z: -282 }, { x: 0, z: -340 }];

  // ======================== TOCA DA PRESA-BRANCA ========================
  const AD = LOC.alphaDen;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 1.6 + 2.6;
    const x = AD.x + Math.cos(a) * 15, z = AD.z + Math.sin(a) * 15;
    at(x, z); brush.dod(rng.float(2, 3.5), 0, 0.5, 0, PAL.stoneDark, { sy: 1.4, ry: rng.float(0, 3) }); brush.pop();
    collision.addCircle(x, z, 2.4, { y0: H(x, z) - 1, y1: H(x, z) + 5 });
  }
  for (let i = 0; i < 10; i++) { at(AD.x + rng.float(-8, 8), AD.z + rng.float(-8, 8)); brush.box(0.12, 0.12, rng.float(0.6, 1.2), 0, 0.05, 0, 0xe8e0c8, { ry: rng.float(0, 3) }); brush.pop(); }

  // ======================== CAMPOS / COGUMELOS ========================
  const SF = LOC.sunfields;
  at(SF.x + 18, SF.z - 16, -0.8); B.house(brush, { seed: 88, w: 5, d: 4.5, floors: 1, roof: 'thatch', chimney: false }); brush.pop();

  // ======================== CRATERA DO COLOSSO ========================
  const CR = LOC.crater;
  // portão rúnico na entrada sudeste
  const gx = -214, gz = -232;
  const gyaw = Math.atan2(-226 + 202, -242 + 224); // direção da estrada
  at(gx, gz, gyaw);
  for (const sx of [-1, 1]) brush.box(2.2, 8, 2.2, sx * 4.8, -1, 0, PAL.stoneDark, { collide: true });
  brush.box(12, 2, 2.4, 0, 6, 0, PAL.stoneDark);
  for (const sx of [-1, 1]) brush.colBox(sx * 10, 0, 4.5, 1.0, -3, 12);
  brush.pop();
  A.anchors.craterGate = { x: gx, z: gz, yaw: gyaw };
  A.anchors.runeStones = [{ x: -190, z: -212 }, { x: -205, z: -205 }, { x: -178, z: -200 }];
  for (const r of A.anchors.runeStones) { at(r.x, r.z); brush.box(1.2, 2.6, 0.8, 0, -0.2, 0, 0x5a5a62, { collide: true }); brush.pop(); }
  A.anchors.crater = { x: CR.x, z: CR.z };

  // ======================== PEDRAS-GUIA ========================
  for (const w of WAYSTONES) {
    at(w.x, w.z); B.waystone(brush); brush.pop();
    A.waystones.push({ ...w, y: H(w.x, w.z) });
  }

  // ======================== PONTES ========================
  for (const br of T.findBridges()) {
    const len = br.riverW * 2 + 9;
    brush.push(br.x, br.h, br.z, br.yaw);
    B.bridge(brush, len, br.w * 2 + 0.6);
    brush.pop();
    collision.addPlatform(br.x, br.z, br.w + 0.3, len / 2, br.yaw, br.h);
    A.bridges.push(br);
  }

  // Tochas ao longo da estrada norte (marcos)
  for (const [x, z] of [[8, 60], [22, 5], [40, -60], [-60, 100], [-110, 66], [60, 104], [120, 62]]) {
    const y = H(x + 4, z);
    brush.push(x + 4.5, y, z, 0); A.torches.push(B.torchPost(brush, 0, 0, 0)); brush.pop();
  }

  return A;
}
