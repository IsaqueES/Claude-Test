// Tipos de inimigos e zonas de surgimento.
// resist: multiplicador de dano recebido por elemento (>1 = fraqueza, <1 = resistência)

export const ENEMY_TYPES = {
  wolf: {
    name: 'Lobo Cinzento', model: 'wolf', ai: 'beast', hp: 40, dmg: 8, speed: 7.4, radius: 0.55, height: 1.0, range: 1.7,
    attack: 'bite', cd: [1.1, 1.8], xp: 16, gold: [0, 2], aggro: 17, poise: 12, resist: { fire: 1.35, psychic: 1.2 },
    loot: [['pele_lobo', 0.35]], sound: 'wolf',
  },
  alpha: {
    name: 'Presa-Branca, o Lobo Alfa', model: 'alpha', ai: 'beast', hp: 420, dmg: 17, speed: 8.2, radius: 1.0, height: 1.9, range: 2.6,
    attack: 'bite', cd: [0.9, 1.5], xp: 260, gold: [40, 60], aggro: 26, poise: 80, resist: { fire: 1.25, wind: 0.8 },
    boss: true, loot: [['presa_alfa', 1]], sound: 'wolf',
  },
  nightmare: {
    name: 'Pesadelo', model: 'nightmare', ai: 'beast', hp: 120, dmg: 16, speed: 8.6, radius: 0.85, height: 1.6, range: 2.3,
    attack: 'bite', cd: [1.0, 1.6], xp: 70, gold: [5, 12], aggro: 24, poise: 40, resist: { light: 2, shadow: 0.3, psychic: 0.7, physical: 0.85 },
    loot: [['essencia_sombria', 0.4]], dissolve: 'shadow', sound: 'growl',
  },
  bandit: {
    name: 'Bandido do Corvo', model: 'bandit', ai: 'melee', hp: 58, dmg: 10, speed: 5.6, radius: 0.42, height: 1.8, range: 1.9,
    attack: 'attack1', attack2: 'attack2', cd: [1.2, 2.0], xp: 24, gold: [3, 9], aggro: 15, poise: 18, resist: {},
    loot: [['pocao_vida', 0.15], ['pao', 0.2]], sound: 'grunt',
  },
  archer: {
    name: 'Arqueiro Bandido', model: 'archer', ai: 'ranged', hp: 44, dmg: 9, speed: 5.4, radius: 0.42, height: 1.8, range: 18,
    attack: 'shoot', cd: [1.8, 2.8], xp: 24, gold: [3, 8], aggro: 22, poise: 12, resist: {}, keepDist: [8, 16],
    loot: [['pocao_vida', 0.12]], sound: 'grunt',
  },
  skeleton: {
    name: 'Esqueleto Antigo', model: 'skeleton', ai: 'melee', hp: 52, dmg: 11, speed: 4.8, radius: 0.4, height: 1.8, range: 1.9,
    attack: 'attack1', attack2: 'attack3', cd: [1.3, 2.1], xp: 26, gold: [2, 7], aggro: 16, poise: 15,
    resist: { light: 2.0, psychic: 0.3, shadow: 0.5, toon: 1.2, earth: 1.3 }, fleshy: false, dissolve: 'bone',
    loot: [['po_osso', 0.3]], sound: 'bones',
  },
  knight: {
    name: 'Cavaleiro Oco', model: 'knight', ai: 'melee', hp: 140, dmg: 16, speed: 4.4, radius: 0.5, height: 2.0, range: 2.2,
    attack: 'attack1', attack2: 'attack3', cd: [1.4, 2.2], xp: 60, gold: [8, 18], aggro: 16, poise: 45, armor: 0.25,
    resist: { light: 1.8, lightning: 1.6, psychic: 0.3, shadow: 0.5, physical: 0.85 }, fleshy: false, dissolve: 'bone', blocks: true,
    loot: [['pocao_vida', 0.3], ['po_osso', 0.5]], sound: 'bones',
  },
  echoKnight: {
    name: 'Cavaleiro Ecoante', model: 'echoKnight', ai: 'melee', hp: 170, dmg: 19, speed: 5.0, radius: 0.5, height: 2.0, range: 2.2,
    attack: 'attack1', attack2: 'attack3', cd: [1.2, 2.0], xp: 85, gold: [10, 22], aggro: 18, poise: 50, armor: 0.2,
    resist: { light: 1.8, shadow: 0.3, psychic: 0.6 }, fleshy: false, dissolve: 'shadow',
    loot: [['essencia_sombria', 0.5], ['pocao_mana', 0.3]], sound: 'bones',
  },
  wisp: {
    name: 'Eco Sombrio', model: 'wisp', ai: 'caster', hp: 46, dmg: 9, speed: 5.0, radius: 0.5, height: 1.8, range: 14,
    attack: 'cast', melee: 'claw', cd: [2.0, 3.2], xp: 22, gold: [1, 5], aggro: 20, poise: 10, flying: true, hover: 0.6,
    resist: { light: 2.2, fire: 1.3, physical: 0.65, shadow: 0.2, psychic: 1.2 }, keepDist: [5, 11], dissolve: 'shadow',
    loot: [['essencia_sombria', 0.3]], sound: 'wisp',
  },
  doodle: {
    name: 'Rabisco', model: 'doodle', ai: 'melee', hp: 50, dmg: 9, speed: 6.0, radius: 0.45, height: 1.45, range: 1.7,
    attack: 'punch', cd: [1.0, 1.8], xp: 22, gold: [1, 6], aggro: 16, poise: 12, throwsInk: true,
    resist: { water: 2.0, toon: 0.4, psychic: 1.3, fire: 1.1 }, dissolve: 'ink', fleshy: false,
    loot: [['tinta_preta', 0.25]], sound: 'doodle',
  },
  doodleRed: {
    name: 'Rabisco Carmim', model: 'doodleRed', ai: 'melee', hp: 140, dmg: 13, speed: 6.4, radius: 0.55, height: 1.8, range: 2.0,
    attack: 'punch', cd: [0.9, 1.5], xp: 70, gold: [8, 15], aggro: 18, poise: 30, throwsInk: true,
    resist: { water: 1.8, toon: 0.4, fire: 0.6 }, dissolve: 'ink', fleshy: false, loot: [['tinta_vermelha', 1]], sound: 'doodle',
  },
  doodleYellow: {
    name: 'Rabisco Dourado', model: 'doodleYellow', ai: 'melee', hp: 150, dmg: 13, speed: 7.0, radius: 0.55, height: 1.8, range: 2.0,
    attack: 'punch', cd: [0.9, 1.5], xp: 75, gold: [8, 15], aggro: 18, poise: 30, throwsInk: true,
    resist: { water: 1.8, toon: 0.4, light: 0.6 }, dissolve: 'ink', fleshy: false, loot: [['tinta_amarela', 1]], sound: 'doodle',
  },
  doodleBlue: {
    name: 'Rabisco Anil', model: 'doodleBlue', ai: 'melee', hp: 150, dmg: 13, speed: 6.2, radius: 0.55, height: 1.8, range: 2.0,
    attack: 'punch', cd: [0.9, 1.5], xp: 75, gold: [8, 15], aggro: 18, poise: 30, throwsInk: true,
    resist: { water: 0.6, toon: 0.4, lightning: 1.8 }, dissolve: 'ink', fleshy: false, loot: [['tinta_azul', 1]], sound: 'doodle',
  },
  golem: {
    name: 'Golem de Granito', model: 'golem', ai: 'heavy', hp: 150, dmg: 20, speed: 3.4, radius: 0.8, height: 2.3, range: 3.0,
    attack: 'slam', cd: [2.2, 3.4], xp: 55, gold: [4, 12], aggro: 15, poise: 70, armor: 0.15, mass: 4,
    resist: { water: 1.6, fire: 0.5, physical: 0.75, earth: 0.3, psychic: 0.5, toon: 1.2, wind: 0.8 }, fleshy: false, dissolve: 'earth',
    loot: [['cristal_terra', 0.35]], sound: 'stone',
  },
  // ---------- Chefes ----------
  corvoBoss: {
    name: 'Corvo, o Rei dos Ladrões', model: 'corvoBoss', ai: 'boss', hp: 620, dmg: 13, speed: 7.2, radius: 0.45, height: 1.8, range: 2.1,
    cd: [0.8, 1.4], xp: 320, gold: [50, 80], aggro: 40, poise: 60, resist: {}, boss: true, sound: 'grunt',
  },
  colossus: {
    name: 'Colosso de Pedra', model: 'colossus', ai: 'boss', hp: 1350, dmg: 26, speed: 2.8, radius: 2.0, height: 6.4, range: 6,
    cd: [1.6, 2.4], xp: 650, gold: [100, 140], aggro: 60, poise: 400, armor: 0.1, mass: 60, boss: true, fleshy: false, dissolve: 'earth',
    resist: { water: 1.6, fire: 0.5, physical: 0.8, earth: 0.2, psychic: 0.6, toon: 1.1 }, sound: 'stone',
  },
  pimpolho: {
    name: 'Sir Pimpolho, o Bobo de Tinta', model: 'pimpolho', ai: 'boss', hp: 1450, dmg: 18, speed: 5.4, radius: 1.5, height: 4.6, range: 4,
    cd: [1.4, 2.2], xp: 700, gold: [80, 120], aggro: 60, poise: 300, mass: 30, boss: true, fleshy: false, dissolve: 'ink',
    resist: { water: 1.7, toon: 0.3, psychic: 1.2 }, sound: 'doodle',
  },
  vaelthor: {
    name: 'Vaelthor, o Arquimago Partido', model: 'vaelthor', ai: 'boss', hp: 2700, dmg: 21, speed: 4.2, radius: 0.6, height: 2.3, range: 30,
    cd: [1.4, 2.2], xp: 1500, gold: [0, 0], aggro: 80, poise: 500, mass: 40, boss: true, flying: true, hover: 0.9, dissolve: 'shadow',
    resist: { psychic: 0.5, shadow: 0.5, light: 1.3, rift: 0.1 }, sound: 'boss',
  },
  // ---------- Aliados ----------
  allyKnight: { name: 'Capitã Isolde', model: 'npc:isolde', ai: 'melee', hp: 520, dmg: 15, speed: 6.6, radius: 0.42, height: 1.8, range: 2.0, attack: 'attack1', attack2: 'attack3', cd: [0.9, 1.5], xp: 0, gold: [0, 0], aggro: 30, poise: 80, resist: {}, sound: 'grunt' },
  allyRogue: { name: 'Corvo', model: 'npc:corvo', ai: 'melee', hp: 420, dmg: 14, speed: 7.4, radius: 0.42, height: 1.8, range: 1.9, attack: 'stab', cd: [0.6, 1.1], xp: 0, gold: [0, 0], aggro: 30, poise: 60, resist: {}, sound: 'grunt' },
  allyJester: { name: 'Sir Pimpolho', model: 'npc:pimpolho', ai: 'melee', hp: 300, dmg: 8, speed: 6.4, radius: 0.42, height: 1.8, range: 1.8, attack: 'punch', cd: [1.0, 1.6], xp: 0, gold: [0, 0], aggro: 30, poise: 40, resist: {}, sound: 'doodle' },
};

