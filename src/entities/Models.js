// Predefinições de modelos: jogador, NPCs, inimigos e chefes.
import * as THREE from 'three';
import { buildHumanoid, buildQuadruped, buildWisp, buildDoodle, buildGolem, makeSword, makeShield, makeStaff, makeDagger, makeClub, makeSpear, makeBow, makeCape } from './Rig.js';
import { HumanoidAnimator, QuadAnimator, WispAnimator } from './Animator.js';

export const SKIN_TONES = [0xf2d0b0, 0xe0b090, 0xc08a60, 0x9a6a44, 0x6a4430];
export const HAIR_COLORS = [0x2a1a10, 0x5a3a22, 0xa8742a, 0xd8c070, 0x8a2a1a, 0xe8e8e8, 0x3a3a6a];
export const CAPE_COLORS = [0x7a1a1a, 0x1a3a7a, 0x2a5a2a, 0x4a2a6a, 0x2a2a2a, 0x8a6a2a];
export const OUTFIT_COLORS = [0x5a3a2a, 0x2a4a6a, 0x3a5a3a, 0x6a3a5a, 0x5a5a5a];
export const HAIR_STYLES_M = ['short', 'wild', 'bald', 'ponytail'];
export const HAIR_STYLES_F = ['long', 'ponytail', 'bun', 'short'];

// Visual da armadura por nível
const ARMOR_LOOK = {
  tunica: (o) => ({ shirt: o, sleeves: o, pants: 0x4a3a2a, boots: 0x3a2a1a }),
  couro: () => ({ shirt: 0x6a4a2a, sleeves: 0x5a3a22, pants: 0x3a2a1a, boots: 0x2a1a10, bracers: 0x4a3018, mantle: 0x5a3a22 }),
  manto_lobo: () => ({ shirt: 0x6a5a4a, sleeves: 0x5a4a3a, pants: 0x3a3028, boots: 0x2a2018, mantle: 0xe8e4dc, bracers: 0x4a3a2a }),
  cota_malha: (o) => ({ shirt: 0x8a8c94, sleeves: 0x7a7c84, pants: 0x3a3a40, boots: 0x2a2a2a, tabard: o, bracers: 0x6a6c74 }),
  placas_valdren: () => ({ shirt: 0xb8bcc8, sleeves: 0xa8acb8, pants: 0x5a5c64, boots: 0x6a6c74, armor: 0xd0d4dc, tabard: 0x1a3a7a, bracers: 0xc8a040, metalness: 0.45, roughness: 0.45 }),
};

export function buildPlayerModel(app, equip = {}) {
  const fem = app.gender === 'f';
  const armorId = equip.armor || 'tunica';
  const look = (ARMOR_LOOK[armorId] || ARMOR_LOOK.tunica)(OUTFIT_COLORS[app.outfit ?? 0]);
  const built = buildHumanoid({
    female: fem,
    skin: SKIN_TONES[app.skin ?? 1],
    hair: HAIR_COLORS[app.hairColor ?? 1],
    hairStyle: app.hairStyle || (fem ? 'long' : 'short'),
    beard: app.beard ? true : false,
    belt: 0x2a1a10,
    ...look,
  });
  const anim = new HumanoidAnimator(built);
  const weapon = makeSwordFor(equip.weapon || 'espada_gasta');
  built.bones.handR.add(weapon);
  weapon.position.set(0, -0.06, 0.02);
  weapon.rotation.x = 0.35;
  const shield = makeShield({ color: CAPE_COLORS[app.cape ?? 0] });
  built.bones.elbowL.add(shield);
  shield.position.set(0.08, -0.15, 0.02);
  shield.rotation.set(0, 0, 0);
  const cape = makeCape(CAPE_COLORS[app.cape ?? 0], fem ? 0.42 : 0.48, 1.05);
  built.bones.chest.add(cape);
  cape.position.set(0, 0.3, -0.13);
  return { built, anim, weapon, shield, cape };
}

