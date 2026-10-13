// Orquestrador: inicialização, estados, API de scripts das missões, cenas, finais e laço de jogo.
import * as THREE from 'three';
import { G } from './context.js';
import { events } from './Events.js';
import { input } from './Input.js';
import { rand, clamp, lerp } from './math.js';
import { Engine } from './Engine.js';
import { CameraRig } from './CameraRig.js';
import { AudioManager } from './Audio.js';
import { SaveSystem } from './Save.js';
import { World } from '../world/World.js';
import { Sky } from '../world/Sky.js';
import { LOC, WAYSTONES, regionAt } from '../world/WorldMap.js';
import { FX } from '../combat/FX.js';
import { Combat } from '../combat/Combat.js';
import { Projectiles } from '../combat/Projectiles.js';
import { PowerManager } from '../combat/Powers.js';
import { Entities } from '../entities/Entities.js';
import { Player } from '../entities/Player.js';
import { Enemy, Spawner } from '../entities/Enemy.js';
import { NPCManager } from '../entities/NPC.js';
import { WorldObject, Sheep, CorvoBoss, AlphaBoss, ColossusBoss, PimpolhoBoss, VaelthorBoss, Ally } from '../entities/Bosses.js';
import { Stats, ORIGINS } from '../rpg/Stats.js';
import { Inventory, Loot } from '../rpg/Inventory.js';
import { QuestManager } from '../rpg/Quests.js';
import { DialogueManager } from '../rpg/Dialogue.js';
import { Story, fmt } from '../rpg/Story.js';
import { UI } from '../ui/UI.js';
import { Screens } from '../ui/Screens.js';
import { QUESTS } from '../data/quests.js';
import { DIALOGUES } from '../data/dialogues.js';
import { buildNPCDefs } from '../data/npcs.js';
import { SPAWN_ZONES, ENEMY_TYPES } from '../data/enemies.js';
import { INTRO_PAGES, ENDINGS, epilogueSlides, MEMORY_IDS } from '../data/lore.js';
import { buildPlayerModel } from '../entities/Models.js';

const ENDINGS_KEY = 'valdren_endings_v1';

export class Game {
  constructor() {
    G.game = this;
    window.__G = G;
    G.input = input;
    this.permFlames = [];
    this.allies = {};
    this.objects = {};
    this.sheep = {};
    this.moodT = 0;
    this.autosaveT = 0;
    this.trial = null;
  }