// Zonas de surgimento persistentes. lvl = nível dos inimigos.
export const SPAWN_ZONES = [
  { id: 'z_fields', x: 55, z: 45, r: 30, types: ['wolf', 'wolf'], max: 3, lvl: 1, respawn: 90 },
  { id: 'z_shrine_path', x: 70, z: 15, r: 18, types: ['wolf', 'wolf', 'wolf'], max: 3, lvl: 2, respawn: 120 },
  { id: 'z_forest_e', x: -90, z: 30, r: 28, types: ['wolf', 'wolf', 'wisp'], max: 4, lvl: 2, respawn: 100 },
  { id: 'z_forest_s', x: -150, z: 170, r: 30, types: ['wolf', 'wisp', 'wolf'], max: 4, lvl: 3, respawn: 100 },
  { id: 'z_grove_road', x: -210, z: 80, r: 25, types: ['wisp', 'wolf', 'wisp'], max: 4, lvl: 3, respawn: 110 },
  { id: 'z_north_forest', x: -140, z: -60, r: 35, types: ['wolf', 'wolf', 'wisp', 'wolf'], max: 5, lvl: 4, respawn: 120 },
  { id: 'z_temple', x: 238, z: 8, r: 26, types: ['skeleton', 'skeleton', 'skeleton', 'archer'], max: 6, lvl: 5, respawn: 150, needFlag: null, tags: ['temple'] },
  { id: 'z_temple_road', x: 185, z: 35, r: 20, types: ['skeleton', 'wolf'], max: 3, lvl: 4, respawn: 120 },
  { id: 'z_sunfields', x: 205, z: 140, r: 28, types: ['doodle', 'doodle', 'doodle'], max: 4, lvl: 3, respawn: 100 },
  { id: 'z_mountain_road', x: -100, z: -160, r: 25, types: ['golem', 'wolf', 'wolf'], max: 4, lvl: 6, respawn: 140 },
  { id: 'z_crater_out', x: -175, z: -205, r: 18, types: ['golem', 'golem'], max: 2, lvl: 7, respawn: 160 },
  { id: 'z_guard_road', x: 30, z: -50, r: 25, types: ['wisp', 'wolf'], max: 3, lvl: 4, respawn: 120 },
  { id: 'z_east_wild', x: 240, z: 120, r: 35, types: ['wolf', 'doodle', 'wolf'], max: 3, lvl: 4, respawn: 120 },
  { id: 'z_castle_yard', x: 0, z: -185, r: 22, types: ['knight', 'wisp', 'doodle', 'skeleton'], max: 6, lvl: 8, respawn: 200, needFlag: 'castleOpen' },
  { id: 'z_rift_a', x: -55, z: -300, r: 25, types: ['nightmare', 'wisp', 'echoKnight'], max: 4, lvl: 10, respawn: 160, needFlag: 'riftOpen' },
  { id: 'z_rift_b', x: 55, z: -300, r: 25, types: ['doodle', 'wisp', 'nightmare'], max: 4, lvl: 10, respawn: 160, needFlag: 'riftOpen' },
  { id: 'z_rift_path', x: 0, z: -268, r: 14, types: ['wisp', 'wisp', 'echoKnight'], max: 3, lvl: 9, respawn: 160, needFlag: 'riftOpen' },
];
