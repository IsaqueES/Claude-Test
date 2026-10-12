// Definições de NPCs e lojas.
import { LOC } from '../world/WorldMap.js';

const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
const V = LOC.brumavale;

export function buildNPCDefs(A) {
  const an = A.anchors;
  const GC = LOC.guardCamp;
  const defs = [
    { id: 'mirela', name: 'Anciã Mirela', title: 'Vidente de Brumavale', look: 'mirela', x: 20.4, z: 137.8, yaw: face(20.4, 137.8, V.x, V.z) },
    { id: 'bram', name: 'Bram', title: 'Ferreiro', look: 'bram', x: 20.2, z: 101.2, yaw: face(20.2, 101.2, V.x, V.z) },
    { id: 'rosalina', name: 'Rosalina', title: 'Taverneira', look: 'rosalina', x: -15.6, z: 104.4, yaw: face(-15.6, 104.4, V.x, V.z) },
    { id: 'isolde', name: 'Capitã Isolde', title: 'Guarda Real', look: 'isolde', x: -12.2, z: 100.2, yaw: face(-12.2, 100.2, V.x, V.z),
      visible: (S) => S.flags.isoldeArrived && !S.flags.isoldeAtCamp && !S.flags.isoldeDied },
    { id: 'fabricio', name: 'Fabrício', title: 'Mercador', look: 'fabricio', x: an.merchant ? an.merchant.x : 6, z: an.merchant ? an.merchant.z : 126, yaw: an.merchant ? face(an.merchant.x, an.merchant.z, V.x, V.z) + Math.PI : 0 },
    { id: 'celeste', name: 'Irmã Celeste', title: 'Sacerdotisa', look: 'celeste', x: -23.6, z: 136.2, yaw: face(-23.6, 136.2, V.x, V.z) },
    { id: 'marta', name: 'Dona Marta', title: 'Fazendeira', look: 'marta', x: an.farmhouse.x, z: an.farmhouse.z, yaw: face(an.farmhouse.x, an.farmhouse.z, V.x, V.z) },
    { id: 'osmar', name: 'Osmar', title: 'Moleiro', look: 'osmar', x: an.mill.x + 2, z: an.mill.z + 1, yaw: face(an.mill.x, an.mill.z, V.x, V.z) },
    { id: 'gareth', name: 'Gareth', title: 'Caçador', look: 'gareth', x: 11, z: 84, yaw: Math.PI * 0.95 },
    { id: 'pipo', name: 'Pipo', title: 'Criança', look: 'kid', scale: 0.62, x: 5, z: 113, wander: 6, walkSpeed: 2.4, dialogue: 'criancas' },
    { id: 'nina', name: 'Nina', title: 'Criança', look: 'kidF', scale: 0.6, x: -4, z: 115, wander: 6, walkSpeed: 2.4, dialogue: 'criancas' },
    { id: 'aldeao1', name: 'Joaquim', title: 'Aldeão', look: 'villagerM', x: 12, z: 129, wander: 9, dialogue: 'aldeao', lookOverrides: { shirt: 0x6a7a4a, beard: true } },
    { id: 'aldeao2', name: 'Beatriz', title: 'Aldeã', look: 'villagerF', x: -10, z: 108, wander: 8, dialogue: 'aldeao' },
    { id: 'aldeao3', name: 'Severino', title: 'Aldeão', look: 'villagerM', x: 30, z: 122, wander: 7, dialogue: 'aldeao', lookOverrides: { shirt: 0x7a4a3a, hair: 0x9a9a9a, hat: 'straw', hatColor: 0xc8b070 } },
    { id: 'aldeao4', name: 'Clara', title: 'Aldeã', look: 'villagerF', x: -24, z: 120, wander: 7, dialogue: 'aldeao', lookOverrides: { shirt: 0x3a6a8a, robe: 0x2a4a6a, hair: 0x2a1a10 } },
    // Acampamento da Guarda
    { id: 'isolde_camp', name: 'Capitã Isolde', title: 'Guarda Real', look: 'isolde', dialogue: 'isolde', x: an.isoldeCamp.x, z: an.isoldeCamp.z, yaw: Math.PI,
      visible: (S) => S.flags.isoldeAtCamp && !S.flags.isoldeInCastle && !S.flags.isoldeDied },
    { id: 'isolde_castle', name: 'Capitã Isolde', title: 'Guarda Real', look: 'isolde', dialogue: 'isolde', x: 4, z: -176, yaw: Math.PI,
      visible: (S) => S.flags.isoldeInCastle && !S.flags.isoldeDied && !S.flags.isoldeInBattle },
    { id: 'bento', name: 'Sargento Bento', title: 'Intendente', look: 'guard', x: an.quartermaster.x, z: an.quartermaster.z, yaw: face(an.quartermaster.x, an.quartermaster.z, GC.x, GC.z), lookOverrides: { hat: 'helmet', beard: true } },
    { id: 'guarda1', name: 'Guarda Ronaldo', title: 'Guarda Real', look: 'guard', dialogue: 'guarda', x: GC.x + 9, z: GC.z + 9, yaw: Math.PI * 0.8 },
    { id: 'guarda2', name: 'Guarda Lúcia', title: 'Guarda Real', look: 'guard', dialogue: 'guarda', x: GC.x - 11, z: GC.z + 2, yaw: -Math.PI / 2, lookOverrides: { female: true, hair: 0x8a2a1a } },
    // Floresta e acampamento do Corvo
    { id: 'corvo', name: 'Corvo', title: 'Rei dos Ladrões', look: 'corvo', x: an.corvo.x, z: an.corvo.z, yaw: Math.PI * 0.25,
      visible: (S) => !S.flags.corvoFate && !S.flags.corvoFighting },
    { id: 'corvo_aliado', name: 'Corvo', title: 'Aliado', look: 'corvo', dialogue: 'corvo', x: LOC.guardCamp.x + 4, z: LOC.guardCamp.z - 9, yaw: Math.PI,
      visible: (S) => (S.flags.corvoFate === 'ally' || S.flags.corvoFate === 'respect') && !S.flags.corvoInBattle },
    { id: 'tomas', name: 'Tomás', title: 'Prisioneiro', look: 'tomas', x: an.cage.x, z: an.cage.z, yaw: Math.PI * 1.2,
      visible: (S) => !S.flags.tomasFree },
    { id: 'tomas_casa', name: 'Tomás', title: 'Aprendiz de Ferreiro', look: 'tomas', dialogue: 'tomas', x: 23.5, z: 102.6, yaw: Math.PI * 1.25,
      visible: (S) => S.flags.tomasFree },
    { id: 'bandido1', name: 'Bandido Gaspar', title: 'Bando do Corvo', model: 'enemy', enemyModel: 'bandit', dialogue: 'bandidos', x: LOC.banditCamp.x + 4, z: LOC.banditCamp.z + 3, yaw: -2,
      visible: (S) => !S.flags.banditsHostile && !S.flags.campCleared },
    { id: 'bandido2', name: 'Bandida Mirtes', title: 'Bando do Corvo', model: 'enemy', enemyModel: 'archer', dialogue: 'bandidos', x: LOC.banditCamp.x - 3, z: LOC.banditCamp.z + 5, yaw: 2,
      visible: (S) => !S.flags.banditsHostile && !S.flags.campCleared },
    { id: 'thalia', name: 'Thalia', title: 'Druida do Bosque', look: 'thalia', x: an.thalia.x, z: an.thalia.z, yaw: Math.PI * 0.3 },
    { id: 'espirito', name: 'Ondina', title: 'Espírito do Lago', look: 'ghost', ghost: true, float: 0.6, big: false, x: LOC.lake.x + LOC.lake.r - 2, z: LOC.lake.z + 6, yaw: Math.PI / 2,
      lookOverrides: { robe: 0x6ac8ff, shirt: 0x6ac8ff, sleeves: 0x6ac8ff, hair: 0xa0e8ff, skin: 0x9ad8ff },
      visible: (S) => S.flags.spiritVisible },
    { id: 'zefiro', name: 'Zéfiro', title: 'Eremita do Vento', look: 'zefiro', x: an.hermit.x, z: an.hermit.z, yaw: -Math.PI / 3 },
    { id: 'tico', name: 'Tico', title: 'Rabisco Amigo', model: 'tico', x: -46, z: 153, yaw: Math.PI * 0.6, wander: 3, walkSpeed: 1.8,
      visible: (S) => !S.flags.ticoColorful },
    { id: 'tico_cor', name: 'Tico', title: 'Rabisco Colorido', model: 'tico', colorful: true, dialogue: 'tico', x: 6, z: 124, yaw: 0, wander: 5, walkSpeed: 2,
      visible: (S) => S.flags.ticoColorful },
    { id: 'helena', name: 'Helena', title: 'Fantasma', look: 'ghost', ghost: true, float: 0.3, x: an.mill.x - 3, z: an.mill.z + 6, yaw: 0,
      visible: (S) => S.isNight() && S.q.isActive('sq_moinho') && S.q.pastStage('sq_moinho', 'start') && !S.flags.helenaFate },
    { id: 'dente', name: 'Dente-de-Ferro', title: 'Tenente do Corvo', model: 'enemy', enemyModel: 'bandit', x: -3, z: 104, yaw: face(-3, 104, V.x, V.z),
      visible: (S) => S.q.atStage('mq2', 'bandits') && !S.flags.denteResolved },
    { id: 'pimpolho_npc', name: 'Sir Pimpolho', title: 'Bobo da Corte', look: 'pimpolho', x: 8, z: -182, yaw: Math.PI, wander: 3,
      visible: (S) => S.flags.pimpolhoFate === 'spared' && !S.flags.pimpolhoInBattle },
    { id: 'vaelthor_npc', name: 'Vaelthor', title: 'Arquimago Partido', look: 'vaelthor', x: 0, z: -312, yaw: 0, float: 0.4,
      visible: (S) => S.q.atStage('mq6', 'confront') && !S.flags.vaelthorFight },
  ];
  return defs;
}

