// Poderes naturais (fogo, água, luz, terra, vento) e sobrenaturais (psíquico, toon, sombra).
import * as THREE from 'three';
import { G } from '../core/context.js';
import { events } from '../core/Events.js';
import { rand, clamp, lerp, easeOutCubic, easeInCubic } from '../core/math.js';
import { isHostile } from '../entities/Entities.js';

export const SCHOOLS = {
  fogo: { name: 'Fogo', kind: 'natural', element: 'fire', color: '#ff6a2a', desc: 'A chama primordial: destruição e calor. Queima inimigos ao longo do tempo.' },
  agua: { name: 'Água', kind: 'natural', element: 'water', color: '#3aa8ff', desc: 'As marés do Lago Espelhado: empurra, encharca e cura.' },
  luz: { name: 'Luz', kind: 'natural', element: 'light', color: '#ffd84a', desc: 'O sol esquecido do templo: devastador contra mortos-vivos e sombras.' },
  terra: { name: 'Terra', kind: 'natural', element: 'earth', color: '#b8864a', desc: 'A força das montanhas: espinhos de pedra e pele de granito.' },
  vento: { name: 'Vento', kind: 'natural', element: 'wind', color: '#7ae8c8', desc: 'O sopro dos picos: lâminas cortantes e tempestades de raios.' },
  psiquico: { name: 'Psíquico', kind: 'supernatural', element: 'psychic', color: '#e070ff', desc: 'O poder da mente vindo do Sonhar: mover e dominar.' },
  toon: { name: 'Toon', kind: 'supernatural', element: 'toon', color: '#ffdf3a', desc: 'A imaginação de uma criança tornada lei física. Bigornas. Marretas. Física de desenho animado.' },
  sombra: { name: 'Sombra', kind: 'supernatural', element: 'shadow', color: '#8a50ff', desc: 'O medo que habita o Véu: passos entre sombras e o roubo da vida.' },
};

export const POWERS = {
  bola_fogo: { school: 'fogo', tier: 1, name: 'Bola de Fogo', mana: 12, cd: 1.1, anim: 'cast', base: 30,
    desc: 'Arremessa uma esfera flamejante que explode em área e incendeia os alvos.' },
  erupcao: { school: 'fogo', tier: 2, name: 'Erupção', mana: 28, cd: 7, anim: 'castBoth', base: 55,
    desc: 'Um pilar de fogo irrompe do chão no ponto mirado, lançando inimigos ao ar.' },
  lanca_agua: { school: 'agua', tier: 1, name: "Lança d'Água", mana: 10, cd: 0.9, anim: 'cast', base: 22,
    desc: 'Um jato afiado que atravessa inimigos, empurra e os deixa encharcados (combina com raios!).' },
  mare_curativa: { school: 'agua', tier: 2, name: 'Maré Curativa', mana: 30, cd: 14, anim: 'castSelf', base: 0.3,
    desc: 'Restaura vida ao longo do tempo, remove queimaduras e empurra inimigos próximos com uma onda.' },
  lanca_solar: { school: 'luz', tier: 1, name: 'Lança Solar', mana: 14, cd: 1.5, anim: 'cast', base: 26,
    desc: 'Um raio de luz instantâneo que perfura tudo em linha. Dano dobrado contra mortos-vivos e sombras.' },
  clarao_sagrado: { school: 'luz', tier: 2, name: 'Clarão Sagrado', mana: 26, cd: 10, anim: 'castSelf', base: 30,
    desc: 'Explosão de luz ao seu redor que cega inimigos e restaura parte da sua vida.' },
  espinhos_pedra: { school: 'terra', tier: 1, name: 'Espinhos de Pedra', mana: 18, cd: 4, anim: 'castBoth', base: 32,
    desc: 'Uma fileira de espinhos rochosos irrompe à sua frente, arremessando e retardando inimigos.' },
  pele_pedra: { school: 'terra', tier: 2, name: 'Pele de Pedra', mana: 25, cd: 20, anim: 'castSelf', base: 10,
    desc: 'Por alguns segundos, reduz o dano recebido em 40%, impede atordoamentos e fere quem o atacar.' },
  lamina_vento: { school: 'vento', tier: 1, name: 'Lâmina de Vento', mana: 8, cd: 0.6, anim: 'cast', base: 18,
    desc: 'Uma lâmina de ar veloz que atravessa todos os inimigos no caminho.' },
  tempestade: { school: 'vento', tier: 2, name: 'Tempestade', mana: 32, cd: 12, anim: 'castBoth', base: 28,
    desc: 'Invoca uma nuvem de tempestade que dispara raios contra inimigos na área. Alvos molhados são eletrocutados.' },
  telecinese: { school: 'psiquico', tier: 1, name: 'Telecinese', mana: 20, cd: 5, anim: 'cast', base: 35,
    desc: 'Ergue o inimigo mirado com a mente e o arremessa adiante. Gigantes apenas sofrem o impacto mental.' },
  dominio_mental: { school: 'psiquico', tier: 2, name: 'Domínio Mental', mana: 35, cd: 18, anim: 'cast', base: 10,
    desc: 'Toma o controle da mente de um inimigo, que passa a lutar ao seu lado por alguns segundos.' },
  bigorna: { school: 'toon', tier: 1, name: 'Bigorna!', mana: 22, cd: 6, anim: 'castBoth', base: 60,
    desc: 'Uma bigorna cai do céu no ponto mirado. Achata, atordoa e faz um barulho ótimo.' },
  marreta: { school: 'toon', tier: 2, name: 'Marreta Gigante', mana: 24, cd: 7, anim: 'castBoth', base: 45,
    desc: 'Invoca uma marreta de desenho animado que golpeia à sua frente e manda inimigos para longe.' },
  passo_sombrio: { school: 'sombra', tier: 1, name: 'Passo Sombrio', mana: 15, cd: 4, anim: null, base: 25,
    desc: 'Teleporta-se através das sombras, ferindo inimigos na partida e na chegada.' },
  drenar_vida: { school: 'sombra', tier: 2, name: 'Drenar Vida', mana: 30, cd: 12, anim: 'cast', base: 18,
    desc: 'Rouba a força vital do alvo em três pulsos, curando você e deixando-o vulnerável.' },
};

