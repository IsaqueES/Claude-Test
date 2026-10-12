// Layout do reino de Valdren: locais, estradas, rio e zonas de terreno.
// Norte = -Z. Leste = +X.

export const WORLD = { half: 360, waterLevel: 1.0, seed: 1337 };

export const LOC = {
  brumavale:   { x: 0,    z: 120,  r: 48, name: 'Brumavale', desc: 'Vila natal, cercada de névoa e campos dourados.' },
  farm:        { x: 80,   z: 142,  r: 26, name: 'Fazenda de Dona Marta' },
  mill:        { x: 55,   z: 200,  r: 14, name: 'Moinho de Osmar' },
  cemetery:    { x: -62,  z: 182,  r: 18, name: 'Cemitério de Brumavale' },
  flameShrine: { x: 92,   z: 28,   r: 11, name: 'Santuário da Chama' },
  banditCamp:  { x: -150, z: 40,   r: 30, name: 'Acampamento do Corvo' },
  lake:        { x: -245, z: 8,    r: 38, name: 'Lago Espelhado' },
  grove:       { x: -262, z: 118,  r: 22, name: 'Bosque Antigo' },
  mushrooms:   { x: -115, z: 150,  r: 16, name: 'Clareira dos Cogumelos' },
  alphaDen:    { x: -175, z: -105, r: 20, name: 'Toca da Presa-Branca' },
  hermitTower: { x: -165, z: 258,  r: 14, name: 'Torre de Zéfiro' },
  sunfields:   { x: 205,  z: 140,  r: 34, name: 'Campos de Girassóis' },
  temple:      { x: 238,  z: 8,    r: 36, name: 'Templo do Sol Caído' },
  mountains:   { x: -200, z: -190, r: 60, name: 'Picos de Granito' },
  crater:      { x: -238, z: -248, r: 30, name: 'Cratera do Colosso' },
  guardCamp:   { x: 68,   z: -104, r: 22, name: 'Acampamento da Guarda' },
  castle:      { x: 0,    z: -192, r: 46, name: 'Castelo de Valdren' },
  rift:        { x: 0,    z: -300, r: 52, name: 'A Fenda' },
};

// Altura do platô do castelo e chão da Fenda.
export const CASTLE_H = 18;
export const RIFT_H = 3;

// Estradas: polilinhas [x, z]. w = meia-largura.
export const ROADS = [
  { id: 'norte', w: 3.2, pts: [[0, 112], [4, 70], [18, 15], [36, -45], [45, -92], [30, -132], [6, -150], [0, -158]] },
  { id: 'oeste', w: 3.0, pts: [[-8, 118], [-50, 104], [-100, 86], [-150, 84], [-200, 88], [-236, 104], [-258, 114]] },
  { id: 'acampamento', w: 2.4, pts: [[-100, 86], [-124, 64], [-138, 51]] },
  { id: 'leste', w: 3.0, pts: [[10, 118], [48, 108], [100, 74], [148, 48], [190, 28], [214, 16], [236, 10]] },
  { id: 'fazenda', w: 2.4, pts: [[20, 122], [52, 132], [78, 140]] },
  { id: 'sul', w: 2.6, pts: [[0, 128], [10, 165], [52, 198]] },
  { id: 'cemiterio', w: 2.4, pts: [[10, 165], [-28, 176], [-45, 181]] },
  { id: 'torre', w: 2.4, pts: [[-28, 176], [-62, 208], [-110, 233], [-158, 254]] },
  { id: 'santuario', w: 2.2, pts: [[18, 15], [55, 20], [84, 26]] },
  { id: 'montanha', w: 3.0, pts: [[45, -92], [-30, -124], [-100, -160], [-160, -196], [-202, -224], [-226, -242]] },
  { id: 'fenda', w: 3.5, pts: [[0, -224], [0, -258], [0, -282], [0, -300]] },
  { id: 'toca', w: 2.0, pts: [[-100, 86], [-112, 30], [-140, -40], [-166, -92]] },
  { id: 'campos', w: 2.2, pts: [[148, 48], [175, 95], [200, 135]] },
  { id: 'cogumelos', w: 2.0, pts: [[-50, 104], [-90, 135], [-112, 148]] },
];

// Rio: nasce aos pés da cordilheira ao nordeste e corre para o sul.
export const RIVER = {
  pts: [[215, -222], [192, -150], [168, -72], [152, 0], [146, 50], [136, 130], [100, 212], [74, 282], [62, 362]],
  w0: 4.0,
  w1: 7.5,
};

// Morros (gaussianos) somados ao relevo base.
export const BUMPS = [
  { x: 92, z: 28, r: 46, h: 13 },        // colina do Santuário da Chama
  { x: 238, z: 8, r: 80, h: 8 },         // platô do templo
  { x: 0, z: -190, r: 95, h: 9 },        // colina do castelo
  { x: -165, z: 258, r: 40, h: 9 },      // colina do eremita
  { x: 140, z: 210, r: 50, h: 4 },
  { x: -60, z: 30, r: 40, h: 4 },
];

