// Missões principais e secundárias.
// Cada estágio: { id, text, objectives: [...], marker, onStart(S), setup(S, restoring), onComplete(S) }
// setup deve ser idempotente (é chamado ao entrar no estágio e ao carregar um save).
import { LOC } from '../world/WorldMap.js';

const ring = (cx, cz, r, n, a0 = 0) => [...Array(n)].map((_, i) => { const a = a0 + (i / n) * Math.PI * 2; return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r }; });

export const QUESTS = {
  // ======================================================================
  // ATO I — BRUMAVALE
  // ======================================================================
  mq1: {
    type: 'main', title: 'Marcado pelo Aether', giver: 'Anciã Mirela',
    summary: 'Um ano após a Noite do Eclipse, a cicatriz em forma de estrela na sua mão começou a brilhar. A Anciã Mirela quer vê-l{o|a}.',
    rewards: { xp: 120, gold: 20 },
    stages: [
      { id: 'talk_mirela', text: 'Fale com a Anciã Mirela, perto da praça', objectives: [{ type: 'talk', npc: 'mirela' }], auto: false },
      { id: 'get_sword', text: 'Fale com Bram, o ferreiro, sobre a espada do seu pai', objectives: [{ type: 'talk', npc: 'bram' }], auto: false },
      {
        id: 'farm', text: 'Expulse os Ecos da fazenda de Dona Marta, a leste',
        objectives: [{ type: 'kill', tag: 'mq1farm', count: 5, label: 'Ecos derrotados' }],
        marker: { x: LOC.farm.x + 6, z: LOC.farm.z + 6 },
        setup(S) {
          const left = 5 - S.progress('mq1', 0) - S.countAlive('mq1farm');
          const pts = ring(LOC.farm.x + 6, LOC.farm.z + 4, 7, 5);
          for (let i = 0; i < left; i++) S.spawn(i < 3 ? 'wisp' : 'doodle', { x: pts[i].x, z: pts[i].z, level: 1, tags: ['mq1farm'], hpMul: 0.7, dmgMul: 0.6, leash: 60, aggro: 22 });
        },
        onComplete(S) { S.set('farmSaved'); },
      },
      { id: 'return', text: 'Volte e conte à Anciã Mirela o que aconteceu', objectives: [{ type: 'talk', npc: 'mirela' }], auto: false },
    ],
    onComplete(S) { S.start('mq2'); },
  },

  mq2: {
    type: 'main', title: 'A Chama Adormecida', giver: 'Anciã Mirela',
    summary: 'Mirela acredita que a marca é um fragmento do Coração de Aether. Se for verdade, a chama eterna do Santuário da Chama vai reconhecê-la.',
    rewards: { xp: 220, gold: 40 },
    stages: [
      { id: 'go', text: 'Vá ao Santuário da Chama, nas colinas a nordeste da vila', objectives: [{ type: 'reach', x: LOC.flameShrine.x, z: LOC.flameShrine.z, r: 13 }], marker: { x: LOC.flameShrine.x, z: LOC.flameShrine.z } },
      {
        id: 'light', text: 'Toque o braseiro do santuário com a mão marcada',
        objectives: [{ type: 'interact', id: 'braseiro_chama' }], marker: { interact: 'braseiro_chama' },
        setup(S) {
          const b = S.A.braziers.flame;
          if (!S.hasInteractable('braseiro_chama')) S.interactable({ id: 'braseiro_chama', pos: { x: b.x, y: b.y - 1.2, z: b.z }, radius: 3.5, prompt: 'Tocar o braseiro apagado',
            onInteract: () => S.flameShrineVision() });
        },
      },
      {
        id: 'defend', text: 'Derrote os Ecos atraídos pela chama (use o poder de Fogo: tecla 1)',
        objectives: [{ type: 'kill', tag: 'mq2shrine', count: 4, label: 'Ecos derrotados' }],
        setup(S) {
          const left = 4 - S.progress('mq2', 0) - S.countAlive('mq2shrine');
          const pts = ring(LOC.flameShrine.x, LOC.flameShrine.z, 9, 4, 0.3);
          for (let i = 0; i < left; i++) S.spawn('wisp', { x: pts[i].x, z: pts[i].z, level: 2, tags: ['mq2shrine'], leash: 60, aggro: 30 });
        },
      },
      { id: 'back', text: 'Volte a Brumavale', objectives: [{ type: 'reach', x: LOC.brumavale.x, z: LOC.brumavale.z, r: 40 }], marker: { x: 0, z: 112 } },
      {
        id: 'bandits', text: 'Bandidos estão ameaçando a vila! Lide com Dente-de-Ferro na praça',
        objectives: [{ type: 'flag', flag: 'denteResolved', label: '' }], marker: { npc: 'dente' },
        setup(S, restoring) {
          if (restoring && S.flags.denteFight && !S.flags.denteResolved) S.set('denteResolved');
        },
      },
      { id: 'mirela2', text: 'Conte à Anciã Mirela sobre a chama', objectives: [{ type: 'talk', npc: 'mirela' }], auto: false },
    ],
    onComplete(S) { S.set('isoldeArrived'); S.start('mq3'); },
  },

  mq3: {
    type: 'main', title: 'O Astrolábio Roubado', giver: 'Capitã Isolde',
    summary: 'A Capitã Isolde, da Guarda Real, precisa do Astrolábio de Vaelthor para localizar os fragmentos do Coração. O artefato foi roubado pelo bando do Corvo, na Floresta dos Sussurros.',
    rewards: { xp: 300, gold: 60, skillPoints: 1 },
    stages: [
      { id: 'meet', text: 'Encontre a Capitã Isolde na taverna O Javali Dourado', objectives: [{ type: 'talk', npc: 'isolde' }], auto: false },
      {
        id: 'camp', text: 'Recupere o Astrolábio no Acampamento do Corvo, a oeste', objectives: [{ type: 'have', item: 'astrolabio', label: 'Astrolábio de Vaelthor' }],
        marker: (S) => (S.flags.corvoFighting || !S.npc('corvo')?.visible ? { x: LOC.banditCamp.x, z: LOC.banditCamp.z } : { npc: 'corvo' }),
        setup(S, restoring) {
          if (S.flags.banditsHostile && !S.flags.campCleared && S.countAlive('camp') === 0 && !S.flags.corvoFate) S.spawnCampHostiles();
          if (S.flags.corvoFighting && !S.flags.corvoFate && restoring) S.startCorvoFight(S.flags.corvoDuel);
        },
      },
      { id: 'return', text: 'Leve o Astrolábio à Capitã Isolde', objectives: [{ type: 'talk', npc: 'isolde' }], auto: false },
    ],
    onComplete(S) {
      S.set('isoldeAtCamp');
      S.start('mq4a'); S.start('mq4b'); S.start('mq4c');
      S.q.tracked = 'mq4a';
    },
  },

  // ======================================================================
  // ATO II — OS FRAGMENTOS
  // ======================================================================
  mq4a: {
    type: 'main', title: 'Lágrimas do Lago Espelhado', giver: 'Astrolábio',
    summary: 'O Astrolábio aponta para o Lago Espelhado, a oeste, protegido pela druida Thalia.',
    rewards: { xp: 380, gold: 50, skillPoints: 1 },
    stages: [
      { id: 'thalia', text: 'Encontre a druida Thalia no Bosque Antigo', objectives: [{ type: 'talk', npc: 'thalia' }], auto: false },
      {
        id: 'roots', text: 'Queime as Raízes Corrompidas ao redor do lago (só o fogo as fere)',
        objectives: [{ type: 'kill', enemy: 'raiz', count: 3, label: 'Raízes purificadas' }],
        marker: (S) => S.nearestObject('raiz'),
        setup(S) {
          const done = S.progress('mq4a', 0);
          const pts = ring(LOC.lake.x, LOC.lake.z, 49, 3, 0.4);
          pts.forEach((p, i) => {
            if (i < done || S.hasObject('raiz_' + i)) return;
            S.object({ id: 'raiz_' + i, type: 'raiz', name: 'Raiz Corrompida', x: p.x, z: p.z, hp: 70, model: 'root', resist: { fire: 1 }, defaultResist: 0, xp: 40 });
            S.spawnGroup('wisp', 2, p.x, p.z, 5, { level: 3, tags: ['raizguard'] });
          });
        },
      },
      { id: 'ritual', text: 'Volte a Thalia para o ritual', objectives: [{ type: 'talk', npc: 'thalia' }], auto: false },
      { id: 'spirit', text: 'Fale com o Espírito do Lago, no píer', objectives: [{ type: 'talk', npc: 'espirito' }], auto: false, setup(S) { S.set('spiritVisible'); } },
    ],
    onComplete(S) { S.set('spiritVisible', false); S.set('shardWater'); S.checkShards(); },
  },

  mq4b: {
    type: 'main', title: 'O Coração da Montanha', giver: 'Astrolábio',
    summary: 'O Astrolábio aponta para os Picos de Granito, a noroeste, onde uma cratera brilha com calor.',
    rewards: { xp: 450, gold: 90, skillPoints: 1 },
    stages: [
      { id: 'go', text: 'Siga a estrada da montanha até os Picos de Granito', objectives: [{ type: 'reach', x: -165, z: -192, r: 22 }], marker: { x: -165, z: -192 } },
      {
        id: 'runes', text: 'Ative as três pedras rúnicas perto da cratera',
        objectives: [{ type: 'interact', id: 'runa', count: 3, label: 'Pedras rúnicas' }],
        marker: (S) => S.nearestRune(),
        setup(S) {
          S.A.anchors.runeStones.forEach((r, i) => {
            const id = 'runa_' + i;
            if (S.flags['rune' + i] || S.hasInteractable(id)) return;
            S.interactable({ id, pos: { x: r.x, z: r.z }, radius: 2.8, prompt: 'Ativar pedra rúnica', glow: 0xffa040,
              onInteract: () => { S.set('rune' + i); S.removeInteractable(id); S.event('interact', { id: 'runa' }); S.runeFx(r); } });
          });
        },
      },
      { id: 'enter', text: 'Entre na Cratera do Colosso', objectives: [{ type: 'reach', x: LOC.crater.x, z: LOC.crater.z, r: 22 }], marker: { x: LOC.crater.x, z: LOC.crater.z }, setup(S) { S.barrier('crater', false); } },
      {
        id: 'boss', text: 'Derrote o Colosso de Pedra', objectives: [{ type: 'flag', flag: 'colossusDead', label: '' }],
        setup(S) { S.barrier('crater', false); if (!S.flags.colossusDead) S.boss('colossus', LOC.crater.x - 4, LOC.crater.z - 6); },
      },
      {
        id: 'shard', text: 'Absorva o Fragmento da Terra', objectives: [{ type: 'interact', id: 'frag_terra' }], marker: { interact: 'frag_terra' },
        setup(S) {
          if (!S.hasInteractable('frag_terra')) S.shardPickup('frag_terra', LOC.crater.x, LOC.crater.z, 0xc8864a, () => {
            S.give('fragmento_terra'); S.grantSchool('terra'); S.event('interact', { id: 'frag_terra' });
          });
        },
      },
    ],
    onComplete(S) { S.set('shardEarth'); S.checkShards(); },
  },

  mq4c: {
    type: 'main', title: 'A Luz Esquecida', giver: 'Astrolábio',
    summary: 'O Astrolábio aponta para o Templo do Sol Caído, a leste, além do rio.',
    rewards: { xp: 450, gold: 70, skillPoints: 1 },
    stages: [
      { id: 'go', text: 'Vá ao Templo do Sol Caído, a leste', objectives: [{ type: 'reach', x: LOC.temple.x, z: LOC.temple.z, r: 26 }], marker: { x: LOC.temple.x, z: LOC.temple.z } },
      {
        id: 'braziers', text: 'Acenda os três braseiros solares com fogo',
        objectives: [{ type: 'interact', id: 'braseiro_sol', count: 3, label: 'Braseiros acesos' }],
        marker: (S) => S.nearestUnlitBrazier(),
        setup(S) { S.setupTempleBraziers(); },
      },
      {
        id: 'altar', text: 'Tome o Fragmento da Luz no altar do sol', objectives: [{ type: 'interact', id: 'altar_sol' }], marker: { interact: 'altar_sol' },
        setup(S) {
          const T = LOC.temple;
          if (!S.hasInteractable('altar_sol')) S.shardPickup('altar_sol', T.x - 8.5, T.z, 0xffe070, () => S.templeVision(), 15);
        },
      },
    ],
    onComplete(S) { S.set('shardLight'); S.checkShards(); },
  },

  // ======================================================================
  // ATO III — O CASTELO E A FENDA
  // ======================================================================
  mq5: {
    type: 'main', title: 'Os Portões de Valdren', giver: 'Capitã Isolde',
    summary: 'Com os quatro fragmentos ressoando na sua marca, a barreira mágica que sela o Castelo de Valdren pode finalmente ser rompida.',
    rewards: { xp: 600, gold: 120, skillPoints: 1, items: [['placas_valdren', 1]] },
    stages: [
      { id: 'camp', text: 'Encontre a Capitã Isolde no Acampamento da Guarda', objectives: [{ type: 'talk', npc: 'isolde_camp' }], auto: false },
      {
        id: 'barrier', text: 'Rompa a barreira mágica no portão sul do castelo', objectives: [{ type: 'interact', id: 'barreira_sul' }], marker: { interact: 'barreira_sul' },
        setup(S) {
          const g = S.A.anchors.castleGateS;
          if (!S.hasInteractable('barreira_sul')) S.interactable({ id: 'barreira_sul', pos: { x: g.x, y: g.y, z: g.z + 3 }, radius: 4.5, prompt: 'Erguer a mão marcada contra a barreira',
            onInteract: () => S.breakCastleBarrier() });
        },
      },
      {
        id: 'gate', text: 'Defenda o portão ao lado de Isolde', objectives: [{ type: 'kill', tag: 'gate', count: 6, label: 'Inimigos derrotados' }],
        setup(S) {
          S.set('castleOpen');
          S.barrier('castleS', false);
          const left = 6 - S.progress('mq5', 0) - S.countAlive('gate');
          const kinds = ['knight', 'wisp', 'doodle', 'skeleton', 'wisp', 'knight'];
          for (let i = 0; i < left; i++) S.spawn(kinds[i], { x: (i - 2.5) * 4, z: -175 - (i % 2) * 4, level: 7, tags: ['gate'], aggro: 40, leash: 80 });
          if (!S.allyAlive('isolde_ally') && !S.flags.isoldeDied) S.ally('isolde', 3, -150);
        },
      },
      {
        id: 'diary', text: 'Procure pistas sobre o rei no castelo (a biblioteca fica a oeste do pátio)', objectives: [{ type: 'interact', id: 'diario_rei' }], marker: { interact: 'diario_rei' },
        setup(S) {
          S.barrier('castleS', false); S.set('castleOpen');
          const d = S.A.anchors.diary;
          if (!S.hasInteractable('diario_rei')) S.interactable({ id: 'diario_rei', pos: { x: d.x + 1.5, z: d.z }, radius: 3, prompt: 'Ler o diário sobre o atril', model: 'lectern',
            onInteract: () => S.dialogue('diario', 'p1') });
        },
      },
      {
        id: 'jester', text: 'Algo enorme se move no pátio... Enfrente o guardião do castelo', objectives: [{ type: 'flag', flag: 'pimpolhoFate', label: '' }],
        setup(S) { S.barrier('castleS', false); if (!S.flags.pimpolhoFate) S.boss('pimpolho', 0, -188); },
      },
      { id: 'truth', text: 'Fale com a Capitã Isolde no pátio', objectives: [{ type: 'talk', npc: 'isolde_castle' }], auto: false, setup(S) { S.set('isoldeInCastle'); S.removeAlly('isolde_ally'); } },
    ],
    onComplete(S) { S.set('riftOpen'); S.barrier('castleN', false); S.start('mq6'); },
  },

  mq6: {
    type: 'main', title: 'O Coração da Fenda', giver: 'Destino',
    summary: 'Além do portão norte do castelo, a Fenda sangra o Sonhar sobre o mundo. Vaelthor espera no coração dela.',
    rewards: { xp: 1000 },
    stages: [
      { id: 'enter', text: 'Atravesse o portão norte do castelo e entre na Fenda', objectives: [{ type: 'reach', x: 0, z: -268, r: 12 }], marker: { x: 0, z: -268 }, setup(S) { S.barrier('castleN', false); S.barrier('castleS', false); } },
      {
        id: 'pillars', text: 'Destrua os três Pilares do Sonhar que alimentam o ritual',
        objectives: [{ type: 'kill', enemy: 'pilar', count: 3, label: 'Pilares destruídos' }],
        marker: (S) => S.nearestObject('pilar'),
        setup(S) {
          S.barrier('castleN', false);
          const done = S.progress('mq6', 0);
          S.A.anchors.pillars.forEach((p, i) => {
            if (S.flags['pillar' + i] || S.hasObject('pilar_' + i)) return;
            S.object({ id: 'pilar_' + i, type: 'pilar', name: 'Pilar do Sonhar', x: p.x, z: p.z, hp: 380, model: 'pillar', resist: {}, defaultResist: 1, xp: 120, flag: 'pillar' + i });
            S.spawnGroup(i === 2 ? 'echoKnight' : 'nightmare', 1, p.x, p.z, 6, { level: 10, tags: ['pillarguard'] });
            S.spawnGroup('wisp', 2, p.x, p.z, 7, { level: 9, tags: ['pillarguard'] });
          });
          void done;
        },
      },
      { id: 'confront', text: 'Confronte Vaelthor no coração da Fenda', objectives: [{ type: 'talk', npc: 'vaelthor_npc' }], marker: { npc: 'vaelthor_npc' }, auto: false, setup(S) { S.barrier('castleN', false); } },
      {
        id: 'boss', text: 'Derrote Vaelthor, o Arquimago Partido', objectives: [{ type: 'flag', flag: 'vaelthorDefeated', label: '' }],
        setup(S, restoring) { S.barrier('castleN', false); if (!S.flags.vaelthorDefeated) S.startFinalBoss(); },
      },
      { id: 'final', text: 'Decida o destino do Coração de Aether', objectives: [{ type: 'flag', flag: 'endingChosen', label: '' }], auto: false, setup(S, restoring) { if (restoring) S.finalChoice(); } },
    ],
  },

  // ======================================================================
  // MISSÕES SECUNDÁRIAS
  // ======================================================================
  sq_tomas: {
    type: 'side', title: 'O Filho do Ferreiro', giver: 'Bram',
    summary: 'Tomás, filho de Bram, foi capturado pelo bando do Corvo enquanto entregava espadas à Guarda Real. Ele está preso no acampamento da floresta.',
    rewards: { xp: 180, items: [['lamina_bram', 1]] },
    stages: [
      { id: 'find', text: 'Encontre Tomás no Acampamento do Corvo', objectives: [{ type: 'reach', x: LOC.banditCamp.x, z: LOC.banditCamp.z, r: 22 }], marker: { x: LOC.banditCamp.x + 8, z: LOC.banditCamp.z - 10 } },
      {
        id: 'free', text: 'Liberte Tomás da jaula', objectives: [{ type: 'flag', flag: 'tomasFree', label: '' }], marker: { npc: 'tomas' },
        setup(S) { S.setupCage(); },
      },
      { id: 'return', text: 'Conte a Bram que Tomás está livre', objectives: [{ type: 'talk', npc: 'bram' }], auto: false },
    ],
  },

  sq_ovelhas: {
    type: 'side', title: 'Ovelhas Desgarradas', giver: 'Dona Marta',
    summary: 'Três ovelhas de Dona Marta fugiram com medo dos Ecos. Encontre-as e guie-as de volta ao curral da fazenda.',
    rewards: { xp: 140, gold: 80, items: [['queijo', 3]] },
    stages: [
      {
        id: 'find', text: 'Encontre as ovelhas e guie-as até o curral (aproxime-se e pressione E)',
        objectives: [{ type: 'count', count: 3, label: 'Ovelhas no curral', fn: () => window.__G?.story.flags.sheepPenned || 0 }],
        marker: (S) => S.nearestSheep(),
        setup(S) { S.setupSheep(); },
      },
      { id: 'return', text: 'Avise Dona Marta', objectives: [{ type: 'talk', npc: 'marta' }], auto: false },
    ],
  },

  sq_flores: {
    type: 'side', title: 'Flores-da-Lua', giver: 'Irmã Celeste',
    summary: 'A Irmã Celeste precisa de Flores-da-Lua para preparar remédios para os feridos pelos Ecos. Elas brilham à noite em clareiras da floresta e das colinas.',
    rewards: { xp: 170, items: [['pocao_vida', 3], ['amuleto_celeste', 1]] },
    stages: [
      {
        id: 'collect', text: 'Colete Flores-da-Lua (brilham mais à noite)', objectives: [{ type: 'have', item: 'flor_lua', count: 5, label: 'Flores-da-Lua' }],
        marker: (S) => S.nearestFlower(),
        setup(S) { S.setupFlowers(); },
      },
      { id: 'return', text: 'Leve as flores à Irmã Celeste', objectives: [{ type: 'talk', npc: 'celeste' }], auto: false },
    ],
  },

  sq_moinho: {
    type: 'side', title: 'O Fantasma do Moinho', giver: 'Osmar',
    summary: 'Osmar, o moleiro, ouve choro no moinho todas as noites desde o Eclipse. Ele acha que é sua falecida esposa, Helena.',
    rewards: { xp: 200 },
    stages: [
      { id: 'start', text: 'Visite o moinho à noite (entre 21h e 5h — descanse na taverna se preciso)', objectives: [{ type: 'flag', flag: 'helenaSeen', label: '' }], marker: { x: LOC.mill.x - 3, z: LOC.mill.z + 6 } },
      { id: 'helena', text: 'Fale com o fantasma', objectives: [{ type: 'talk', npc: 'helena' }], auto: false },
      {
        id: 'ring', text: 'Procure o anel de Helena no rio, perto do moinho', objectives: [{ type: 'have', item: 'anel_helena', label: 'Anel de Helena' }], marker: { interact: 'anel_rio' },
        setup(S) { S.setupRing(); },
      },
      { id: 'return_ring', text: 'Volte ao fantasma de Helena, à noite', objectives: [{ type: 'talk', npc: 'helena' }], auto: false },
      { id: 'osmar', text: 'Conte a Osmar o que aconteceu', objectives: [{ type: 'talk', npc: 'osmar' }], auto: false },
    ],
  },

  sq_presa: {
    type: 'side', title: 'Caçada à Presa-Branca', giver: 'Gareth',
    summary: 'Um lobo alfa gigante e branco como a neve, a Presa-Branca, ataca caçadores e viajantes ao norte da floresta.',
    rewards: { xp: 260, gold: 60 },
    stages: [
      {
        id: 'hunt', text: 'Cace a Presa-Branca na Toca, ao norte da Floresta dos Sussurros', objectives: [{ type: 'have', item: 'presa_alfa', label: 'Presa da Presa-Branca' }],
        marker: { x: LOC.alphaDen.x, z: LOC.alphaDen.z },
        setup(S) { if (!S.flags.alphaDead && S.countAlive('alpha') === 0) S.spawnAlpha(); },
      },
      { id: 'trophy', text: 'Leve a presa a Gareth (ou a quem quiser...)', objectives: [{ type: 'talk', npc: 'gareth' }], auto: false },
    ],
  },

  sq_tico: {
    type: 'side', title: 'As Cores de Tico', giver: 'Tico',
    summary: 'Tico, um Rabisco amigável que fugiu da Fenda, perdeu suas cores para três Rabiscos malvados. Sem elas, ele vai se apagar.',
    rewards: { xp: 280 },
    stages: [
      {
        id: 'colors', text: 'Recupere as três tintas de Tico dos Rabiscos Coloridos',
        objectives: [
          { type: 'have', item: 'tinta_vermelha', label: 'Vermelho (Clareira dos Cogumelos)' },
          { type: 'have', item: 'tinta_amarela', label: 'Amarelo (Campos de Girassóis)' },
          { type: 'have', item: 'tinta_azul', label: 'Azul (margem norte do Lago Espelhado)' },
        ],
        marker: (S) => S.nextPaintMarker(),
        setup(S) { S.setupPaintDoodles(); },
      },
      { id: 'return', text: 'Devolva as cores a Tico', objectives: [{ type: 'talk', npc: 'tico' }], auto: false },
    ],
  },

  sq_pedra: {
    type: 'side', title: 'O Sussurro da Pedra Negra', giver: 'Pedra Negra',
    summary: 'Um monólito negro no cemitério de Brumavale sussurra promessas de poder.',
    rewards: { xp: 150 },
    stages: [
      { id: 'decide', text: 'Decida o que fazer com a Pedra Negra', objectives: [{ type: 'flag', flag: 'shadowPactFinal', label: '' }], marker: (S) => ({ x: S.A.anchors.blackStone.x, z: S.A.anchors.blackStone.z }) },
      {
        id: 'destroy', text: 'Derrote as sombras que protegem a Pedra', objectives: [{ type: 'kill', tag: 'pactshadow', count: 3, label: 'Sombras' }],
        setup(S) {
          const bs = S.A.anchors.blackStone;
          const left = 3 - S.progress('sq_pedra', 0) - S.countAlive('pactshadow');
          for (let i = 0; i < left; i++) S.spawn('nightmare', { x: bs.x + (i - 1) * 4, z: bs.z - 6, level: Math.max(3, S.stats.level), tags: ['pactshadow'], aggro: 40, hpMul: 0.8 });
        },
        onComplete(S) { S.shatterBlackStone(); },
      },
    ],
  },

  sq_zefiro: {
    type: 'side', title: 'O Desafio do Eremita', giver: 'Zéfiro',
    summary: 'Zéfiro, o excêntrico mago do vento, promete ensinar seus segredos a quem for rápido como uma rajada.',
    rewards: { xp: 260, items: [['pena_zefiro', 1]] },
    stages: [
      {
        id: 'trial', text: 'Quebre os 8 cristais de vento ao redor da torre antes que o tempo acabe',
        objectives: [{ type: 'kill', enemy: 'cristal', count: 8, label: 'Cristais' }],
        setup(S, restoring) { if (restoring) { S.q.state.sq_zefiro.progress[0] = 0; } S.startWindTrial(); },
      },
      { id: 'return', text: 'Volte a Zéfiro', objectives: [{ type: 'talk', npc: 'zefiro' }], auto: false },
    ],
  },

  sq_memorias: {
    type: 'side', title: 'Memórias de Lyra', giver: 'Lyra',
    summary: 'Fragmentos da vida de Lyra estão espalhados pelo reino como borboletas de luz. Juntos, talvez revelem algo importante.',
    rewards: { xp: 350, items: [['coracao_lyra', 1]] },
    stages: [
      { id: 'collect', text: 'Recupere as memórias de Lyra', objectives: [{ type: 'count', count: 5, label: 'Memórias', fn: () => window.__G?.story.flags.lyraMemories || 0 }] },
    ],
    onComplete(S) { S.set('lullaby'); S.codex('cancao'); },
    doneText: 'Você conhece a canção de ninar de Lyra inteira. Ela ecoa na sua marca como um sino distante.',
  },
};