export const SCHOOL_POWERS = {};
for (const id in POWERS) (SCHOOL_POWERS[POWERS[id].school] ||= []).push(id);

const _v = new THREE.Vector3();

export class PowerManager {
  constructor() {
    this.schools = new Set();
    this.ranks = {};
    this.slots = [null, null, null, null];
    this.cds = {};
  }

  hasSchool(s) { return this.schools.has(s); }

  grantSchool(s, silent = false) {
    if (this.schools.has(s)) return;
    this.schools.add(s);
    const first = SCHOOL_POWERS[s].find((id) => POWERS[id].tier === 1);
    this.ranks[first] = Math.max(1, this.ranks[first] || 0);
    this.autoSlot(first);
    if (!silent) events.emit('schoolGranted', s);
  }

  autoSlot(id) {
    if (this.slots.includes(id)) return;
    const i = this.slots.indexOf(null);
    if (i >= 0) this.slots[i] = id;
  }

  canUpgrade(id) {
    const p = POWERS[id];
    if (!this.schools.has(p.school)) return { ok: false, why: 'Escola não despertada' };
    const r = this.ranks[id] || 0;
    if (r >= 3) return { ok: false, why: 'Nível máximo' };
    if (G.stats.skillPoints < 1) return { ok: false, why: 'Sem pontos de essência' };
    if (r === 0 && p.tier === 2 && G.stats.level < 3) return { ok: false, why: 'Requer nível 3' };
    if (r === 0 && p.tier === 2) {
      const t1 = SCHOOL_POWERS[p.school].find((x) => POWERS[x].tier === 1);
      if ((this.ranks[t1] || 0) < 1) return { ok: false, why: 'Requer o primeiro poder da escola' };
    }
    return { ok: true };
  }

  upgrade(id) {
    const c = this.canUpgrade(id);
    if (!c.ok) return false;
    G.stats.skillPoints -= 1;
    this.ranks[id] = (this.ranks[id] || 0) + 1;
    if (this.ranks[id] === 1) this.autoSlot(id);
    G.audio?.play('upgrade');
    return true;
  }

  cooldownOf(id) { return this.cds[id] || 0; }
  maxCd(id) { const r = this.ranks[id] || 1; return POWERS[id].cd * (1 - 0.1 * (r - 1)); }
  manaCost(id) { return POWERS[id].mana; }

  update(dt) {
    for (const k in this.cds) { this.cds[k] -= dt; if (this.cds[k] <= 0) delete this.cds[k]; }
  }

  mult(id) {
    const p = POWERS[id];
    const d = G.stats.derived();
    const r = this.ranks[id] || 1;
    const sk = SCHOOLS[p.school].kind === 'natural' ? d.natPower : d.supPower;
    return sk * (1 + 0.25 * (r - 1));
  }