export function makeSwordFor(id) {
  switch (id) {
    case 'espada_ferro': return makeSword({ length: 0.95, blade: 0xd0d4dc, guard: 0x5a5a62 });
    case 'lamina_bram': return makeSword({ length: 1.0, blade: 0xe0e4ec, guard: 0xb08a3a });
    case 'presas_corvo': return makeSword({ length: 0.85, blade: 0x3a3a44, guard: 0x1a1a1a });
    case 'espada_valdren': return makeSword({ length: 1.1, blade: 0xe8ecf4, guard: 0xd8b040 });
    case 'lamina_aurora': return makeSword({ length: 1.15, blade: 0xfff0c0, guard: 0xffd060, glow: 0xffb030 });
    case 'lamina_sombria': return makeSword({ length: 1.05, blade: 0x2a1a3a, guard: 0x6a2a9a, glow: 0x6a20c0 });
    default: return makeSword({ length: 0.9, blade: 0xa8a49c, guard: 0x6a4a2a });
  }
}

// ---------------- NPCs ----------------
export const NPC_LOOKS = {
  mirela: { female: true, skin: 0xe8c0a0, hair: 0xe8e8e8, hairStyle: 'bun', robe: 0x4a3a6a, shirt: 0x4a3a6a, sleeves: 0x4a3a6a, belt: 0xc8a040, mantle: 0x6a5a8a, staff: true, style: 'mage' },
  bram: { skin: 0xc08a60, hair: 0x2a1a10, hairStyle: 'bald', beard: 0x3a2a1a, longBeard: false, bulk: 1.25, shirt: 0x8a6a4a, sleeves: 0x8a6a4a, bareArms: true, apron: 0x3a2a1a, pants: 0x3a2a1a, hammer: true },
  rosalina: { female: true, skin: 0xf0c8a8, hair: 0x8a2a1a, hairStyle: 'bun', shirt: 0xe8d8b8, sleeves: 0xe8d8b8, robe: 0x7a3a2a, robeLen: 0.8, apron: 0xf0e8d8, bulk: 1.1 },
  isolde: { female: true, skin: 0xe0b090, hair: 0xd8c070, hairStyle: 'ponytail', armor: 0xc8ccd8, shirt: 0x8a8c94, sleeves: 0x7a7c84, pants: 0x3a3a40, boots: 0x4a4a52, tabard: 0x1a3a7a, bracers: 0xc8a040, sword: 'espada_valdren', shield: 0x1a3a7a, metalness: 0.4, roughness: 0.5 },
  corvo: { skin: 0xd0a080, hair: 0x111111, hairStyle: 'wild', shirt: 0x1a1a1a, sleeves: 0x222222, pants: 0x1a1a1a, boots: 0x111111, mantle: 0x0a0a0a, hat: 'hood', hatColor: 0x141414, mask: 0x2a2a2a, beak: 0x3a3a3a, daggers: true, bracers: 0x3a2a2a },
  thalia: { female: true, skin: 0xc8946a, hair: 0x2a4a1a, hairStyle: 'long', robe: 0x3a5a2a, shirt: 0x4a6a3a, sleeves: 0x4a6a3a, hat: 'antlers', belt: 0x5a3a1a, staff: 'druid', style: 'mage' },
  zefiro: { skin: 0xe8c8a8, hair: 0xe8e8f0, hairStyle: 'wild', beard: 0xf0f0f8, longBeard: true, robe: 0x2a3a7a, shirt: 0x2a3a7a, sleeves: 0x2a3a7a, hat: 'wizard', hatColor: 0x2a3a7a, staff: 'wind', style: 'mage' },
  celeste: { female: true, skin: 0xf2d0b0, hair: 0x5a3a22, hairStyle: 'hood', hat: 'hood', hatColor: 0xf0ece0, robe: 0xf0ece0, shirt: 0xf0ece0, sleeves: 0xf0ece0, belt: 0xc8a040, style: 'mage' },
  osmar: { skin: 0xe0b090, hair: 0x8a8a8a, hairStyle: 'short', beard: 0x9a9a9a, shirt: 0xc8b890, sleeves: 0xc8b890, pants: 0x5a4a3a, hat: 'cap', hatColor: 0xb8a880, bulk: 1.05 },
  marta: { female: true, skin: 0xd8a880, hair: 0x6a4a2a, hairStyle: 'bun', shirt: 0x6a8a4a, sleeves: 0xe8e0c8, robe: 0x5a4a2a, robeLen: 0.78, apron: 0xe8e0c8, hat: 'straw', hatColor: 0xd8c070 },
  fabricio: { skin: 0xc8946a, hair: 0x2a1a10, hairStyle: 'short', beard: true, shirt: 0x8a2a5a, sleeves: 0xd8b040, pants: 0x3a2a5a, hat: 'cap', hatColor: 0x6a1a3a, feather: 0xf0d040, bulk: 1.1 },
  gareth: { skin: 0xd0a080, hair: 0x6a4a2a, hairStyle: 'short', beard: true, shirt: 0x4a5a2a, sleeves: 0x4a3a22, pants: 0x3a3022, mantle: 0x6a5a40, hat: 'hood', hatColor: 0x3a4a22, bow: true },
  tomas: { skin: 0xc08a60, hair: 0x2a1a10, hairStyle: 'short', shirt: 0x6a6a5a, sleeves: 0x6a6a5a, pants: 0x4a4a3a },
  guard: { skin: 0xe0b090, hair: 0x5a3a22, armor: 0xa8acb8, shirt: 0x7a7c84, sleeves: 0x6a6c74, pants: 0x3a3a40, boots: 0x3a3a3a, tabard: 0x1a3a7a, hat: 'helmet', hatColor: 0x9a9ca8, spear: true, metalness: 0.35 },
  villagerM: { skin: 0xe0b090, hair: 0x5a3a22, shirt: 0x7a6a4a, pants: 0x4a3a2a },
  villagerF: { female: true, skin: 0xf0c8a8, hair: 0xa8742a, shirt: 0x8a5a6a, robe: 0x5a4a6a, robeLen: 0.8 },
  kid: { skin: 0xf0c8a8, hair: 0xa8742a, shirt: 0xc84a3a, pants: 0x3a4a6a, scale: 0.62, headR: 0.17 },
  kidF: { female: true, skin: 0xe0b090, hair: 0x2a1a10, hairStyle: 'ponytail', shirt: 0x4a8ac8, robe: 0xd8b040, robeLen: 0.55, scale: 0.6, headR: 0.17 },
  vaelthor: { skin: 0xc8b8a8, hair: 0x1a1a24, hairStyle: 'long', beard: 0x2a2a34, longBeard: true, robe: 0x1a1030, shirt: 0x2a1a4a, sleeves: 0x2a1a4a, mantle: 0x4a2a7a, belt: 0x8a6a2a, hat: 'crown', staff: 'rift', style: 'mage', eyes: 0xc070ff, eyeGlow: true },
  lyra: { female: true, skin: 0xf6dcc8, hair: 0xe8d8a0, hairStyle: 'long', robe: 0xd8e8ff, shirt: 0xd8e8ff, sleeves: 0xd8e8ff, scale: 0.7, headR: 0.17, eyes: 0x80c0ff, eyeGlow: true },
  ghost: { female: true, skin: 0xb8d8f0, hair: 0xd0e8ff, hairStyle: 'long', robe: 0xc0dcf8, shirt: 0xc0dcf8, sleeves: 0xc0dcf8, eyes: 0xa0e0ff, eyeGlow: true },
  pimpolho: { skin: 0xf0d0b8, hair: 0x2a1a10, shirt: 0x7a2ac8, sleeves: 0xe8c020, pants: 0x7a2ac8, boots: 0xe8c020, hat: 'jester', mantle: 0xe8c020, belt: 0x2a1a10 },
};