// Visual do bobo (pequeno) — registrado dinamicamente em Models.NPC_LOOKS
export const EXTRA_LOOKS = {
  pimpolho: { skin: 0xf0d0b8, hair: 0x2a1a10, shirt: 0x7a2ac8, sleeves: 0xe8c020, pants: 0x7a2ac8, boots: 0xe8c020, hat: 'jester', mantle: 0xe8c020, belt: 0x2a1a10 },
};

export const SHOPS = {
  fabricio: {
    name: 'Bazar de Fabrício',
    items: (S) => ['pocao_vida', 'pocao_mana', 'tonico_vigor', 'couro', 'colar_presas', ...(S.q.isDone('mq3') ? ['elixir', 'cota_malha'] : [])],
  },
  bram: {
    name: 'Forja de Bram',
    items: (S) => ['espada_ferro', 'couro', ...(S.q.isDone('mq2') ? ['cota_malha'] : [])],
  },
  rosalina: { name: 'Taverna O Javali Dourado', items: () => ['pao', 'queijo', 'pocao_vida', 'tonico_vigor'] },
  celeste: { name: 'Capela de Brumavale', items: () => ['pocao_vida', 'pocao_mana', 'elixir'] },
  bento: {
    name: 'Intendência da Guarda Real',
    items: (S) => ['pocao_vida', 'pocao_mana', 'elixir', 'cota_malha', 'tonico_vigor', ...(S.q.isDone('mq5') ? ['espada_valdren'] : [])],
  },
};