  cast(slot) {
    const id = this.slots[slot];
    const pl = G.player;
    if (!id) { G.ui?.toast('Nenhum poder neste espaço. Abra Poderes [K].', 'info'); return; }
    if (!(this.ranks[id] > 0)) return;
    if (pl.state !== 'normal' && !(pl.state === 'attack' && pl.anim.progress > 0.55)) return;
    if (this.cds[id] > 0) { G.audio?.play('denied'); return; }
    const cost = this.manaCost(id);
    if (pl.mana < cost) { G.ui?.flashBar('mana'); G.ui?.toast('Mana insuficiente', 'warn'); G.audio?.play('denied'); return; }
    const p = POWERS[id];
    // validação de alvo para poderes que exigem inimigo
    const aim = G.cameraRig.getAim(60, (e) => isHostile('player', e.team));
    let target = pl.lockTarget && pl.lockTarget.alive ? pl.lockTarget : aim.entity && isHostile('player', aim.entity.team) ? aim.entity : null;
    if (['telecinese', 'dominio_mental', 'drenar_vida'].includes(id)) {
      if (!target) target = this.autoTarget(25);
      if (!target || target.team === 'object' || pl.distTo(target) > 26) { G.ui?.toast('Mire em um inimigo', 'warn'); G.audio?.play('denied'); return; }
    }
    pl.mana -= cost;
    this.cds[id] = this.maxCd(id);
    pl.anim.stop();
    const pc = { id, rank: this.ranks[id], aim, target, mult: this.mult(id) };
    if (!p.anim) { this.execute(pc); return; }
    pl.state = 'cast';
    pl.castT = 0;
    pl.pendingCast = pc;
    pl.anim.play(p.anim, { speed: 1.25 });
    G.audio?.play('castStart', { school: p.school });
    events.emit('powerCast', id);
  }

  autoTarget(maxD) {
    const pl = G.player;
    const f = G.cameraRig.flatForward(new THREE.Vector3());
    let best = null, bs = Infinity;
    for (const e of G.entities.list) {
      if (!e.alive || e.removed || !e.targetable || !isHostile('player', e.team) || e.team === 'object') continue;
      const dx = e.pos.x - pl.pos.x, dz = e.pos.z - pl.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > maxD) continue;
      const dot = (dx * f.x + dz * f.z) / (d || 1);
      if (dot < 0.5) continue;
      const s = d * (2 - dot);
      if (s < bs) { bs = s; best = e; }
    }
    return best;
  }

  // Ponto no chão para poderes de área, limitado ao alcance
  groundPoint(aim, maxRange) {
    const pl = G.player;
    let p = aim.point.clone();
    if (aim.entity) p.copy(aim.entity.pos);
    const dx = p.x - pl.pos.x, dz = p.z - pl.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > maxRange || aim.dist >= 59) {
      const f = G.cameraRig.flatForward(new THREE.Vector3());
      const r = Math.min(d, maxRange);
      const ux = d > 0.1 && aim.dist < 59 ? dx / d : f.x, uz = d > 0.1 && aim.dist < 59 ? dz / d : f.z;
      p.set(pl.pos.x + ux * r, 0, pl.pos.z + uz * r);
      if (aim.dist >= 59) p.set(pl.pos.x + f.x * maxRange * 0.6, 0, pl.pos.z + f.z * maxRange * 0.6);
    }
    p.y = G.world.groundAt(p.x, p.z, pl.pos.y + 5);
    return p;
  }

  execute(pc) {
    const fn = EXEC[pc.id];
    if (!fn) return;
    const pl = G.player;
    const hand = pl.handPosition(new THREE.Vector3(), true);
    const aimDir = pc.target ? pc.target.center.clone().sub(hand).normalize() : pc.aim.point.clone().sub(hand).normalize();
    fn({ ...pc, player: pl, hand, dir: aimDir, base: POWERS[pc.id].base * pc.mult });
    G.audio?.play('power_' + pc.id, { pos: pl.pos });
  }

  serialize() { return { schools: [...this.schools], ranks: { ...this.ranks }, slots: [...this.slots] }; }
  load(d) {
    this.schools = new Set(d.schools || []);
    this.ranks = { ...(d.ranks || {}) };
    this.slots = d.slots ? [...d.slots] : [null, null, null, null];
    this.cds = {};
  }
}

// ======================= Execuções =======================
const toonMat = (c) => new THREE.MeshToonMaterial({ color: c });
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
outlineMat.userData = {};

function withOutline(mesh, s = 1.06) {
  const o = new THREE.Mesh(mesh.geometry, outlineMat);
  o.scale.setScalar(s);
  o.userData.keepMat = true;
  mesh.add(o);
  return mesh;
}

function pulseScreen(kind, amount = 1, dur = 1.0) {
  const post = G.post;
  post.target[kind] = amount;
  clearTimeout(post['_t' + kind]);
  post['_t' + kind] = setTimeout(() => (post.target[kind] = 0), dur * 1000);
}