export function buildNPCModel(key, overrides = {}) {
  const def = { ...(NPC_LOOKS[key] || NPC_LOOKS.villagerM), ...overrides };
  const built = buildHumanoid(def);
  const anim = new HumanoidAnimator(built, { style: def.style });
  const props = {};
  if (def.staff) {
    const gem = def.staff === 'druid' ? 0x6aff8a : def.staff === 'wind' ? 0x8ad8ff : def.staff === 'rift' ? 0xb050ff : 0xffd080;
    const st = makeStaff({ gem, wood: def.staff === 'rift' ? 0x1a1024 : 0x5a3a22 });
    built.bones.handR.add(st);
    st.rotation.x = -0.56;
    st.position.set(0, -0.05, 0);
    props.staff = st;
  }
  if (def.sword) { const sw = makeSwordFor(def.sword); built.bones.handR.add(sw); sw.position.set(0, -0.06, 0.02); sw.rotation.x = 0.35; props.weapon = sw; }
  if (def.shield) { const sh = makeShield({ color: def.shield }); built.bones.elbowL.add(sh); sh.position.set(0.08, -0.15, 0.02); props.shield = sh; }
  if (def.spear) { const sp = makeSpear(); built.bones.handR.add(sp); sp.rotation.x = -Math.PI / 2 + 0.1; sp.position.set(0, -0.05, -0.4); props.weapon = sp; }
  if (def.daggers) {
    const d1 = makeDagger(), d2 = makeDagger();
    built.bones.handR.add(d1); built.bones.handL.add(d2);
    d1.position.set(0, -0.06, 0.02); d2.position.set(0, -0.06, 0.02);
    props.weapon = d1;
  }
  if (def.hammer) {
    const g = new THREE.Group();
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 5), new THREE.MeshStandardMaterial({ color: 0x5a3a22, flatShading: true }));
    h.rotation.x = Math.PI / 2; h.position.z = 0.2;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x3a3a40, metalness: 0.6, roughness: 0.4, flatShading: true }));
    head.position.z = 0.42;
    g.add(h, head);
    built.bones.handR.add(g);
    g.position.set(0, -0.06, 0);
    props.weapon = g;
  }
  if (def.bow) { const b = makeBow(); built.bones.handL.add(b); b.position.set(0, -0.06, 0); props.bow = b; }
  if (def.scale) built.mesh.scale.setScalar(def.scale);
  return { built, anim, props, def };
}