  // ---------------------------------------------------------------- init
  async init(onProgress) {
    const canvas = document.getElementById('game-canvas');
    G.save = new SaveSystem();
    G.save.loadSettings();
    const engine = new Engine(canvas);
    G.engine = engine; G.scene = engine.scene; G.camera = engine.camera; G.post = engine.post;
    input.init(canvas);
    G.saveSettings = () => G.save.saveSettings();
    G.setState = (s) => this.setState(s);
    G.travelTo = (w) => this.travelTo(w);
    G.rest = (h) => this.rest(h);
    G.loadGame = () => this.loadGame();
    G.toTitle = () => this.toTitle();
    G.audio = new AudioManager();
    G.cameraRig = new CameraRig(engine.camera);
    G.sky = new Sky(engine.scene, engine.camera);
    await tick();
    const world = new World(engine.scene);
    world.build((m) => onProgress?.(m));
    G.world = world;
    await tick();
    G.fx = new FX(engine.scene);
    G.fx.setScale(window.innerHeight);
    window.addEventListener('resize', () => G.fx.setScale(window.innerHeight));
    G.combat = new Combat();
    G.projectiles = new Projectiles(engine.scene);
    G.entities = new Entities();
    G.stats = new Stats();
    G.inventory = new Inventory();
    G.powers = new PowerManager();
    G.story = new Story();
    G.loot = new Loot(engine.scene);
    G.quests = new QuestManager(QUESTS);
    G.dialogue = new DialogueManager(DIALOGUES);
    G.questCtx = this.makeCtx();
    G.ui = new UI(document.getElementById('ui-root'));
    G.screens = new Screens(document.getElementById('ui-root'));
    G.npcs = new NPCManager();
    G.spawner = new Spawner(SPAWN_ZONES);
    // jogador provisório (para câmera/NPCs na tela de título)
    G.app = { name: 'Aren', gender: 'm', skin: 1, hairColor: 1, hairStyle: 'short', cape: 0, outfit: 0, origin: 'ferreiro' };
    const home = world.anchors.anchors.playerHome;
    G.player = new Player(G.app);
    G.player.pos.set(home.x, world.groundAt(home.x, home.z, 99), home.z);
    G.player.yaw = Math.atan2(LOC.brumavale.x - home.x, LOC.brumavale.z - home.z);
    G.entities.add(G.player);
    G.player.object.visible = false;
    G.npcs.spawnAll(buildNPCDefs(world.anchors));
    this.setupWorldInteractables();
    onProgress?.('Preparando feitiços e criaturas...');
    await tick();
    await this.prewarmShaders();
    events.on('playerDied', () => this.onPlayerDied());
    events.on('kill', (d) => this.onKill(d));
    events.on('questDone', (id) => { if (id === 'sq_memorias') G.audio?.play('memory'); });
    // eventos de UI que dependem do estado
    document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') G.ui.menus.openPause(); });
    // primeira interação libera o áudio
    const unlock = () => { G.audio.init(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    this.setupDebug();
  }

  // Compila antes de o jogo começar os shaders de todos os inimigos, chefes, aliados, objetos e
  // dos materiais avulsos dos efeitos. Sem isso, cada tipo novo trava o jogo na primeira aparição.
  async prewarmShaders() {
    const R = G.engine.renderer;
    const warm = new THREE.Scene();
    const bossCls = { alpha: AlphaBoss, colossus: ColossusBoss, pimpolho: PimpolhoBoss, corvoBoss: CorvoBoss, vaelthor: VaelthorBoss };
    for (const type in ENEMY_TYPES) {
      try {
        const e = bossCls[type] ? new bossCls[type]({ x: 0, z: 0 }) : type.startsWith('ally') ? new Ally(type, { x: 0, z: 0 }) : new Enemy(type, { x: 0, z: 0 });
        warm.add(e.object);
      } catch (err) { console.warn('prewarm', type, err); }
    }
    for (const model of ['root', 'pillar', 'crystal']) warm.add(new WorldObject({ id: 'warm_' + model, type: 'warm', model, x: 0, z: 0 }).object);
    warm.add(new Sheep({ id: 'warm_sheep', name: '', x: 0, z: 0 }).object);
    const geo = new THREE.BoxGeometry(1, 1, 1);
    for (const m of [
      new THREE.MeshStandardMaterial({ flatShading: true }),
      new THREE.MeshStandardMaterial({ flatShading: true, transparent: true, opacity: 0.5 }),
      new THREE.MeshStandardMaterial(),
      new THREE.MeshToonMaterial(),
      new THREE.MeshBasicMaterial(),
      new THREE.MeshBasicMaterial({ side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
      new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    ]) warm.add(new THREE.Mesh(geo, m));
    // A cena é desenhada num alvo de renderização do pós-processamento (sem tone mapping, espaço
    // linear): compila com esse mesmo alvo ativo para gerar os mesmos programas usados no jogo.
    // As luzes e a névoa vêm da cena principal.
    const prevTarget = R.getRenderTarget();
    R.setRenderTarget(G.post.composer.readBuffer);
    let done = null;
    try {
      // compileAsync só ajuda com KHR_parallel_shader_compile; sem a extensão, compila direto.
      if (R.extensions.has('KHR_parallel_shader_compile')) done = R.compileAsync(warm, G.camera, G.scene);
      else R.compile(warm, G.camera, G.scene);
    } finally { R.setRenderTarget(prevTarget); }
    if (done) await Promise.race([done, wait(10)]);
    // Libera só as geometrias. Os materiais nunca recebem dispose(), então os programas compilados
    // continuam em cache e são reaproveitados por qualquer material equivalente criado depois.
    warm.traverse((o) => o.geometry?.dispose());
  }

  setState(s) {
    const prev = G.state;
    G.state = s;
    input.wantLock = s === 'play';
    if (s === 'play') {
      G.ui.showHUD(true);
      if (prev !== 'play') input.lock();
    } else if (s !== 'dialogue' && s !== 'cutscene') {
      if (s !== 'menu' && s !== 'pause') G.ui.showHUD(false);
    }
    if (s !== 'play') { input.down.clear(); input.mouse.buttons.clear(); }
    if (s === 'menu' || s === 'pause' || s === 'title' || s === 'create' || s === 'dead' || s === 'ending') input.unlock();
  }

  // ---------------------------------------------------------------- títulos e criação
  showTitle() {
    this.setState('title');
    G.time.hours = 17.4;
    G.ui.showHUD(false);
    const rig = G.cameraRig;
    rig.mode = 'orbit';
    rig.orbitCenter = new THREE.Vector3(0, 6, 112);
    rig.orbitDist = 62; rig.orbitHeight = 26; rig.orbitLookY = 2; rig.orbitSpeed = 0.035;
    G.player.object.visible = false;
    G.screens.showTitle({
      hasSave: G.save.has(),
      onNew: () => this.showCreation(),
      onContinue: () => { G.audio.init(); this.loadGame(); },
    });
    const ends = this.endingsSeen();
    if (ends.length) {
      const el = document.createElement('div');
      el.className = 'endings-seen';
      el.textContent = `Finais descobertos: ${ends.length} / 6`;
      G.screens.el.appendChild(el);
    }
    G.audio.setMood('title');
  }

  showCreation() {
    G.audio.init();
    this.setState('create');
    G.time.hours = 9.5;
    const p = G.player;
    const home = G.world.anchors.anchors.playerHome;
    p.pos.set(home.x, G.world.groundAt(home.x, home.z, 99), home.z);
    p.object.visible = true;
    const rig = G.cameraRig;
    rig.mode = 'orbit';
    rig.orbitCenter = p.pos;
    rig.orbitDist = 3.6; rig.orbitHeight = 1.5; rig.orbitLookY = 1.05; rig.orbitSpeed = 0.15;
    rig.yaw = p.yaw;
    let drag = null;
    this._dragHandlers = {
      down: (e) => { if (e.target === G.engine.canvas) drag = e.clientX; },
      move: (e) => { if (drag !== null) { rig.yaw -= (e.clientX - drag) * 0.01; drag = e.clientX; } },
      up: () => { drag = null; },
    };
    window.addEventListener('pointerdown', this._dragHandlers.down);
    window.addEventListener('pointermove', this._dragHandlers.move);
    window.addEventListener('pointerup', this._dragHandlers.up);
    G.screens.showCreation(
      (app) => { G.app = { ...app }; p.app = G.app; p.buildModel(); },
      (app) => this.newGame(app),
    );
  }

  // ---------------------------------------------------------------- novo jogo / carregar
  resetState() {
    for (const e of [...G.entities.list]) if (e !== G.player && e.kind !== 'npc') e.remove();
    G.entities.list = G.entities.list.filter((e) => !e.removed);
    G.spawner.clearAll();
    G.projectiles.clear();
    G.loot.clear();
    G.fx.clear();
    for (const k in this.objects) this.objects[k].remove();
    this.objects = {};
    this.allies = {};
    for (const k in this.sheep) this.sheep[k].remove();
    this.sheep = {};
    for (const f of this.permFlames) f.remove?.();
    this.permFlames = [];
    // remove interativos de missão (mantém os fixos do mundo)
    G.world.interactables.filter((it) => !it.permanent).forEach((it) => G.world.removeInteractable(it));
    G.stats = new Stats();
    G.inventory = new Inventory();
    G.powers = new PowerManager();
    G.story = new Story();
    G.quests.reset();
    G.bossMusic = false;
    G.ui.setBoss(null);
    G.post.target.toon = G.post.target.psychic = G.post.target.shadow = G.post.target.rift = 0;
    G.world.heartCore.visible = true;
    G.world.heartCore.position.set(0, 12, -305);
    for (const k of ['castleS', 'castleN', 'crater']) G.world.setBarrier(k, true);
    G.player.revive();
    G.player.buffs = {};
    this.trial = null;
    for (const n of G.npcs.list) n.checkVisible();
  }

  newGame(app) {
    this.cleanupCreation();
    this.resetState();
    G.app = { ...app, originName: ORIGINS[app.origin].name };
    const p = G.player;
    p.app = G.app;
    const o = ORIGINS[app.origin];
    for (const k in o.bonus) G.stats.attrs[k] += o.bonus[k];
    G.stats.gold = o.gold;
    G.inventory.add('espada_gasta', 1, true);
    G.inventory.add('tunica', 1, true);
    G.inventory.add('pocao_vida', 2, true);
    G.inventory.add('pao', 2, true);
    p.buildModel();
    p.fullHeal();
    const home = G.world.anchors.anchors.playerHome;
    p.pos.set(home.x, G.world.groundAt(home.x, home.z, 99), home.z);
    p.yaw = Math.atan2(LOC.brumavale.x - home.x, LOC.brumavale.z - home.z);
    G.time.hours = 8.5; G.time.day = 1; G.time.playTime = 0;
    G.story.waystones.ws_brumavale = true;
    G.screens.hide();
    this.setState('intro');
    G.audio.setMood('title');
    G.screens.showIntro(INTRO_PAGES, () => this.beginPlay(true));
  }

  async beginPlay(fresh) {
    G.screens.hide();
    G.ui.fade(1, 0.01);
    const p = G.player;
    p.object.visible = true;
    G.cameraRig.release();
    G.cameraRig.snapBehind(p.yaw);
    G.cameraRig.pitch = -0.18;
    G.cameraRig.pivot.set(0, 0, 0);
    this.setState('play');
    G.ui.showHUD(true);
    await wait(0.3);
    G.ui.fade(0, 1.5);
    if (fresh) {
      G.quests.start('mq1');
      setTimeout(() => G.ui.toast('WASD move • Mouse olha • Clique para capturar o mouse • E interage', 'info'), 1500);
      setTimeout(() => G.ui.toast('Siga a estrela na bússola para encontrar seu objetivo', 'info'), 5000);
      G.save.save('auto');
    }
  }

  cleanupCreation() {
    if (this._dragHandlers) {
      window.removeEventListener('pointerdown', this._dragHandlers.down);
      window.removeEventListener('pointermove', this._dragHandlers.move);
      window.removeEventListener('pointerup', this._dragHandlers.up);
      this._dragHandlers = null;
    }
  }

  async loadGame() {
    const d = G.save.load();
    if (!d) { G.ui.toast('Nenhum save encontrado.', 'warn'); return; }
    this.cleanupCreation();
    G.screens.hide();
    await G.ui.fade(1, 0.4);
    this.resetState();
    G.app = { ...d.app };
    G.stats.load(d.stats);
    G.inventory.load(d.inventory);
    G.powers.load(d.powers);
    G.story.load(d.story);
    G.quests.load(d.quests);
    G.time.hours = d.time.hours; G.time.day = d.time.day; G.time.playTime = d.time.playTime || 0;
    const p = G.player;
    p.app = G.app;
    p.buildModel();
    p.pos.set(d.player.x, d.player.y, d.player.z);
    p.yaw = d.player.yaw;
    p.hp = d.player.hp; p.mana = d.player.mana; p.stamina = 999;
    p.alive = true;
    if (d.npcs) for (const id in d.npcs) { const n = G.npcs.get(id); if (n) n.moveTo(d.npcs[id].x, d.npcs[id].z, d.npcs[id].yaw); }
    this.restoreWorldState();
    G.quests.restoreWorld();
    for (const n of G.npcs.list) n.checkVisible();
    this.beginPlay(false);
    G.ui.toast('Jogo carregado.', 'save');
  }

  toTitle() {
    G.dialogue.active && G.dialogue.end();
    G.ui.menus.el.classList.add('hidden');
    G.ui.menus.pauseEl.classList.add('hidden');
    G.ui.menus.panelEl.classList.add('hidden');
    this.resetState();
    G.ui.fade(0, 0.5);
    this.showTitle();
  }

  // Restaura efeitos permanentes a partir dos marcadores
  restoreWorldState() {
    const f = G.story.flags;
    const A = G.world.anchors;
    if (f.fireShard) this.addPermFlame(A.braziers.flame, 1.4);
    for (let i = 0; i < 3; i++) if (f['tbrazier' + i]) this.addPermFlame(A.braziers.temple[i], 1.2);
    if (f.castleOpen) G.world.setBarrier('castleS', false);
    if (f.riftOpen) G.world.setBarrier('castleN', false);
    if (G.quests.pastStage('mq4b', 'runes')) G.world.setBarrier('crater', false);
    if (f.tomasFree && A.cageCollider) A.cageCollider.enabled = false;
    if (f.pimpolhoInBattle && !G.quests.isActive('mq6')) f.pimpolhoInBattle = false;
    // ovelhas no curral
    if (G.quests.isStarted('sq_ovelhas')) G.questCtx.setupSheep(true);
  }

  // ---------------------------------------------------------------- interativos fixos
  setupWorldInteractables() {
    const W = G.world;
    const A = W.anchors;
    for (const w of A.waystones) {
      W.addInteractable({ id: w.id, permanent: true, pos: { x: w.x, y: w.y, z: w.z }, radius: 3, prompt: () => (G.story.waystones[w.id] ? `Viajar — Pedra-guia de ${w.name}` : `Ativar a pedra-guia de ${w.name}`),
        onInteract: () => {
          if (!G.story.waystones[w.id]) {
            G.story.waystones[w.id] = true;
            G.ui.toast('Pedra-guia ativada: ' + w.name, 'quest');
            G.audio.play('travel');
            G.fx.burst('water', w.x, w.y + 2, w.z, 1);
            G.save.autosave();
          } else G.ui.openAction('travel');
        } });
    }
    // Pedra Negra
    const bs = A.anchors.blackStone;
    W.addInteractable({ id: 'pedra_negra', permanent: true, pos: { x: bs.x, z: bs.z + 1.8 }, radius: 3, prompt: 'Tocar a Pedra Negra',
      condition: () => G.story.flags.shadowPact !== 'destroyed' && G.quests.isDone('mq1'),
      onInteract: () => G.dialogue.startTree('pedra_negra') });
    // Quadro de avisos
    const tav = { x: -9, z: 96 };
    this.addNoticeBoard(tav.x, tav.z);
    // Baús
    const C = LOC.cemetery, BC = LOC.banditCamp, TP = LOC.temple;
    const chests = [
      { id: 'c_camp', x: BC.x + 11, z: BC.z + 9, loot: { gold: 60, items: [['couro', 1], ['pocao_vida', 2]] } },
      { id: 'c_temple', x: TP.x + 7, z: TP.z - 7, y: 15, loot: { gold: 120, items: [['pocao_mana', 2], ['elixir', 1]] } },
      { id: 'c_mountain', x: -128, z: -170, loot: { gold: 90, items: [['tonico_vigor', 2], ['cristal_terra', 2]] } },
      { id: 'c_castle', x: 9, z: -201, loot: { gold: 150, items: [['espada_valdren', 1]] }, cond: () => G.story.flags.castleOpen },
      { id: 'c_rift', x: 58, z: -330, loot: { gold: 200, items: [['lamina_aurora', 1], ['elixir', 2]] } },
      { id: 'c_tower', x: LOC.hermitTower.x + 2, z: LOC.hermitTower.z + 6.5, loot: { gold: 50, items: [['pocao_vida', 2]] } },
      { id: 'c_pier', x: LOC.lake.x + LOC.lake.r + 3, z: LOC.lake.z + 9, loot: { gold: 40, items: [['pocao_mana', 2]] } },
      { id: 'c_crypt', x: C.x - 6, z: C.z - 6, loot: { gold: 70, items: [['colar_presas', 1], ['po_osso', 2]] } },
      { id: 'c_den', x: LOC.alphaDen.x + 4, z: LOC.alphaDen.z - 6, loot: { gold: 60, items: [['pele_lobo', 3], ['pocao_vida', 1]] } },
      { id: 'c_sunfields', x: LOC.sunfields.x + 21, z: LOC.sunfields.z - 12, loot: { gold: 45, items: [['queijo', 2], ['tonico_vigor', 1]] } },
    ];
    for (const c of chests) this.addChest(c);
  }

  addNoticeBoard(x, z) {
    const W = G.world;
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6e4b2e, flatShading: true });
    const paper = new THREE.MeshStandardMaterial({ color: 0xefe2c2, flatShading: true });
    for (const sx of [-0.9, 0.9]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.12), wood); p.position.set(sx, 1.1, 0); g.add(p); }
    const b = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 0.08), wood); b.position.y = 1.6; g.add(b);
    for (let i = 0; i < 4; i++) { const pp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.02), paper); pp.position.set(-0.6 + i * 0.4, 1.6 + (i % 2) * 0.12, 0.05); pp.rotation.z = (i - 1.5) * 0.08; g.add(pp); }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 0.5), wood); roof.position.y = 2.3; g.add(roof);
    g.rotation.y = Math.atan2(LOC.brumavale.x - x, LOC.brumavale.z - z);
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    W.addInteractable({ id: 'quadro', permanent: true, pos: { x, z }, radius: 2.6, prompt: 'Ler o quadro de avisos', mesh: g, onInteract: () => G.dialogue.startTree('quadro') });
    W.collision.addBox(x, z, 1.1, 0.2, g.rotation.y, { y0: W.heightAt(x, z) - 1, y1: W.heightAt(x, z) + 2.4 });
  }

  addChest(c) {
    const W = G.world;
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a5230, flatShading: true });
    const metal = new THREE.MeshStandardMaterial({ color: 0xc8a040, metalness: 0.7, roughness: 0.4, flatShading: true });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.7), wood); base.position.y = 0.3;
    const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.6, -0.35);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 8, 1, false, 0, Math.PI), wood);
    lid.rotation.z = Math.PI / 2; lid.rotation.y = Math.PI / 2; lid.position.z = 0.35;
    lidPivot.add(lid);
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.08, 0.74), metal); band.position.y = 0.45;
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.06), metal); lock.position.set(0, 0.55, 0.37);
    g.add(base, lidPivot, band, lock);
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    const opened = () => G.story.flags['chest_' + c.id];
    if (opened()) lidPivot.rotation.x = -1.8;
    g.rotation.y = rand(0, Math.PI * 2);
    const y = c.y ?? W.groundAt(c.x, c.z, 99);
    const it = W.addInteractable({
      id: 'chest_' + c.id, permanent: true, pos: { x: c.x, y, z: c.z }, radius: 2.2, mesh: g,
      prompt: 'Abrir o baú',
      condition: () => !opened() && (!c.cond || c.cond()),
      onInteract: () => {
        G.story.set('chest_' + c.id);
        G.audio.play('equip');
        const t0 = G.time.now;
        it.update = () => { lidPivot.rotation.x = -Math.min(1.8, (G.time.now - t0) * 4); };
        if (c.loot.gold) G.loot.dropGold({ x: c.x, y: y + 0.5, z: c.z }, c.loot.gold);
        for (const [id, n] of c.loot.items || []) G.inventory.add(id, n);
        G.fx.burst('light', c.x, y + 1, c.z, 0.5);
      },
    });
    it.mesh.position.y = y;
    if (opened()) it.update = () => { lidPivot.rotation.x = -1.8; };
    W.collision.addBox(c.x, c.z, 0.6, 0.4, g.rotation.y, { y0: y - 1, y1: y + 0.9 });
  }

  // ---------------------------------------------------------------- chamas permanentes
  addPermFlame(p, scale = 1) {
    if (!p) return;
    // Sem PointLight próprio: entra no conjunto fixo de luzes do mundo (evita recompilar shaders).
    const W = G.world;
    const f = { p, scale, x: p.x, y: p.y + 0.6, z: p.z, intensity: 6 * scale, remove: () => { const i = W.extraFlames.indexOf(f); if (i >= 0) W.extraFlames.splice(i, 1); } };
    W.extraFlames.push(f);
    this.permFlames.push(f);
    return f;
  }

  updatePermFlames(dt) {
    const t = G.time.now;
    for (const f of this.permFlames) {
      if (!G.player || Math.hypot(G.player.pos.x - f.p.x, G.player.pos.z - f.p.z) > 120) continue;
      f.intensity = 6 * f.scale * (0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 27) * 0.06);
      if (Math.random() < dt * 30) G.fx.emit({ x: f.p.x + rand(-0.2, 0.2), y: f.p.y, z: f.p.z + rand(-0.2, 0.2), count: 2, color: 0xffe080, color2: 0xff3010, size: 0.9 * f.scale, sizeEnd: 0.1, life: 0.6, speed: 0.5, up: 2.2 * f.scale, radius: 0.25 * f.scale });
    }
  }


  // ---------------------------------------------------------------- morte
  onPlayerDied() {
    this.setState('dead');
    G.ui.showHUD(false);
    G.screens.showDeath({
      onRetry: () => this.respawn(),
      onLoad: () => { G.screens.hide(); this.loadGame(); },
    });
  }

  async respawn() {
    G.screens.hide();
    await G.ui.fade(1, 0.4);
    const p = G.player;
    // pedra-guia ativa mais próxima
    let best = WAYSTONES[0], bd = Infinity;
    for (const w of WAYSTONES) {
      if (!G.story.waystones[w.id]) continue;
      const d = Math.hypot(w.x - p.pos.x, w.z - p.pos.z);
      if (d < bd) { bd = d; best = w; }
    }
    // em lutas de chefe na fenda, volta ao início da arena
    if (G.quests.atStage('mq6', 'boss')) best = { x: 0, z: -272 };
    else if (G.quests.atStage('mq4b', 'boss')) best = { x: LOC.crater.x + 18, z: LOC.crater.z + 14 };
    G.stats.gold = Math.floor(G.stats.gold * 0.9);
    p.revive(best.x + 2, G.world.groundAt(best.x + 2, best.z + 2, 99), best.z + 2);
    for (const e of G.entities.list) if (e.kind === 'enemy' && e.aiTarget === p && !e.boss) { e.aiTarget = null; e.state = 'return'; }
    for (const e of G.entities.list) if (e.boss && e.alive) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.35); e.aiTarget = null; e.introDone = false; e.invulnerable = true; G.ui.setBoss(null); G.bossMusic = false; }
    G.cameraRig.snapBehind(p.yaw);
    G.cameraRig.pitch = -0.18;
    this.setState('play');
    G.ui.fade(0, 1);
  }

  onKill(d) {
    const t = d.target;
    if (d.tags?.includes('dente') && G.questCtx.countAlive('dente') === 0 && G.story.flags.denteFight) {
      G.story.set('denteResolved');
      G.story.set('banditsFought');
      G.story.record('Enfrentou os bandidos em Brumavale');
    }
    if (t?.zoneId) G.story.inc('kills');
  }

  // ---------------------------------------------------------------- viagem e descanso
  async travelTo(w) {
    if (G.state === 'menu') this.setState('play');
    const p = G.player;
    G.audio.play('travel');
    G.fx.burst('water', p.pos.x, p.pos.y + 1, p.pos.z, 1.2);
    await G.ui.fade(1, 0.5, '#0a1830');
    const a = Math.atan2(LOC.brumavale.x - w.x, LOC.brumavale.z - w.z);
    const x = w.x + Math.sin(a) * 2.5, z = w.z + Math.cos(a) * 2.5;
    p.pos.set(x, G.world.groundAt(x, z, 99), z);
    p.vel.set(0, 0, 0); p.knock.set(0, 0, 0);
    p.yaw = a;
    G.cameraRig.snapBehind(a);
    G.cameraRig.pivot.set(0, 0, 0);
    for (const e of G.entities.list) if (e.kind === 'enemy' && e.aiTarget === p) e.aiTarget = null;
    await wait(0.3);
    G.ui.fade(0, 0.8);
    G.save.autosave();
  }

  async rest(hour) {
    this.setState('cutscene');
    await G.ui.fade(1, 0.8);
    G.audio.play('rest');
    const cur = G.time.hours;
    if (hour <= cur) G.time.day++;
    G.time.hours = hour;
    G.player.fullHeal();
    G.player.status = {};
    G.ui.showSubtitle(hour === 21 ? 'Você descansa até o anoitecer...' : hour === 12 ? 'Você descansa até o meio-dia...' : 'Você dorme profundamente até o amanhecer...', 2.2);
    await wait(2.0);
    this.setState('play');
    G.ui.fade(0, 1.2);
    G.save.autosave();
  }

  // ---------------------------------------------------------------- cenas: visão
  async vision(lines, opts = {}) {
    const prevState = G.state;
    this.setState('cutscene');
    G.ui.showHUD(false);
    G.ui.letterbox(true);
    G.post.target.psychic = 0.6;
    await G.ui.fade(0.85, 1.0, opts.color || '#f4ecff');
    G.audio.play('memory');
    for (const l of lines) {
      G.ui.showSubtitle(l, 3.2);
      G.ui.subtitle.classList.add('vision');
      await wait(Math.max(2.6, l.length * 0.06));
    }
    G.ui.subtitle.classList.remove('vision');
    G.ui.subtitle.classList.add('hidden');
    G.post.target.psychic = 0;
    await G.ui.fade(0, 1.0);
    G.ui.letterbox(false);
    this.setState(prevState === 'cutscene' ? 'play' : 'play');
  }

  // ---------------------------------------------------------------- finais
  endingsSeen() {
    try { return JSON.parse(localStorage.getItem(ENDINGS_KEY)) || []; } catch (e) { return []; }
  }

  async playEnding(id) {
    const E = ENDINGS[id];
    if (!E) return;
    G.story.set('endingChosen', id);
    try {
      const seen = this.endingsSeen();
      if (!seen.includes(id)) { seen.push(id); localStorage.setItem(ENDINGS_KEY, JSON.stringify(seen)); }
    } catch (e) { /* */ }
    G.save.save('auto');
    this.setState('ending');
    G.ui.showHUD(false);
    G.ui.setBoss(null);
    G.bossMusic = false;
    G.audio.setMood(E.mood || 'ending');
    if (id === 'isso_e_tudo') G.post.target.toon = 1;
    if (id === 'grande_sonho') G.post.target.rift = 1;
    await G.ui.fade(1, 2.0, id === 'coroa_cinzas' ? '#1a0008' : id === 'grande_sonho' ? '#1a0830' : '#000');
    if (id !== 'grande_sonho' && id !== 'coroa_cinzas') { G.story.set('riftSealed'); }
    const slides = [...E.slides, ...epilogueSlides(G.questCtx, id)];
    G.ui.fade(0, 0.01);
    G.screens.showEnding(E, slides, () => { G.post.target.toon = 0; G.post.target.rift = 0; this.toTitle(); });
  }

  // ---------------------------------------------------------------- laço
  update(dt) {
    // câmera lenta (aparo) e parada de impacto
    let gdt = dt;
    if (G.time.hitstop > 0) { G.time.hitstop -= dt; gdt = dt * 0.05; }
    else if (G.time.slowmo > 0) { G.time.slowmo -= dt; gdt = dt * 0.35; }
    G.time.now += dt;
    const p = G.player;
    const playing = G.state === 'play';
    if (playing) G.time.playTime += dt;
    G.sky.update(gdt, p ? p.pos : null);
    if (G.state === 'play' || G.state === 'dialogue' || G.state === 'cutscene' || G.state === 'title' || G.state === 'create' || G.state === 'menu' || G.state === 'pause' || G.state === 'dead' || G.state === 'intro' || G.state === 'ending') {
      const simDt = (G.state === 'menu' || G.state === 'pause') ? 0 : gdt;
      G.entities.update(simDt);
      if (simDt > 0) {
        G.projectiles.update(simDt);
        G.loot.update(simDt);
        G.powers.update(simDt);
        G.fx.update(simDt);
      }
    }
    if (playing) {
      G.spawner.update(gdt);
      G.quests.update(gdt);
      this.updateTrial(gdt);
      this.autosaveT += dt;
      if (this.autosaveT > 180) { this.autosaveT = 0; G.save.autosave(); }
    }
    this.updatePermFlames(gdt);
    G.world.update(gdt, p ? p.pos : G.camera.position, G.camera.position);
    G.cameraRig.update(dt, p);
    G.ui.update(dt);
    // pós-processamento: proximidade da Fenda
    G.post.target.rift = Math.max(G.post.target.rift > 0.99 ? 1 : 0, G.sky.riftAmount * 0.6);
    this.moodT -= dt;
    if (this.moodT <= 0) { this.moodT = 1; this.updateMood(); }
    input.endFrame();
  }

  updateMood() {
    if (!G.audio.ready) return;
    const s = G.state;
    if (s === 'title' || s === 'create' || s === 'intro') return G.audio.setMood('title');
    if (s === 'ending') return;
    if (G.bossMusic) return G.audio.setMood('boss');
    const p = G.player;
    const inCombat = G.entities.list.some((e) => e.alive && e.kind === 'enemy' && e.team === 'enemy' && e.aiTarget === p && (e.state === 'chase' || e.state === 'attack') && e.distTo(p) < 22);
    if (inCombat) return G.audio.setMood('combat');
    const reg = regionAt(p.pos.x, p.pos.z);
    if (reg === 'rift') return G.audio.setMood('rift');
    if (reg === 'castle') return G.audio.setMood('castle');
    if (reg === 'temple') return G.audio.setMood('temple');
    if (['brumavale', 'farm', 'mill', 'guardCamp'].includes(reg)) return G.audio.setMood(G.sky.isNight() ? 'night' : 'village');
    if (G.sky.isNight()) return G.audio.setMood('night');
    if (['forest', 'grove', 'lake', 'mushrooms', 'banditCamp', 'alphaDen'].includes(reg)) return G.audio.setMood('forest');
    if (reg === 'sunfields') return G.audio.setMood('toon');
    return G.audio.setMood('wild');
  }

  // ---------------------------------------------------------------- desafio do vento
  updateTrial(dt) {
    const T = this.trial;
    if (!T) return;
    T.t -= dt;
    if (Math.floor(T.t * 4) !== T.lastTick) { T.lastTick = Math.floor(T.t * 4); G.ui.showSubtitle(`Desafio do Vento — ${Math.max(0, Math.ceil(T.t))}s — cristais: ${G.quests.state.sq_zefiro?.progress[0] || 0}/8`, 1); }
    if (!G.quests.atStage('sq_zefiro', 'trial')) { this.trial = null; G.ui.showSubtitle('Desafio concluído! Volte a Zéfiro.', 3); G.audio.play('questDone'); return; }
    if (T.t <= 0) {
      this.trial = null;
      for (const k in this.objects) if (this.objects[k].type === 'cristal') { this.objects[k].remove(); delete this.objects[k]; }
      G.quests.state.sq_zefiro.progress[0] = 0;
      G.ui.showSubtitle('O tempo acabou! Fale com Zéfiro para tentar de novo.', 4);
      G.audio.play('denied');
    }
  }

  // ---------------------------------------------------------------- API para scripts (S)
  makeCtx() {
    const game = this;
    const S = {
      G,
      get q() { return G.quests; },
      get story() { return G.story; },
      get flags() { return G.story.flags; },
      get inv() { return G.inventory; },
      get stats() { return G.stats; },
      get A() { return G.world.anchors; },
      set: (k, v = true) => { G.story.set(k, v); for (const n of G.npcs.list) n.checkVisible(); },
      get: (k) => G.story.flags[k],
      inc: (k, n = 1) => G.story.inc(k, n),
      karma: (n) => G.story.addKarma(n),
      record: (t) => G.story.record(t),
      give: (id, n = 1) => G.inventory.add(id, n),
      take: (id, n = 1) => G.inventory.remove(id, n),
      has: (id, n = 1) => G.inventory.has(id, n),
      gold: (n) => G.stats.addGold(n),
      xp: (n) => G.stats.addXp(n),
      attr: (k) => G.stats.attr(k),
      toast: (t, type) => G.ui.toast(t, type),
      subtitle: (t, dur) => G.ui.showSubtitle(t, dur),
      codex: (id) => G.story.addCodex(id),
      start: (id) => G.quests.start(id),
      event: (type, data) => events.emit(type, data),
      grantSchool: (s) => G.powers.grantSchool(s),
      hasSchool: (s) => G.powers.hasSchool(s),
      isNight: () => G.sky.isNight(),
      healFull: () => { G.player.fullHeal(); G.fx.burst('heal', G.player.pos.x, G.player.pos.y + 1, G.player.pos.z, 1); },
      progress: (qid, i) => G.quests.state[qid]?.progress[i] || 0,
      countAlive: (tag) => G.entities.list.filter((e) => e.alive && !e.removed && e.tags?.includes(tag)).length,
      npc: (id) => G.npcs.get(id),
      dialogue: (tree, node) => G.dialogue.startTree(tree, node),
      ending: (id) => game.playEnding(id),
      wait,

      spawn(type, o = {}) {
        const e = new Enemy(type, o);
        G.entities.add(e);
        return e;
      },
      spawnGroup(type, n, x, z, r, o = {}) {
        const out = [];
        for (let i = 0; i < n; i++) {
          const a = rand(0, Math.PI * 2), rr = rand(r * 0.4, r);
          out.push(S.spawn(type, { ...o, x: x + Math.cos(a) * rr, z: z + Math.sin(a) * rr }));
        }
        return out;
      },
      boss(kind, x, z, o = {}) {
        const existing = G.entities.list.find((e) => e.boss && e.alive && e.type === (kind === 'corvo' ? 'corvoBoss' : kind));
        if (existing) return existing;
        const cls = { colossus: ColossusBoss, pimpolho: PimpolhoBoss, alpha: AlphaBoss, corvo: CorvoBoss, vaelthor: VaelthorBoss }[kind];
        const b = new cls({ x, z, ...o });
        G.entities.add(b);
        return b;
      },
      ally(kind, x, z) {
        const map = { isolde: ['allyKnight', 'isolde_ally'], corvo: ['allyRogue', 'corvo_ally'], pimpolho: ['allyJester', 'pimpolho_ally'] };
        const [type, id] = map[kind];
        if (game.allies[id]?.alive) return game.allies[id];
        const a = new Ally(type, { x, z, allyId: id });
        G.entities.add(a);
        game.allies[id] = a;
        return a;
      },
      allyAlive: (id) => !!game.allies[id]?.alive,
      removeAlly(id) { const a = game.allies[id]; if (a) { a.remove(); delete game.allies[id]; } },

      object(o) {
        if (game.objects[o.id]?.alive) return game.objects[o.id];
        const ob = new WorldObject(o);
        G.entities.add(ob);
        game.objects[o.id] = ob;
        return ob;
      },
      hasObject: (id) => !!game.objects[id]?.alive && !game.objects[id].removed,
      nearestObject(type) {
        let best = null, bd = Infinity;
        for (const k in game.objects) {
          const o = game.objects[k];
          if (!o.alive || o.type !== type) continue;
          const d = Math.hypot(o.pos.x - G.player.pos.x, o.pos.z - G.player.pos.z);
          if (d < bd) { bd = d; best = o; }
        }
        return best ? { x: best.pos.x, z: best.pos.z } : null;
      },

      interactable(o) {
        const mesh = o.mesh || makeInteractMesh(o);
        return G.world.addInteractable({ ...o, mesh, update: o.update || mesh?.userData.update });
      },
      hasInteractable: (id) => !!G.world.getInteractable(id),
      removeInteractable: (id) => G.world.removeInteractable(id),
      barrier: (name, on) => G.world.setBarrier(name, on),

      shardPickup(id, x, z, color, onTake, y) {
        const gy = y ?? G.world.groundAt(x, z, 99);
        S.interactable({ id, pos: { x, y: gy, z }, radius: 3, prompt: 'Absorver o fragmento do Coração', model: 'shard', color,
          onInteract: () => {
            S.removeInteractable(id);
            G.fx.burst('light', x, gy + 1.5, z, 1.5);
            G.fx.flash(x, gy + 2, z, color, 60, 0.8, 25);
            G.audio.play('awaken');
            onTake();
          } });
      },

      // ---------- Ato I
      async flameShrineVision() {
        S.removeInteractable('braseiro_chama');
        const b = G.world.anchors.braziers.flame;
        G.fx.burst('fire', b.x, b.y, b.z, 2);
        G.fx.flash(b.x, b.y + 1, b.z, 0xff8030, 80, 1, 30);
        G.cameraRig.shake(0.3);
        game.addPermFlame(b, 1.4);
        G.audio.play('eruption', { pos: b });
        await wait(0.8);
        await game.vision(['Você veio... eu sabia que viria.', 'O fogo lembra de você. Ele lembra do Coração.', 'Mas cuidado... eles sentiram você acender a chama.'], { color: '#ffe8c8' });
        S.give('fragmento_fogo');
        S.set('fireShard');
        S.grantSchool('fogo');
        S.codex('ecos');
        events.emit('interact', { id: 'braseiro_chama' });
        setTimeout(() => G.ui.toast('Pressione 1 para lançar Bola de Fogo. Mire com o centro da tela.', 'info'), 2500);
      },
      denteFight() {
        S.set('denteFight');
        const n = G.npcs.get('dente');
        const x = n ? n.pos.x : -3, z = n ? n.pos.z : 104;
        S.set('denteFighting');
        if (n) { n.visibleCond = () => false; n.checkVisible(); }
        S.spawn('bandit', { x, z, level: 3, tags: ['dente'], name: 'Dente-de-Ferro', hpMul: 1.6, dmgMul: 1.1, aggro: 30, loot: [['pocao_vida', 1]] });
        S.spawn('bandit', { x: x + 2.5, z: z - 1, level: 2, tags: ['dente'], aggro: 30 });
        S.spawn('bandit', { x: x - 2.5, z: z - 1, level: 2, tags: ['dente'], aggro: 30 });
      },
      denteLeave() {
        const n = G.npcs.get('dente');
        if (n) G.fx.emit({ x: n.pos.x, y: n.pos.y + 1, z: n.pos.z, count: 30, color: 0x8a8580, color2: 0x5a5856, size: 1.5, sizeEnd: 3, life: 1, speed: 2, blend: 'normal', alpha: 0.5 });
        S.set('denteResolved');
      },

      // ---------- Corvo
      startCorvoFight(duel) {
        S.set('corvoFighting'); S.set('corvoDuel', !!duel);
        const A2 = G.world.anchors.anchors;
        const b = S.boss('corvo', A2.corvo.x, A2.corvo.z, { duel, level: Math.max(4, G.stats.level) });
        b.introRange = 60;
        if (!duel) {
          S.set('banditsHostile');
          const BC = LOC.banditCamp;
          S.spawnGroup('bandit', 2, BC.x, BC.z, 8, { level: 3, tags: ['camp'], aggro: 35 });
          S.spawnGroup('archer', 2, BC.x, BC.z, 10, { level: 3, tags: ['camp'], aggro: 35 });
        }
      },
      corvoYield(boss) {
        for (const e of G.entities.list) if (e.tags?.includes('camp') && e.alive) { e.passive = true; e.aiTarget = null; e.state = 'return'; }
        G.dialogue.open(DIALOGUES.corvo_derrota, 'start', boss);
      },
      corvoAftermath() {
        const boss = G.entities.list.find((e) => e.type === 'corvoBoss' && e.alive);
        S.set('corvoFighting', false);
        S.give('astrolabio');
        S.give('chave_cela');
        const fate = G.story.flags.corvoFate;
        if (boss) {
          if (fate === 'killed') { boss.invulnerable = false; G.combat.kill(boss, {}); S.give('presas_corvo'); }
          else { G.fx.emit({ x: boss.pos.x, y: boss.pos.y + 1, z: boss.pos.z, count: 40, color: 0x5a5a60, color2: 0x2a2a30, size: 2, sizeEnd: 4, life: 1.2, speed: 2.5, blend: 'normal', alpha: 0.8 }); boss.remove(); G.ui.setBoss(null); G.bossMusic = false; }
        }
        G.bossMusic = false;
        for (const e of G.entities.list) if (e.tags?.includes('camp')) e.remove();
        S.set('campCleared');
        if (fate === 'respect') S.set('corvoFate', 'respect');
      },
      setupCage() {
        const c = G.world.anchors.anchors.cage;
        if (G.story.flags.tomasFree || S.hasInteractable('jaula')) return;
        S.interactable({ id: 'jaula', pos: { x: c.x, z: c.z + 1.9 }, radius: 2.8, prompt: 'Examinar a jaula', onInteract: () => G.dialogue.startTree('jaula') });
      },
      freeTomas(how) {
        const A2 = G.world.anchors;
        if (A2.cageCollider) A2.cageCollider.enabled = false;
        S.removeInteractable('jaula');
        if (how === 'forca') { G.audio.play('hitStone'); G.fx.burst('physical', A2.anchors.cage.x, A2.anchors.cage.y || G.world.heightAt(A2.anchors.cage.x, A2.anchors.cage.z) + 1, A2.anchors.cage.z, 1); }
        else G.audio.play('equip');
        if (how === 'chave') S.take('chave_cela');
        G.ui.showSubtitle('Tomás: “Livre! LIVRE! Vou correndo pra casa contar pro meu pai!”', 3.5);
        S.set('tomasFree');
        if (!G.quests.isStarted('sq_tomas')) G.quests.start('sq_tomas', true);
        if (G.quests.isActive('sq_tomas') && !G.quests.atStage('sq_tomas', 'return')) G.quests.setStage('sq_tomas', 'return');
        S.karma(5);
      },

      // ---------- Ato II
      checkShards() {
        const f = G.story.flags;
        if (f.shardWater && f.shardEarth && f.shardLight && !G.quests.isStarted('mq5')) {
          setTimeout(() => { G.quests.start('mq5'); G.ui.toast('Os quatro fragmentos ressoam! Volte à Capitã Isolde.', 'quest'); }, 2500);
        }
      },
      nearestRune() {
        const r = G.world.anchors.anchors.runeStones.map((p, i) => ({ ...p, i })).filter((p) => !G.story.flags['rune' + p.i]);
        if (!r.length) return null;
        r.sort((a, b) => Math.hypot(a.x - G.player.pos.x, a.z - G.player.pos.z) - Math.hypot(b.x - G.player.pos.x, b.z - G.player.pos.z));
        return { x: r[0].x, z: r[0].z };
      },
      runeFx(r) {
        const y = G.world.heightAt(r.x, r.z);
        G.fx.burst('fire', r.x, y + 2, r.z, 1);
        G.fx.beam(new THREE.Vector3(r.x, y + 2.4, r.z), new THREE.Vector3(r.x, y + 30, r.z), 0xffa040, 0.3, 1.2);
        G.audio.play('barrier');
        const n = [0, 1, 2].filter((i) => G.story.flags['rune' + i]).length;
        G.ui.toast(`Pedra rúnica ativada (${n}/3)`, 'quest');
        if (n >= 3) { G.world.setBarrier('crater', false); G.ui.toast('O selo da cratera se desfaz!', 'quest'); G.audio.play('barrier'); }
        // golens acordam
        if (Math.random() < 0.6) S.spawnGroup('golem', 1, r.x, r.z, 8, { level: 6, tags: ['runeguard'] });
      },
      setupTempleBraziers() {
        const list = G.world.anchors.braziers.temple;
        list.forEach((b, i) => {
          if (G.story.flags['tbrazier' + i]) return;
          const id = 'tb_' + i;
          const light = () => {
            if (G.story.flags['tbrazier' + i]) return;
            G.story.set('tbrazier' + i);
            game.addPermFlame(b, 1.2);
            G.fx.burst('fire', b.x, b.y, b.z, 1.4);
            G.fx.flash(b.x, b.y + 1, b.z, 0xffa040, 50, 0.6);
            G.audio.play('eruption', { pos: b });
            S.removeInteractable(id);
            if (game.objects[id]) { game.objects[id].remove(); delete game.objects[id]; }
            events.emit('interact', { id: 'braseiro_sol' });
            S.spawnGroup('skeleton', 2, b.x, b.z, 6, { level: 5, tags: ['templewave'], aggro: 30 });
            const lit = [0, 1, 2].filter((k) => G.story.flags['tbrazier' + k]).length;
            G.ui.toast(`Braseiro solar aceso (${lit}/3)`, 'quest');
          };
          if (!game.objects[id]?.alive) {
            const o = S.object({ id, type: 'braseiro', name: 'Braseiro Solar', x: b.x, z: b.z, hp: 100, immortal: true, defaultResist: 0, resist: { fire: 1 }, radius: 0.8, height: 1.8, model: 'dummy', onFire: light });
            o.pos.y = b.y - 1.7;
          }
          if (!S.hasInteractable(id)) S.interactable({ id, pos: { x: b.x, y: b.y - 1.7, z: b.z }, radius: 2.8, prompt: () => (G.powers.hasSchool('fogo') ? 'Acender o braseiro com a mão marcada' : 'Um braseiro apagado... precisa de fogo'), onInteract: () => { if (G.powers.hasSchool('fogo')) light(); else G.ui.toast('Você precisa do poder do Fogo.', 'warn'); } });
        });
      },
      nearestUnlitBrazier() {
        const list = G.world.anchors.braziers.temple.map((b, i) => ({ ...b, i })).filter((b) => !G.story.flags['tbrazier' + b.i]);
        if (!list.length) return null;
        list.sort((a, b) => Math.hypot(a.x - G.player.pos.x, a.z - G.player.pos.z) - Math.hypot(b.x - G.player.pos.x, b.z - G.player.pos.z));
        return { x: list[0].x, z: list[0].z };
      },
      async templeVision() {
        G.post.target.psychic = 0.5;
        G.ui.fade(0.55, 1.2, '#fff6dc');
        await wait(1.2);
        G.dialogue.startTree('lyra_templo', 'v1');
      },
      endTempleVision() {
        G.post.target.psychic = 0;
        G.ui.fade(0, 1.2);
        setTimeout(() => {
          S.give('fragmento_luz');
          S.grantSchool('luz');
          events.emit('interact', { id: 'altar_sol' });
        }, 400);
      },
      async spiritRitual() {
        const sp = G.npcs.get('espirito');
        S.set('spiritVisible');
        if (sp) { sp.checkVisible(); G.fx.burst('water', sp.pos.x, sp.pos.y + 1, sp.pos.z, 2); G.fx.ring(sp.pos.x, 1, sp.pos.z, 0x60c0ff, 8, 1); }
        G.audio.play('awaken');
        G.ui.toast('O Espírito do Lago surgiu no píer!', 'quest');
      },

      // ---------- Ato III
      async breakCastleBarrier() {
        S.removeInteractable('barreira_sul');
        const p = G.player;
        game.setState('cutscene');
        const g = G.world.anchors.anchors.castleGateS;
        const colors = [0xff7a2a, 0x3aa8ff, 0xb8864a, 0xffe46a];
        for (let i = 0; i < 4; i++) {
          setTimeout(() => {
            const a = (i / 4) * Math.PI * 2;
            const from = new THREE.Vector3(p.pos.x + Math.cos(a) * 1.5, p.pos.y + 1.6, p.pos.z + Math.sin(a) * 1.5);
            G.fx.beam(from, new THREE.Vector3(g.x, g.y + 3.5, g.z), colors[i], 0.25, 1.4);
            G.fx.burst(['fire', 'water', 'earth', 'light'][i], from.x, from.y, from.z, 0.8);
          }, i * 350);
        }
        G.audio.play('awaken');
        await wait(1.8);
        G.world.setBarrier('castleS', false);
        G.audio.play('barrier');
        G.fx.flash(g.x, g.y + 3, g.z, 0xd080ff, 120, 1, 40);
        G.fx.burst('rift', g.x, g.y + 3, g.z, 3);
        G.cameraRig.shake(0.6);
        G.ui.questBanner('O Selo se Rompe', 'Os portões de Valdren estão abertos', '');
        game.setState('play');
        events.emit('interact', { id: 'barreira_sul' });
      },
      pimpolhoAftermath() {
        const boss = G.entities.list.find((e) => e.type === 'pimpolho' && e.alive);
        if (boss) {
          if (G.story.flags.pimpolhoFate === 'destroyed') { boss.invulnerable = false; G.combat.kill(boss, {}); }
          else { G.fx.burst('toon', boss.pos.x, boss.pos.y + 2, boss.pos.z, 2); boss.remove(); G.ui.setBoss(null); G.bossMusic = false; }
        }
        G.bossMusic = false;
        for (const e of G.entities.list) if (e.tags?.includes('bossAdd')) G.combat.kill(e, {});
        for (const n of G.npcs.list) n.checkVisible();
      },
      startFinalBoss() {
        const f = G.story.flags;
        S.set('vaelthorFight');
        const b = S.boss('vaelthor', 0, -314, { wavered: !!f.vaelthorWavered });
        b.introRange = 60;
        if (!f.isoldeDied && G.quests.isDone('mq5')) { S.set('isoldeInBattle'); S.ally('isolde', -3, -290); }
        if (f.corvoFate === 'ally' || f.corvoFate === 'respect') { S.set('corvoInBattle'); S.ally('corvo', 3, -290); }
        if (f.pimpolhoFate === 'spared') { S.set('pimpolhoInBattle'); S.ally('pimpolho', 0, -288); }
      },
      vaelthorPhase2(boss) {
        const f = G.story.flags;
        const iso = game.allies.isolde_ally;
        if (iso?.alive && f.isoldeTruth !== 'told') {
          G.ui.showSubtitle('Capitã Isolde: “PELO REI ALDREN!”', 3);
          iso.invulnerable = true;
          iso.speed *= 1.6;
          iso.aiTarget = boss;
          setTimeout(() => {
            if (!iso.alive) return;
            G.fx.beam(new THREE.Vector3(boss.pos.x, boss.pos.y + 2, boss.pos.z), iso.center.clone(), 0xb050ff, 0.5, 0.6, { boost: 3 });
            G.fx.burst('rift', iso.pos.x, iso.pos.y + 1, iso.pos.z, 2);
            iso.invulnerable = false;
            G.combat.kill(iso, {});
            S.set('isoldeDied');
            G.ui.showSubtitle('Vaelthor: “Lealdade a um rei que vendia crianças. Que desperdício.”', 4);
          }, 2200);
        }
      },
      vaelthorYield(boss) {
        S.set('vaelthorDefeated');
        G.bossMusic = false;
        for (const e of G.entities.list) if (e.alive && e.kind === 'enemy' && e.team === 'enemy' && !e.boss) G.combat.kill(e, {});
        setTimeout(() => S.finalChoice(boss), 1200);
      },
      finalChoice(boss) {
        let b = boss || G.entities.list.find((e) => e.type === 'vaelthor' && e.alive);
        if (!b) {
          b = S.boss('vaelthor', 0, -312, { skipIntro: true });
          b.yielded = true; b.invulnerable = true; b.state = 'yield';
        }
        G.ui.setBoss(null);
        G.dialogue.open(DIALOGUES.final_escolha, 'v1', b);
      },

      // ---------- Secundárias
      setupSheep(restoreOnly = false) {
        const pen = G.world.anchors.anchors.sheepPen;
        const defs = [
          { id: 'branquinha', name: 'Branquinha', x: 124, z: 108 },
          { id: 'fuligem', name: 'Fuligem', x: 58, z: 60 },
          { id: 'bolota', name: 'Dona Bolota', x: 70, z: 190 },
        ];
        defs.forEach((d, i) => {
          if (game.sheep[d.id] && !game.sheep[d.id].removed) return;
          const penned = G.story.flags['sheep_' + d.id];
          if (!penned && (restoreOnly && !G.quests.isActive('sq_ovelhas'))) return;
          const pos = penned ? { x: pen.x + (i - 1) * 2, z: pen.z + rand(-2, 2) } : d;
          const sh = new Sheep({ id: d.id, name: d.name, x: pos.x, z: pos.z, penned });
          G.entities.add(sh);
          game.sheep[d.id] = sh;
          if (!penned) {
            G.world.addInteractable({ id: 'call_' + d.id, pos: { x: pos.x, z: pos.z }, radius: 2.8, prompt: `Chamar ${d.name}`,
              condition: () => sh.state === 'idle',
              onInteract: () => { sh.state = 'follow'; G.ui.toast(`${d.name} está seguindo você! Leve-a ao curral da fazenda.`, 'info'); G.audio.play('pickup'); } });
          }
        });
      },
      nearestSheep() {
        const pen = G.world.anchors.anchors.sheepPen;
        const list = Object.values(game.sheep).filter((s) => s.state !== 'penned');
        if (list.some((s) => s.state === 'follow')) return { x: pen.x, z: pen.z };
        if (!list.length) return { x: pen.x, z: pen.z };
        list.sort((a, b) => a.distTo(G.player) - b.distTo(G.player));
        return { x: list[0].pos.x, z: list[0].pos.z };
      },
      setupFlowers() {
        const spots = [{ x: -58, z: 52 }, { x: -126, z: 118 }, { x: -182, z: 152 }, { x: 34, z: -24 }, { x: -96, z: 196 }];
        spots.forEach((p, i) => {
          if (G.story.flags['flower_' + i] || S.hasInteractable('flor_' + i)) return;
          S.interactable({ id: 'flor_' + i, pos: { x: p.x, z: p.z }, radius: 2.4, prompt: 'Colher Flor-da-Lua', model: 'flower',
            onInteract: () => { G.story.set('flower_' + i); S.removeInteractable('flor_' + i); S.give('flor_lua'); G.fx.burst('heal', p.x, G.world.heightAt(p.x, p.z) + 0.5, p.z, 0.5); } });
        });
      },
      nearestFlower() {
        const list = G.world.interactables.filter((it) => it.id.startsWith('flor_'));
        if (!list.length) return null;
        list.sort((a, b) => Math.hypot(a.pos.x - G.player.pos.x, a.pos.z - G.player.pos.z) - Math.hypot(b.pos.x - G.player.pos.x, b.pos.z - G.player.pos.z));
        return { x: list[0].pos.x, z: list[0].pos.z };
      },
      setupRing() {
        if (G.inventory.has('anel_helena') || G.story.flags.ringFound || S.hasInteractable('anel_rio')) return;
        const R = G.world.terrain.river;
        let bi = 0, bd = Infinity;
        R.pts.forEach((p, i) => { const d = Math.hypot(p[0] - (LOC.mill.x + 40), p[1] - (LOC.mill.z + 8)); if (d < bd) { bd = d; bi = i; } });
        const [x, z] = R.pts[bi];
        S.interactable({ id: 'anel_rio', pos: { x, y: R.surface[bi] - 0.6, z }, radius: 2.6, prompt: 'Pegar o objeto brilhante no leito do rio', model: 'glint',
          onInteract: () => { S.removeInteractable('anel_rio'); G.story.set('ringFound'); S.give('anel_helena'); G.ui.showSubtitle('Um anel de prata, gelado como a lua.', 3); } });
      },
      spawnAlpha() {
        const D = LOC.alphaDen;
        const b = S.boss('alpha', D.x, D.z);
        b.tags = ['alpha'];
        S.spawnGroup('wolf', 2, D.x, D.z, 6, { level: 4, tags: ['alphapack'] });
      },
      setupPaintDoodles() {
        const spots = {
          vermelha: { type: 'doodleRed', x: LOC.mushrooms.x, z: LOC.mushrooms.z, item: 'tinta_vermelha' },
          amarela: { type: 'doodleYellow', x: LOC.sunfields.x - 6, z: LOC.sunfields.z + 4, item: 'tinta_amarela' },
          azul: { type: 'doodleBlue', x: LOC.lake.x + 4, z: LOC.lake.z - LOC.lake.r - 12, item: 'tinta_azul' },
        };
        for (const k in spots) {
          const s = spots[k];
          if (G.inventory.has(s.item) || G.story.flags['paint_' + k]) continue;
          if (S.countAlive('paint_' + k) > 0) continue;
          S.spawn(s.type, { x: s.x, z: s.z, level: 5, tags: ['paint_' + k], loot: [[s.item, 1]], leash: 60 });
        }
      },
      nextPaintMarker() {
        const order = [['tinta_vermelha', LOC.mushrooms], ['tinta_amarela', LOC.sunfields], ['tinta_azul', { x: LOC.lake.x + 4, z: LOC.lake.z - LOC.lake.r - 12 }]];
        for (const [it, l] of order) if (!G.inventory.has(it)) return { x: l.x, z: l.z };
        return null;
      },
      shatterBlackStone() {
        const bs = G.world.anchors.anchors.blackStone;
        const y = G.world.heightAt(bs.x, bs.z);
        G.story.set('shadowPact', 'destroyed');
        G.fx.burst('light', bs.x, y + 2.5, bs.z, 3);
        G.fx.beam(new THREE.Vector3(bs.x, y, bs.z), new THREE.Vector3(bs.x, y + 40, bs.z), 0xfff0b0, 1.2, 1.8);
        G.fx.flash(bs.x, y + 3, bs.z, 0xffffe0, 120, 1, 40);
        G.audio.play('awaken');
        S.karma(15);
        S.xp(250);
        G.story.record('Destruiu a Pedra Negra');
        G.ui.showSubtitle('A Pedra Negra se parte com um grito que ecoa pelo vale... e então, silêncio.', 4);
      },
      startWindTrial(retry = false) {
        if (game.trial) return;
        if (retry && G.quests.state.sq_zefiro) G.quests.state.sq_zefiro.progress[0] = 0;
        const H = LOC.hermitTower;
        for (const k in game.objects) if (game.objects[k].type === 'cristal') { game.objects[k].remove(); delete game.objects[k]; }
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + 0.3, r = 12 + (i % 3) * 6;
          let x = H.x + Math.cos(a) * r, z = H.z + Math.sin(a) * r;
          S.object({ id: 'cristal_' + i, type: 'cristal', name: 'Cristal de Vento', x, z, hp: 1, model: 'crystal', radius: 0.7, height: 3, xp: 5 });
        }
        game.trial = { t: 90, lastTick: -1 };
        G.ui.toast('Quebre os 8 cristais de vento em 90 segundos!', 'quest');
      },
      memory(n) {
        if (G.story.flags['memory' + n]) return;
        G.story.set('memory' + n);
        const c = G.story.inc('lyraMemories');
        G.story.addCodex(MEMORY_IDS[n - 1]);
        if (!G.quests.isStarted('sq_memorias')) G.quests.start('sq_memorias');
        G.audio.play('memory');
        setTimeout(() => G.ui.questBanner('Memória de Lyra', ({ 1: 'A Primeira Luz', 2: 'O Lago dos Sonhos', 3: 'O Riso do Bobo', 4: 'A Canção do Vento', 5: 'A Noite do Eclipse' })[n], `${c} de 5 memórias — leia nas Crônicas [L]`), 400);
        const p = G.player;
        G.fx.emit({ x: p.pos.x, y: p.pos.y + 1.5, z: p.pos.z, count: 40, color: 0xfff0ff, color2: 0x80c0ff, size: 0.4, life: 1.6, speed: 2, up: 1.5, radius: 1 });
      },
    };
    return S;
  }

  // ---------------------------------------------------------------- depuração
  setupDebug() {
    const dbg = {
      tp: (x, z) => { const p = G.player; p.pos.set(x, G.world.groundAt(x, z, 99), z); G.cameraRig.pivot.set(0, 0, 0); },
      give: (id, n = 1) => G.inventory.add(id, n),
      school: (s) => G.powers.grantSchool(s),
      allSchools: () => ['fogo', 'agua', 'luz', 'terra', 'vento', 'psiquico', 'toon', 'sombra'].forEach((s) => G.powers.grantSchool(s, true)),
      level: (n) => { while (G.stats.level < n) G.stats.addXp(G.stats.xpToNext()); },
      stage: (q, s) => G.quests.setStage(q, s),
      complete: (q) => G.quests.complete(q),
      flag: (k, v = true) => G.questCtx.set(k, v),
      boss: (k) => G.questCtx.boss(k, G.player.pos.x + 10, G.player.pos.z),
      spawn: (t, n = 1) => G.questCtx.spawnGroup(t, n, G.player.pos.x + 8, G.player.pos.z, 4, { level: G.stats.level }),
      hour: (h) => (G.time.hours = h),
      god: () => { G.player.invulnT = 1e9; },
      ending: (id) => G.questCtx.ending(id),
      cast: (i) => G.powers.cast(i),
    };
    window.__dbg = dbg;
  }
}