const EXEC = {
  bola_fogo(c) {
    G.projectiles.spawn({
      pos: c.hand, dir: c.dir, speed: 28, team: 'player', element: 'fire', visual: 'sphere', color: 0xff8a2a, size: 1.15, source: c.player,
      damage: { amount: c.base, type: 'fire', status: [{ id: 'burn', dur: 3, power: 4 * c.mult, source: c.player }], poise: 18 },
      explode: { radius: 3, info: { amount: c.base * 0.6, type: 'fire', status: [{ id: 'burn', dur: 3, power: 3 * c.mult, source: c.player }], knockback: 4, poise: 12 }, light: 0xff7020, ringColor: 0xff8a30 },
    });
    G.fx.flash(c.hand.x, c.hand.y, c.hand.z, 0xff8030, 20, 0.2);
  },

  erupcao(c) {
    const p = G.powers.groundPoint(c.aim, 22);
    G.fx.telegraph({ shape: 'circle', x: p.x, z: p.z, radius: 3.6, dur: 0.5, color: 0xff7a20, onDone: () => {
      G.combat.areaDamage(p.x, p.y + 1, p.z, 3.6, 'player', { amount: c.base, type: 'fire', source: c.player, knockback: 3, up: 9, poise: 40, status: [{ id: 'burn', dur: 4, power: 5 * c.mult, source: c.player }] });
      // pilar de fogo
      const geo = new THREE.CylinderGeometry(1.6, 2.6, 12, 14, 1, true);
      geo.translate(0, 6, 0);
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.9, 0.2), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(p);
      G.fx.addMesh(m, 1.1, (it, k) => { m.scale.set(1 + k * 0.5, k < 0.15 ? k / 0.15 : 1, 1 + k * 0.5); mat.opacity = 0.85 * (1 - k); m.rotation.y += 0.2; }, () => geo.dispose());
      for (let i = 0; i < 4; i++) setTimeout(() => G.fx.emit({ x: p.x, y: p.y + 0.5, z: p.z, count: 40, color: 0xffe080, color2: 0xff2000, size: 1.2, sizeEnd: 0.3, life: 0.9, speed: 3, up: 14, radius: 1.8, drag: 1.5 }), i * 80);
      G.fx.burst('fire', p.x, p.y + 1, p.z, 1.5);
      G.fx.ring(p.x, p.y, p.z, 0xff6020, 6, 0.6);
      G.fx.flash(p.x, p.y + 3, p.z, 0xff6020, 80, 0.6, 30);
      G.cameraRig.shake(0.45);
      G.audio?.play('eruption', { pos: p });
    } });
  },

  lanca_agua(c) {
    G.projectiles.spawn({
      pos: c.hand, dir: c.dir, speed: 38, team: 'player', element: 'water', visual: 'lance', color: 0x6ac8ff, size: 1.2, pierce: 2 + c.rank, source: c.player,
      damage: { amount: c.base, type: 'water', knockback: 6, poise: 16, status: [{ id: 'wet', dur: 7 }] },
    });
  },

  mare_curativa(c) {
    const pl = c.player;
    const max = G.stats.derived().maxHp;
    G.combat.heal(pl, max * 0.1);
    G.combat.applyStatus(pl, 'regen', 3.5, { power: max * c.base * 0.15 * (1 + 0.2 * (c.rank - 1)) });
    for (const s of ['burn', 'slow', 'blind']) G.combat.removeStatus(pl, s);
    G.combat.areaDamage(pl.pos.x, pl.pos.y + 1, pl.pos.z, 6.5, 'player', { amount: 8 * c.mult, type: 'water', source: pl, knockback: 12, up: 2, status: [{ id: 'wet', dur: 8 }], poise: 30 });
    G.fx.ring(pl.pos.x, pl.pos.y, pl.pos.z, 0x5ac0ff, 7, 0.7, 0.9);
    G.fx.emit({ x: pl.pos.x, y: pl.pos.y + 0.2, z: pl.pos.z, count: 70, color: 0xd0f4ff, color2: 0x3a8ae0, size: 0.5, life: 0.9, speed: 9, radius: 1, outward: true, outwardY: 0.4, gravity: 6, blend: 'normal', alpha: 0.85 });
    G.fx.burst('heal', pl.pos.x, pl.pos.y + 1, pl.pos.z, 1.5);
  },

  lanca_solar(c) {
    const from = c.hand.clone();
    const dir = c.dir.clone();
    let len = 35;
    const tt = G.world.terrain.raycast(from, dir, len);
    if (tt >= 0) len = tt;
    const ct = G.world.collision.raycast(from, dir, len, (cc) => cc.solidToProjectiles && !cc.platform);
    if (ct < len) len = ct;
    const to = from.clone().addScaledVector(dir, len);
    // dano ao longo da linha
    for (const e of G.entities.list) {
      if (!e.alive || e.removed || !e.targetable || !isHostile('player', e.team)) continue;
      const cpos = e.center;
      _v.subVectors(cpos, from);
      const t = clamp(_v.dot(dir), 0, len);
      const closest = from.clone().addScaledVector(dir, t);
      if (closest.distanceTo(cpos) < Math.max(1.0, e.radius + 0.6)) {
        G.combat.applyDamage(e, { amount: c.base, type: 'light', source: c.player, knockback: 2, poise: 14, status: [{ id: 'blind', dur: 2.5, chance: 0.3 }] });
        G.fx.burst('light', cpos.x, cpos.y, cpos.z, 0.5);
      }
    }
    G.fx.beam(from, to, 0xffe070, 0.22, 0.35);
    G.fx.burst('light', to.x, to.y, to.z, 0.6);
    G.fx.flash(from.x, from.y, from.z, 0xfff0a0, 25, 0.25);
  },

  clarao_sagrado(c) {
    const pl = c.player;
    G.combat.areaDamage(pl.pos.x, pl.pos.y + 1, pl.pos.z, 7.5, 'player', { amount: c.base, type: 'light', source: pl, knockback: 5, poise: 25, status: [{ id: 'blind', dur: 4 }] });
    G.combat.heal(pl, G.stats.derived().maxHp * (0.1 + 0.03 * c.rank));
    G.fx.emit({ x: pl.pos.x, y: pl.pos.y + 1, z: pl.pos.z, count: 80, color: 0xffffff, color2: 0xffc840, size: 0.6, sizeEnd: 0.1, life: 0.8, speed: 12, drag: 3 });
    G.fx.emit({ x: pl.pos.x, y: pl.pos.y + 1, z: pl.pos.z, count: 3, color: 0xffffe0, color2: 0xffd060, size: 14, sizeEnd: 2, life: 0.35, speed: 0 });
    G.fx.ring(pl.pos.x, pl.pos.y, pl.pos.z, 0xffe070, 8, 0.6, 1);
    G.fx.flash(pl.pos.x, pl.pos.y + 2, pl.pos.z, 0xfff0b0, 90, 0.5, 30);
  },

  espinhos_pedra(c) {
    const pl = c.player;
    const f = c.target ? new THREE.Vector3(c.target.pos.x - pl.pos.x, 0, c.target.pos.z - pl.pos.z).normalize() : G.cameraRig.flatForward(new THREE.Vector3());
    const hit = new Set();
    const n = 8 + c.rank * 2;
    const spikeGeo = new THREE.ConeGeometry(0.6, 2.6, 5);
    spikeGeo.translate(0, 1.3, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a7a64, flatShading: true, roughness: 0.9 });
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const x = pl.pos.x + f.x * (1.8 + i * 1.5) + rand(-0.3, 0.3), z = pl.pos.z + f.z * (1.8 + i * 1.5) + rand(-0.3, 0.3);
        const y = G.world.groundAt(x, z, pl.pos.y + 4);
        if (G.world.terrain.waterAt(x, z)?.depth > 1) return;
        const m = new THREE.Mesh(spikeGeo, mat);
        m.position.set(x, y - 2.6, z);
        m.rotation.set(rand(-0.25, 0.25), rand(0, 6), rand(-0.25, 0.25));
        m.scale.setScalar(rand(0.8, 1.3));
        m.castShadow = true;
        m.userData.keepMat = true;
        G.fx.addMesh(m, 1.4, (it, k) => {
          const up = k < 0.12 ? easeOutCubic(k / 0.12) : k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
          m.position.y = y - 2.6 + up * 2.6;
        });
        G.fx.burst('earth', x, y + 0.3, z, 0.5);
        for (const e of G.entities.inRadius(x, z, 1.7, (e) => isHostile('player', e.team) && !hit.has(e))) {
          hit.add(e);
          G.combat.applyDamage(e, { amount: c.base, type: 'earth', source: pl, knockback: 2, up: 6, poise: 25, status: [{ id: 'slow', dur: 2.5, power: 0.45 }] });
        }
        if (i % 2 === 0) G.audio?.play('spike', { pos: { x, y, z }, vol: 0.6 });
      }, i * 55);
    }
    G.cameraRig.shake(0.2);
  },

  pele_pedra(c) {
    const pl = c.player;
    const dur = 10 + c.rank * 2;
    pl.buffs.stoneskin = { t: dur, onEnd: () => { pl.statusTintOverride = null; } };
    G.fx.burst('earth', pl.pos.x, pl.pos.y + 1, pl.pos.z, 1.2);
    G.fx.emit({ x: pl.pos.x, y: pl.pos.y + 1, z: pl.pos.z, count: 40, color: 0xa89070, color2: 0x6a5a48, size: 0.5, life: 0.6, speed: 5, radius: 2, gravity: -2, blend: 'normal' });
    G.ui?.floatText(pl.center, 'Pele de Pedra', 'buff');
  },

  lamina_vento(c) {
    G.projectiles.spawn({
      pos: c.hand, dir: c.dir, speed: 44, team: 'player', element: 'wind', visual: 'blade', color: 0xc0fff0, size: 1.1 + c.rank * 0.15, pierce: 99, source: c.player, life: 1.2,
      damage: { amount: c.base, type: 'wind', knockback: 5, poise: 10 },
    });
  },

  tempestade(c) {
    const p = G.powers.groundPoint(c.aim, 25);
    const R = 6.5;
    // nuvem
    const cloud = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.1, R * 0.8, 1.6, 16), new THREE.MeshStandardMaterial({ color: 0x2a2e3a, transparent: true, opacity: 0.0, flatShading: true }));
    cloud.position.set(p.x, p.y + 14, p.z);
    G.fx.addMesh(cloud, 3.2, (it, k) => { cloud.material.opacity = (k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 1) * 0.85; cloud.rotation.y += 0.01; });
    G.fx.telegraph({ shape: 'circle', x: p.x, z: p.z, radius: R, dur: 2.6, color: 0x80a0ff });
    const strikes = 6 + c.rank;
    for (let i = 0; i < strikes; i++) {
      setTimeout(() => {
        const foes = G.entities.inRadius(p.x, p.z, R, (e) => isHostile('player', e.team));
        let tx, tz;
        let target = foes.length ? foes[Math.floor(Math.random() * foes.length)] : null;
        if (target) { tx = target.pos.x; tz = target.pos.z; }
        else { const a = rand(0, 6.28), r = rand(0, R); tx = p.x + Math.cos(a) * r; tz = p.z + Math.sin(a) * r; }
        const ty = G.world.groundAt(tx, tz, p.y + 10);
        G.fx.lightning(new THREE.Vector3(tx + rand(-1, 1), p.y + 14, tz + rand(-1, 1)), new THREE.Vector3(tx, ty, tz));
        G.fx.burst('lightning', tx, ty + 0.5, tz, 0.8);
        G.combat.areaDamage(tx, ty + 1, tz, 1.8, 'player', { amount: c.base, type: 'lightning', source: c.player, knockback: 2, poise: 20 });
        G.audio?.play('thunder', { pos: { x: tx, y: ty, z: tz } });
        G.cameraRig.shake(0.12);
      }, 350 + i * (2200 / strikes));
    }
  },

  telecinese(c) {
    const T = c.target;
    const pl = c.player;
    pulseScreen('psychic', 1, 0.8);
    const heavy = T.boss || T.mass > 3.5;
    G.fx.beam(c.hand, T.center, 0xe070ff, 0.12, 0.5);
    if (heavy) {
      G.combat.applyDamage(T, { amount: c.base * 1.2, type: 'psychic', source: pl, poise: 40, status: [{ id: 'stun', dur: 0.8 }] });
      G.fx.burst('psychic', T.center.x, T.center.y, T.center.z, 1.5);
      return;
    }
    const startY = T.pos.y;
    T.liftT = 2.0;
    T.curAttack = null; if (T.state) T.state = 'stagger';
    const throwDir = G.cameraRig.flatForward(new THREE.Vector3());
    G.fx.addItem({ t: 0, dur: 1.55, update: (it, k) => {
      if (!T.alive) return;
      const t = it.t;
      if (t < 0.85) {
        T.pos.y = startY + easeOutCubic(t / 0.85) * 3.2;
        T.object.rotation.z = Math.sin(t * 8) * 0.15;
        if (Math.random() < 0.5) G.fx.trail('psychic', T.center.x + rand(-0.5, 0.5), T.center.y + rand(-0.6, 0.6), T.center.z + rand(-0.5, 0.5));
      } else if (!it.thrown) {
        it.thrown = true;
        T.liftT = 0;
        T.vel.y = 4;
        T.knock.set(throwDir.x * 22, 0, throwDir.z * 22);
        T.grounded = false;
      } else if (!it.impacted && t > 1.35) {
        it.impacted = true;
        T.object.rotation.z = 0;
        G.combat.applyDamage(T, { amount: c.base, type: 'psychic', source: pl, poise: 50, status: [{ id: 'stun', dur: 1.2 }] });
        G.combat.areaDamage(T.pos.x, T.pos.y + 1, T.pos.z, 2.8, 'player', { amount: c.base * 0.55, type: 'psychic', source: pl, knockback: 6, poise: 20 }, (e) => e !== T);
        G.fx.burst('psychic', T.pos.x, T.pos.y + 0.5, T.pos.z, 1.3);
        G.fx.ring(T.pos.x, T.pos.y, T.pos.z, 0xe070ff, 4, 0.4);
        G.cameraRig.shake(0.3);
        G.audio?.play('thud', { pos: T.pos });
      }
    } });
  },

  dominio_mental(c) {
    const T = c.target;
    pulseScreen('psychic', 1.3, 1.2);
    G.fx.beam(c.hand, T.center, 0xff70e0, 0.1, 0.8);
    G.fx.burst('psychic', T.center.x, T.center.y, T.center.z, 1.2);
    if (T.boss) {
      G.combat.applyDamage(T, { amount: 20 * c.mult, type: 'psychic', source: c.player, poise: 60, status: [{ id: 'stun', dur: 1.5 }] });
      G.ui?.floatText(T.center, 'Mente resistente!', 'resist');
      return;
    }
    G.combat.applyStatus(T, 'charm', 8 + c.rank * 2);
    T.aiTarget = null;
    G.ui?.floatText(T.center, 'DOMINADO', 'combo');
  },

  bigorna(c) {
    const p = G.powers.groundPoint(c.aim, 25);
    pulseScreen('toon', 1, 1.4);
    // sombra crescente
    const sh = new THREE.Mesh(new THREE.CircleGeometry(1.6, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(p.x, p.y + 0.1, p.z);
    G.fx.addMesh(sh, 0.75, (it, k) => { sh.scale.setScalar(0.2 + k * 1.1); sh.material.opacity = k * 0.6; });
    // bigorna
    const g = new THREE.Group();
    const top = withOutline(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 1.0), toonMat(0x4a4a58)), 1.05);
    top.position.y = 1.5;
    const horn = withOutline(new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 6), toonMat(0x4a4a58)), 1.06);
    horn.rotation.z = -Math.PI / 2; horn.position.set(1.65, 1.55, 0);
    const waist = withOutline(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.7), toonMat(0x3a3a46)), 1.05);
    waist.position.y = 0.85;
    const foot = withOutline(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.1), toonMat(0x3a3a46)), 1.05);
    foot.position.y = 0.22;
    g.add(top, horn, waist, foot);
    g.scale.setScalar(1 + c.rank * 0.12);
    const startY = p.y + 26;
    g.position.set(p.x, startY, p.z);
    G.audio?.play('whistle');
    G.fx.addMesh(g, 2.3, (it, k) => {
      const t = it.t;
      if (t < 0.75) g.position.y = lerp(startY, p.y, easeInCubic(t / 0.75));
      else {
        if (!it.landed) {
          it.landed = true;
          g.position.y = p.y;
          const foes = G.combat.areaDamage(p.x, p.y + 1, p.z, 2.8, 'player', { amount: c.base, type: 'toon', source: c.player, poise: 80, knockback: 2, status: [{ id: 'stun', dur: 2.5 }] });
          for (const e of foes) if (!e.boss) e.flattenT = 2.5;
          G.ui?.comicText(new THREE.Vector3(p.x, p.y + 2.5, p.z), 'BONK!');
          G.fx.burst('toon', p.x, p.y + 0.5, p.z, 1.3);
          G.fx.ring(p.x, p.y, p.z, 0xffffff, 4, 0.45);
          G.cameraRig.shake(0.4);
          G.audio?.play('anvil', { pos: p });
        }
        // quica levemente e some
        const tt = t - 0.75;
        g.scale.y = (1 + c.rank * 0.12) * (1 - Math.sin(Math.min(tt * 12, Math.PI)) * 0.15);
        if (t > 2.0) g.scale.setScalar(Math.max(0.01, (2.3 - t) / 0.3) * (1 + c.rank * 0.12));
      }
    }, () => G.fx.burst('toon', p.x, p.y + 1, p.z, 0.6));
  },

  marreta(c) {
    const pl = c.player;
    pulseScreen('toon', 1, 1.2);
    const f = new THREE.Vector3(Math.sin(pl.yaw), 0, Math.cos(pl.yaw));
    const g = new THREE.Group();
    const handle = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.4, 8), toonMat(0xc89050)), 1.08);
    handle.position.y = 2.2;
    const head = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.4, 14), toonMat(0xe83a3a)), 1.05);
    head.rotation.z = Math.PI / 2; head.position.y = 4.6;
    const band1 = new THREE.Mesh(new THREE.CylinderGeometry(1.03, 1.03, 0.3, 14), toonMat(0xffffff));
    band1.rotation.z = Math.PI / 2; band1.position.set(0.7, 4.6, 0);
    const band2 = band1.clone(); band2.position.x = -0.7;
    g.add(handle, head, band1, band2);
    const pivot = new THREE.Group();
    pivot.add(g);
    pivot.position.set(pl.pos.x + f.x * 0.6, pl.pos.y + 0.2, pl.pos.z + f.z * 0.6);
    pivot.rotation.y = pl.yaw;
    g.rotation.x = -1.6; // erguida atrás
    G.fx.addMesh(pivot, 1.1, (it, k) => {
      const t = it.t;
      if (t < 0.3) g.rotation.x = lerp(-1.6, 1.45, easeInCubic(t / 0.3));
      else {
        g.rotation.x = 1.45;
        if (!it.hit) {
          it.hit = true;
          const cx = pl.pos.x + f.x * 3.2, cz = pl.pos.z + f.z * 3.2;
          const y = G.world.groundAt(cx, cz, pl.pos.y + 3);
          const foes = G.entities.inRadius(pl.pos.x, pl.pos.z, 6, (e) => {
            if (!isHostile('player', e.team)) return false;
            const dx = e.pos.x - pl.pos.x, dz = e.pos.z - pl.pos.z;
            return (dx * f.x + dz * f.z) / (Math.hypot(dx, dz) || 1) > 0.35;
          });
          for (const e of foes) G.combat.applyDamage(e, { amount: c.base, type: 'toon', source: pl, knockback: e.boss ? 4 : 16, up: e.boss ? 0 : 10, poise: 70, status: [{ id: 'stun', dur: 1.0 }], dir: { x: e.pos.x - pl.pos.x, z: e.pos.z - pl.pos.z } });
          G.ui?.comicText(new THREE.Vector3(cx, y + 2.5, cz), 'POW!');
          G.fx.burst('toon', cx, y + 0.5, cz, 1.6);
          G.fx.ring(cx, y, cz, 0xffe040, 5, 0.4);
          G.cameraRig.shake(0.45);
          G.audio?.play('mallet', { pos: pl.pos });
        }
        if (t > 0.8) pivot.scale.setScalar(Math.max(0.01, (1.1 - t) / 0.3));
      }
    });
  },

  passo_sombrio(c) {
    const pl = c.player;
    pulseScreen('shadow', 1, 0.5);
    let dir = new THREE.Vector3();
    const inp = G.input;
    const fwd = G.cameraRig.flatForward(new THREE.Vector3()), right = G.cameraRig.flatRight(new THREE.Vector3());
    let ix = 0, iz = 0;
    if (inp.isDown('KeyW')) iz += 1; if (inp.isDown('KeyS')) iz -= 1; if (inp.isDown('KeyA')) ix -= 1; if (inp.isDown('KeyD')) ix += 1;
    dir.set(fwd.x * iz + right.x * ix, 0, fwd.z * iz + right.z * ix);
    if (dir.lengthSq() < 0.01) dir.copy(fwd);
    dir.normalize();
    const start = pl.pos.clone();
    const maxD = 9 + c.rank * 1.5;
    let d = 0;
    const col = G.world.collision;
    for (let s = 0.5; s <= maxD; s += 0.5) {
      const x = start.x + dir.x * s, z = start.z + dir.z * s;
      if (col.terrainBlocks(start.x + dir.x * (s - 0.5), start.z + dir.z * (s - 0.5), x, z, pl.pos.y + 0.5)) break;
      if (col.pointSolid(x, G.world.groundAt(x, z, pl.pos.y + 2) + 1, z)) break;
      d = s;
    }
    G.fx.burst('shadow', start.x, start.y + 1, start.z, 1);
    G.combat.areaDamage(start.x, start.y + 1, start.z, 2.6, 'player', { amount: c.base, type: 'shadow', source: pl, knockback: 4, poise: 15 });
    pl.pos.x += dir.x * d; pl.pos.z += dir.z * d;
    pl.pos.y = G.world.groundAt(pl.pos.x, pl.pos.z, pl.pos.y + 3);
    pl.yaw = Math.atan2(dir.x, dir.z);
    pl.invulnT = 0.35;
    G.fx.burst('shadow', pl.pos.x, pl.pos.y + 1, pl.pos.z, 1.2);
    G.combat.areaDamage(pl.pos.x, pl.pos.y + 1, pl.pos.z, 2.6, 'player', { amount: c.base, type: 'shadow', source: pl, knockback: 5, poise: 15 });
    // rastro
    for (let s = 0; s <= d; s += 1) G.fx.emit({ x: start.x + dir.x * s, y: start.y + 1, z: start.z + dir.z * s, count: 4, color: 0x40104a, color2: 0x050008, size: 0.9, sizeEnd: 1.4, life: 0.6, speed: 0.6, blend: 'normal', alpha: 0.7 });
  },

  drenar_vida(c) {
    const T = c.target;
    const pl = c.player;
    pulseScreen('shadow', 0.8, 1.2);
    G.combat.applyStatus(T, 'drain', 5);
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        if (!T.alive || !pl.alive) return;
        const dmg = G.combat.applyDamage(T, { amount: c.base, type: 'shadow', source: pl, poise: 10 });
        // orbe voando do alvo ao jogador
        const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.4, 2.2) }));
        const from = T.center.clone();
        orb.position.copy(from);
        G.fx.addMesh(orb, 0.45, (it, k) => {
          const to = pl.center;
          orb.position.lerpVectors(from, to, easeInCubic(k));
          orb.position.y += Math.sin(k * Math.PI) * 1.2;
          G.fx.trail('shadow', orb.position.x, orb.position.y, orb.position.z);
        }, () => { G.combat.heal(pl, dmg * 0.6); G.fx.burst('heal', pl.pos.x, pl.pos.y + 1, pl.pos.z, 0.5); });
      }, i * 300);
    }
  },
};