// Zonas aplanadas. type: 'circle' | 'rect'. h pode ser número ou função (x,z)=>altura.
export const ZONES = [
  { type: 'rect', x0: -48, z0: -230, x1: 48, z1: -150, f: 7, h: CASTLE_H, tag: 'castle' },
  { type: 'rect', x0: -112, z0: -354, x1: 112, z1: -250, f: 10, h: RIFT_H, tag: 'rift', noise: 1.4 },
  { type: 'rect', x0: -13, z0: -262, x1: 13, z1: -226, f: 4, h: (x, z) => {
      const t = Math.min(1, Math.max(0, (-226 - z) / 36));
      return CASTLE_H + (RIFT_H + 1 - CASTLE_H) * t;
    }, tag: 'notch' },
  { type: 'circle', x: 0, z: -305, r: 28, f: 6, h: RIFT_H, tag: 'arena' },
  { type: 'circle', x: 0, z: 120, r: 50, f: 30, h: 5, tag: 'village' },
  { type: 'circle', x: 80, z: 142, r: 26, f: 18, h: 5.2, tag: 'farm' },
  { type: 'circle', x: 55, z: 200, r: 14, f: 12, h: 4.6 },
  { type: 'circle', x: -62, z: 182, r: 18, f: 14, h: 5.6, tag: 'cemetery' },
  { type: 'circle', x: 92, z: 28, r: 11, f: 9, h: 18.5, tag: 'shrine' },
  { type: 'circle', x: -150, z: 40, r: 30, f: 16, h: 5, tag: 'camp' },
  { type: 'circle', x: -245, z: 8, r: 34, f: 16, h: -3.2, tag: 'lake' },
  { type: 'circle', x: -262, z: 118, r: 22, f: 14, h: 5.5, tag: 'grove' },
  { type: 'circle', x: -115, z: 150, r: 16, f: 12, h: 5.8 },
  { type: 'circle', x: -175, z: -105, r: 20, f: 14, h: 9 },
  { type: 'circle', x: -165, z: 258, r: 14, f: 10, h: 14.5, tag: 'tower' },
  { type: 'circle', x: 205, z: 140, r: 34, f: 20, h: 6 },
  { type: 'circle', x: 238, z: 8, r: 38, f: 12, h: 14, tag: 'temple' },
  { type: 'circle', x: 68, z: -104, r: 22, f: 16, h: 7, tag: 'guard' },
  { type: 'circle', x: -238, z: -248, r: 30, f: 9, h: 12, tag: 'crater' },
];

export const WAYSTONES = [
  { id: 'ws_brumavale', name: 'Brumavale', x: 12, z: 108 },
  { id: 'ws_bosque', name: 'Bosque Antigo', x: -248, z: 104 },
  { id: 'ws_templo', name: 'Templo do Sol Caído', x: 200, z: 22 },
  { id: 'ws_guarda', name: 'Acampamento da Guarda', x: 50, z: -84 },
  { id: 'ws_picos', name: 'Picos de Granito', x: -150, z: -186 },
  { id: 'ws_torre', name: 'Torre de Zéfiro', x: -148, z: 246 },
];

// Região aproximada de cada nome de área (para "entrando em ..." e música).
export function regionAt(x, z) {
  const near = (l, extra = 0) => Math.hypot(x - l.x, z - l.z) < l.r + extra;
  if (z < -238 && Math.abs(x) < 125) return 'rift';
  if (x > -52 && x < 52 && z < -148 && z > -236) return 'castle';
  if (near(LOC.crater, 6)) return 'crater';
  if (near(LOC.brumavale, 14)) return 'brumavale';
  if (near(LOC.farm, 6)) return 'farm';
  if (near(LOC.temple, 10)) return 'temple';
  if (near(LOC.banditCamp, 6)) return 'banditCamp';
  if (near(LOC.guardCamp, 6)) return 'guardCamp';
  if (near(LOC.grove, 8)) return 'grove';
  if (near(LOC.lake, 14)) return 'lake';
  if (near(LOC.cemetery, 6)) return 'cemetery';
  if (near(LOC.mill, 8)) return 'mill';
  if (near(LOC.flameShrine, 14)) return 'flameShrine';
  if (near(LOC.hermitTower, 14)) return 'hermitTower';
  if (near(LOC.sunfields, 6)) return 'sunfields';
  if (near(LOC.alphaDen, 8)) return 'alphaDen';
  if (near(LOC.mushrooms, 6)) return 'mushrooms';
  if (x < -120 && z < -130) return 'mountains';
  if (x < -70) return 'forest';
  return 'wild';
}

export const REGION_NAMES = {
  rift: 'A Fenda', castle: 'Castelo de Valdren', crater: 'Cratera do Colosso', brumavale: 'Brumavale',
  farm: 'Fazenda de Dona Marta', temple: 'Templo do Sol Caído', banditCamp: 'Acampamento do Corvo',
  guardCamp: 'Acampamento da Guarda', grove: 'Bosque Antigo', lake: 'Lago Espelhado', cemetery: 'Cemitério',
  mill: 'Moinho de Osmar', flameShrine: 'Santuário da Chama', hermitTower: 'Torre de Zéfiro',
  sunfields: 'Campos de Girassóis', alphaDen: 'Toca da Presa-Branca', mushrooms: 'Clareira dos Cogumelos',
  mountains: 'Picos de Granito', forest: 'Floresta dos Sussurros', wild: 'Planícies de Valdren',
};