function makeInteractMesh(o) {
  const g = new THREE.Group();
  if (o.model === 'lectern') {
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, flatShading: true });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 1.1, 6), wood); post.position.y = 0.55;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.6), wood); top.position.y = 1.15; top.rotation.x = -0.4;
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.45), new THREE.MeshStandardMaterial({ color: 0x7a1a1a, flatShading: true })); book.position.y = 1.22; book.rotation.x = -0.4;
    g.add(post, top, book);
  } else if (o.model === 'shard') {
    const col = new THREE.Color(o.color || 0xffffff);
    const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.5, flatShading: true }));
    cr.position.y = 1.6;
    cr.scale.y = 1.6;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 30, 8, 1, true), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(1.5), transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    pillar.position.y = 15;
    g.add(cr, pillar);
    g.userData.update = (dt, t) => { cr.rotation.y = t * 1.5; cr.position.y = 1.6 + Math.sin(t * 2) * 0.2; };
  } else if (o.model === 'flower') {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), new THREE.MeshStandardMaterial({ color: 0x3a6a2a }));
    stem.position.y = 0.25;
    const petals = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color: 0xd8e8ff, emissive: 0x8ab0ff, emissiveIntensity: 1 }));
    petals.position.y = 0.55;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.world.glowTex, color: 0xa0c8ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.y = 0.55; glow.scale.setScalar(1.2);
    g.add(stem, petals, glow);
    g.userData.update = (dt, t) => { const n = G.sky.night; petals.material.emissiveIntensity = 0.4 + n * 2; glow.material.opacity = 0.25 + n * 0.6; glow.scale.setScalar(1 + n * 1.5 + Math.sin(t * 2) * 0.1); };
  } else if (o.model === 'glint') {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.world.glowTex, color: 0xe0f0ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(1.2);
    g.add(glow);
    g.userData.update = (dt, t) => { glow.scale.setScalar(0.8 + Math.abs(Math.sin(t * 3)) * 0.8); };
  } else if (o.glow) {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: G.world.glowTex, color: o.glow, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.y = 1.6; glow.scale.setScalar(2);
    g.add(glow);
    g.userData.update = (dt, t) => { glow.scale.setScalar(1.8 + Math.sin(t * 3) * 0.3); };
  }
  return g.children.length ? g : null;
}

const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
const tick = () => new Promise((r) => setTimeout(r, 0));