// ---------------- Inimigos ----------------
export function buildEnemyModel(kind) {
  switch (kind) {
    case 'wolf': {
      const built = buildQuadruped({ fur: 0x6a645c, dark: 0x3a3632, belly: 0xa89c8c });
      return { built, anim: new QuadAnimator(built), quad: true };
    }
    case 'alpha': {
      const built = buildQuadruped({ scale: 1.9, fur: 0xe8e8ec, dark: 0xb8b8c4, belly: 0xffffff, eyes: 0x80d0ff, eyeGlow: true, tailTip: 0xffffff });
      return { built, anim: new QuadAnimator(built), quad: true };
    }
    case 'nightmare': {
      const built = buildQuadruped({ scale: 1.6, fur: 0x1a1024, dark: 0x0a0610, belly: 0x2a1a3a, eyes: 0xd060ff, eyeGlow: true, tailTip: 0x6a2a9a });
      return { built, anim: new QuadAnimator(built), quad: true };
    }
    case 'bandit': {
      const built = buildHumanoid({ skin: 0xd0a080, hair: 0x3a2a1a, hairStyle: 'short', shirt: 0x5a4a32, sleeves: 0x4a3a2a, pants: 0x3a3020, boots: 0x2a2010, hat: 'hood', hatColor: 0x4a3a22, mask: 0x3a2a1a, bracers: 0x3a2a1a });
      const anim = new HumanoidAnimator(built);
      const w = Math.random() < 0.5 ? makeClub() : makeSwordFor('espada_ferro');
      built.bones.handR.add(w); w.position.set(0, -0.06, 0.02); w.rotation.x = 0.35;
      return { built, anim };
    }
    case 'archer': {
      const built = buildHumanoid({ skin: 0xe0b090, hair: 0x5a3a22, shirt: 0x3a4a2a, sleeves: 0x3a3a22, pants: 0x2a2a1a, hat: 'bandana', hatColor: 0x6a1a1a, mask: 0x2a2a1a });
      const anim = new HumanoidAnimator(built);
      const b = makeBow(); built.bones.handL.add(b); b.position.set(0, -0.06, 0);
      return { built, anim };
    }
    case 'skeleton': {
      const built = buildHumanoid({ skeleton: true });
      const anim = new HumanoidAnimator(built, { style: 'skeleton' });
      const w = makeSwordFor('espada_gasta'); built.bones.handR.add(w); w.position.set(0, -0.06, 0.02); w.rotation.x = 0.35;
      return { built, anim };
    }
    case 'knight': {
      const built = buildHumanoid({ skeleton: true, armor: 0x5a5c64, hat: 'helmet', hatColor: 0x4a4c54, plume: 0x6a1a1a, eyes: 0xff5030 });
      const anim = new HumanoidAnimator(built, { style: 'skeleton' });
      const w = makeSwordFor('espada_valdren'); built.bones.handR.add(w); w.position.set(0, -0.06, 0.02); w.rotation.x = 0.35;
      const sh = makeShield({ color: 0x2a2a30, boss: 0x6a1a1a }); built.bones.elbowL.add(sh); sh.position.set(0.06, -0.15, 0.02);
      built.mesh.scale.setScalar(1.15);
      return { built, anim };
    }
    case 'wisp': {
      const built = buildWisp({});
      return { built, anim: new WispAnimator(built), float: true };
    }
    case 'doodle':
    case 'doodleRed':
    case 'doodleYellow':
    case 'doodleBlue': {
      const paint = { doodleRed: 0xe83a2a, doodleYellow: 0xf0c020, doodleBlue: 0x2a6ae8 }[kind];
      // os Rabiscos coloridos ficam tingidos com a tinta roubada (reconhecíveis de qualquer ângulo)
      const body = paint ? new THREE.Color(paint).lerp(new THREE.Color(0xffffff), 0.45).getHex() : 0xffffff;
      const built = buildDoodle({ body, accent: 0x222222, paint, hat: paint, shoes: paint ?? 0xd83a3a, scale: paint ? 1.25 : 1 });
      return { built, anim: new HumanoidAnimator(built, { style: 'doodle' }), toon: true };
    }
    case 'golem': {
      const built = buildGolem({ scale: 0.75, moss: true });
      return { built, anim: new HumanoidAnimator(built, { style: 'heavy', speedMul: 0.7 }) };
    }
    case 'colossus': {
      const built = buildGolem({ scale: 2.2, rock: 0x7e786e, rock2: 0x5c5850, glow: 0xff7a20, moss: true });
      return { built, anim: new HumanoidAnimator(built, { style: 'heavy', speedMul: 0.45 }) };
    }
    case 'pimpolho': {
      const built = buildDoodle({
        scale: 3.2, body: 0xf8f4ec, accent: 0x1a1a1a, shoes: 0x7a2ac8,
        extra: (R, s) => {
          // chapéu de bobo da corte
          for (let i = -1; i <= 1; i++) {
            R.part('head', new THREE.ConeGeometry(0.09 * s, 0.42 * s, 8), i === 0 ? 0x7a2ac8 : 0xe8c020, { x: i * 0.16 * s, y: 0.58 * s, rz: -i * 0.85 });
            R.part('head', new THREE.SphereGeometry(0.05 * s, 8, 6), 0xffe040, { x: i * 0.36 * s, y: 0.62 * s - Math.abs(i) * 0.14 * s });
          }
          R.part('chest', new THREE.TorusGeometry(0.3 * s, 0.05 * s, 6, 14), 0xe8c020, { y: 0.18 * s, rx: Math.PI / 2 });
          // listras
          R.part('chest', new THREE.SphereGeometry(0.35 * s, 12, 10, 0, Math.PI, 0, Math.PI), 0x7a2ac8, { y: -0.08 * s, sy: 1.15, ry: Math.PI / 2 });
        },
      });
      return { built, anim: new HumanoidAnimator(built, { style: 'doodle', speedMul: 0.6 }), toon: true };
    }
    case 'corvoBoss': {
      const m = buildNPCModel('corvo');
      return { built: m.built, anim: m.anim };
    }
    case 'vaelthor': {
      const m = buildNPCModel('vaelthor');
      m.built.mesh.scale.setScalar(1.25);
      return { built: m.built, anim: m.anim, props: m.props };
    }
    case 'echoKnight': {
      const built = buildHumanoid({ skeleton: true, armor: 0x2a1a3a, hat: 'helmet', hatColor: 0x1a1024, eyes: 0xc060ff, boneColor: 0x3a2a4a });
      const anim = new HumanoidAnimator(built, { style: 'skeleton' });
      const w = makeSwordFor('lamina_sombria'); built.bones.handR.add(w); w.position.set(0, -0.06, 0.02); w.rotation.x = 0.35;
      return { built, anim };
    }
    default: {
      const built = buildHumanoid({});
      return { built, anim: new HumanoidAnimator(built) };
    }
  }
}

// Ovelha (para a missão das ovelhas)
export function buildSheep() {
  const built = buildQuadruped({
    scale: 0.85, fur: 0xf0ece4, dark: 0x2a2a2a, belly: 0xe8e4dc, eyes: 0x111111, tailTip: 0xf0ece4,
    extra: (R, s) => {
      R.part('body', new THREE.IcosahedronGeometry(0.33 * s, 1), 0xf8f4ec, { sy: 0.85, sz: 1.3, jitter: 0.03, seed: 2 });
      R.part('head', new THREE.IcosahedronGeometry(0.13 * s, 1), 0xf8f4ec, { y: 0.1 * s, z: -0.02 });
    },
  });
  return { built, anim: new QuadAnimator(built), quad: true };
}
