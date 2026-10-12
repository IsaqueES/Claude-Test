// Interface: HUD, textos flutuantes, avisos, faixas, barra de chefe, bússola, minimapa e caixa de diálogo.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { events } from '../core/Events.js';
import { input } from '../core/Input.js';
import { h, clear, esc } from './dom.js';
import { SCHOOL_ICONS, ITEM_ICONS, UI_ICONS } from './icons.js';
import { POWERS, SCHOOLS } from '../combat/Powers.js';
import { ITEMS } from '../data/items.js';
import { REGION_NAMES, LOC, WORLD } from '../world/WorldMap.js';
import { fmt } from '../rpg/Story.js';
import { Menus } from './Menus.js';
import { isHostile } from '../entities/Entities.js';

const _v = new THREE.Vector3();

export class UI {
  constructor(root) {
    this.root = root;
    this.floatPool = [];
    this.floats = [];
    this.enemyBars = new Map();
    this.build();
    this.menus = new Menus(this);
    this.dialogue = new DialogueBox(this);
    events.on('levelup', (l) => {
      this.questBanner('Nível ' + l, 'Você se sente mais forte', '+3 pontos de atributo  •  +1 Ponto de Essência');
      G.audio?.play('levelup');
      if (G.player) { G.player.fullHeal(); G.fx.burst('light', G.player.pos.x, G.player.pos.y + 1, G.player.pos.z, 1.5); G.fx.ring(G.player.pos.x, G.player.pos.y, G.player.pos.z, 0xffe070, 5, 0.8); }
    });
    events.on('schoolGranted', (s) => {
      const sc = SCHOOLS[s];
      this.questBanner('Poder Desperto', 'Escola: ' + sc.name, sc.desc);
      G.audio?.play('awaken');
    });
  }

  build() {
    const R = this.root;
    // HUD principal
    this.hud = h('div', { class: 'hud hidden' });
    // Painel de status (canto superior esquerdo)
    this.lvlEl = h('div', { class: 'lvl-badge' }, '1');
    this.hpFill = h('div', { class: 'bar-fill hp' }); this.hpText = h('div', { class: 'bar-text' });
    this.mpFill = h('div', { class: 'bar-fill mp' }); this.mpText = h('div', { class: 'bar-text' });
    this.stFill = h('div', { class: 'bar-fill st' });
    this.xpFill = h('div', { class: 'bar-fill xp' });
    this.hpBar = h('div', { class: 'bar hp-bar' }, this.hpFill, this.hpText);
    this.mpBar = h('div', { class: 'bar mp-bar' }, this.mpFill, this.mpText);
    this.stBar = h('div', { class: 'bar st-bar' }, this.stFill);
    this.goldEl = h('div', { class: 'gold-line' });
    this.buffsEl = h('div', { class: 'buffs' });
    this.pointsEl = h('div', { class: 'points-hint' });
    this.statusPanel = h('div', { class: 'status-panel' },
      this.lvlEl,
      h('div', { class: 'bars' }, this.hpBar, this.mpBar, this.stBar, h('div', { class: 'bar xp-bar' }, this.xpFill)),
      h('div', { class: 'status-sub' }, this.goldEl, this.pointsEl),
      this.buffsEl);
    // Barra de poderes
    this.slots = [];
    const hotbar = h('div', { class: 'hotbar' });
    for (let i = 0; i < 4; i++) {
      const icon = h('div', { class: 'slot-icon' });
      const cd = h('div', { class: 'slot-cd' });
      const cdText = h('div', { class: 'slot-cdtext' });
      const cost = h('div', { class: 'slot-cost' });
      const el = h('div', { class: 'slot' }, icon, cd, cdText, h('div', { class: 'slot-key' }, String(i + 1)), cost);
      hotbar.appendChild(el);
      this.slots.push({ el, icon, cd, cdText, cost, id: null });
    }
    this.potHp = h('div', { class: 'slot small' }, h('div', { class: 'slot-icon', html: ITEM_ICONS.consumable }), h('div', { class: 'slot-key' }, 'R'), h('div', { class: 'slot-count' }));
    this.potMp = h('div', { class: 'slot small' }, h('div', { class: 'slot-icon', html: ITEM_ICONS.mana }), h('div', { class: 'slot-key' }, 'T'), h('div', { class: 'slot-count' }));
    hotbar.appendChild(h('div', { class: 'hotbar-sep' }));
    hotbar.appendChild(this.potHp);
    hotbar.appendChild(this.potMp);
    // Bússola
    this.compassStrip = h('div', { class: 'compass-strip' });
    this.compass = h('div', { class: 'compass' }, this.compassStrip, h('div', { class: 'compass-center' }));
    this.compassMarks = {};
    for (const [label, ang] of [['N', 0], ['NE', 45], ['L', 90], ['SE', 135], ['S', 180], ['SO', 225], ['O', 270], ['NO', 315]]) {
      const m = h('div', { class: 'compass-mark' + (label.length === 1 ? ' major' : '') }, label);
      this.compassStrip.appendChild(m);
      this.compassMarks[label] = { el: m, ang };
    }
    this.compassQuest = h('div', { class: 'compass-quest', html: UI_ICONS.quest });
    this.compassQuestDist = h('div', { class: 'compass-dist' });
    this.compassStrip.appendChild(this.compassQuest);
    this.compassStrip.appendChild(this.compassQuestDist);
    // Minimapa
    this.minimapCanvas = h('canvas', { class: 'minimap-canvas', width: 180, height: 180 });
    this.minimap = h('div', { class: 'minimap' }, this.minimapCanvas, h('div', { class: 'minimap-n' }, 'N'));
    this.timeEl = h('div', { class: 'time-line' });
    this.regionEl = h('div', { class: 'region-line' });
    const rightTop = h('div', { class: 'right-top' }, this.minimap, this.regionEl, this.timeEl);
    // Rastreador de missão
    this.tracker = h('div', { class: 'tracker' });
    // Mira e prompt
    this.crosshair = h('div', { class: 'crosshair' });
    this.prompt = h('div', { class: 'prompt hidden' });
    this.lockReticle = h('div', { class: 'lock-reticle hidden' });
    // Barra do chefe
    this.bossName = h('div', { class: 'boss-name' });
    this.bossFill = h('div', { class: 'boss-fill' });
    this.bossLag = h('div', { class: 'boss-lag' });
    this.bossBarEl = h('div', { class: 'boss-bar hidden' }, this.bossName, h('div', { class: 'boss-track' }, this.bossLag, this.bossFill));
    this.hud.append(this.statusPanel, hotbar, this.compass, rightTop, this.tracker, this.crosshair, this.prompt, this.lockReticle, this.bossBarEl);
    R.appendChild(this.hud);

    // Camadas gerais
    this.floatLayer = h('div', { class: 'float-layer' });
    this.barLayer = h('div', { class: 'bar-layer' });
    this.toastBox = h('div', { class: 'toasts' });
    this.banner = h('div', { class: 'banner hidden' });
    this.regionBannerEl = h('div', { class: 'region-banner hidden' });
    this.letterTop = h('div', { class: 'letterbox top' });
    this.letterBot = h('div', { class: 'letterbox bottom' });
    this.fadeEl = h('div', { class: 'fade' });
    this.subtitle = h('div', { class: 'subtitle hidden' });
    R.append(this.barLayer, this.floatLayer, this.letterTop, this.letterBot, this.toastBox, this.banner, this.regionBannerEl, this.subtitle, this.fadeEl);
    this.bannerQueue = [];
    this.bannerBusy = false;
  }

  showHUD(on) { this.hud.classList.toggle('hidden', !on); }

  // ---------------- Avisos ----------------
  toast(text, type = 'info') {
    const el = h('div', { class: 'toast ' + type }, fmt(text));
    this.toastBox.appendChild(el);
    while (this.toastBox.children.length > 6) this.toastBox.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 3800);
    setTimeout(() => el.remove(), 4400);
  }

  questBanner(kicker, title, sub = '') {
    this.bannerQueue.push({ kicker, title, sub });
    if (!this.bannerBusy) this.nextBanner();
  }

  nextBanner() {
    const b = this.bannerQueue.shift();
    if (!b) { this.bannerBusy = false; return; }
    this.bannerBusy = true;
    clear(this.banner);
    this.banner.append(h('div', { class: 'banner-kicker' }, fmt(b.kicker)), h('div', { class: 'banner-title' }, fmt(b.title)));
    if (b.sub) this.banner.append(h('div', { class: 'banner-sub' }, fmt(b.sub)));
    this.banner.classList.remove('hidden', 'out');
    void this.banner.offsetWidth;
    this.banner.classList.add('in');
    setTimeout(() => { this.banner.classList.add('out'); }, 3200);
    setTimeout(() => { this.banner.classList.add('hidden'); this.banner.classList.remove('in', 'out'); this.nextBanner(); }, 3800);
  }

  regionBanner(name) {
    const el = this.regionBannerEl;
    el.textContent = name;
    el.classList.remove('hidden', 'show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this._rb);
    this._rb = setTimeout(() => el.classList.add('hidden'), 3600);
  }

  showSubtitle(text, dur = 3) {
    this.subtitle.textContent = fmt(text);
    this.subtitle.classList.remove('hidden');
    clearTimeout(this._sub);
    this._sub = setTimeout(() => this.subtitle.classList.add('hidden'), dur * 1000);
  }

  flashBar(name) {
    const el = name === 'mana' ? this.mpBar : name === 'stamina' ? this.stBar : this.hpBar;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  letterbox(on) {
    this.letterTop.classList.toggle('on', on);
    this.letterBot.classList.toggle('on', on);
  }

  fade(to = 1, dur = 0.6, color = '#000') {
    this.fadeEl.style.transition = `opacity ${dur}s ease`;
    this.fadeEl.style.background = color;
    this.fadeEl.style.opacity = to;
    return new Promise((res) => setTimeout(res, dur * 1000 + 20));
  }

  // ---------------- Textos flutuantes ----------------
  floatText(pos, text, style = 'normal', element) {
    if (this.floats.length > 50) return;
    let el = this.floatPool.pop();
    if (!el) { el = h('div', { class: 'float' }); }
    el.className = 'float ' + style + (element ? ' el-' + element : '');
    el.textContent = text;
    this.floatLayer.appendChild(el);
    const big = style === 'crit' || style === 'combo';
    this.floats.push({ el, pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.3, (Math.random() - 0.5) * 0.6)), t: 0, dur: big ? 1.4 : 1.0, vy: big ? 1.6 : 1.2 });
  }

  comicText(pos, text) {
    const el = h('div', { class: 'comic' }, text);
    this.floatLayer.appendChild(el);
    this.floats.push({ el, pos: pos.clone(), t: 0, dur: 1.1, vy: 0.6, comic: true, rot: (Math.random() - 0.5) * 30 });
    G.audio?.play('comic');
  }

  // ---------------- Chefe ----------------
  setBoss(boss) {
    this.boss = boss;
    if (boss) {
      this.bossName.textContent = boss.displayName || boss.name;
      this.bossBarEl.classList.remove('hidden');
      this.bossLagV = 1;
    } else this.bossBarEl.classList.add('hidden');
  }

  openAction(action, npc) { this.menus.openAction(action, npc); }
  openMenu(tab) { this.menus.open(tab); }

  // ---------------- Atualização por quadro ----------------
  update(dt) {
    const p = G.player;
    const cam = G.camera;
    // textos flutuantes
    const w = window.innerWidth, hgt = window.innerHeight;
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt;
      f.pos.y += f.vy * dt;
      f.vy *= Math.exp(-dt * 1.5);
      _v.copy(f.pos).project(cam);
      const vis = _v.z < 1 && _v.z > -1;
      const k = f.t / f.dur;
      if (k >= 1 || !vis) {
        if (k >= 1) {
          f.el.remove();
          if (!f.comic) this.floatPool.push(f.el);
          this.floats.splice(i, 1);
          continue;
        }
        f.el.style.opacity = 0;
        continue;
      }
      const x = (_v.x * 0.5 + 0.5) * w, y = (-_v.y * 0.5 + 0.5) * hgt;
      const sc = f.comic ? (k < 0.15 ? 0.3 + k / 0.15 * 1.0 : 1.3 - (k - 0.15) * 0.3) : (k < 0.1 ? 0.6 + k * 4 : 1);
      f.el.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${sc.toFixed(3)})${f.comic ? ` rotate(${f.rot}deg)` : ''}`;
      f.el.style.opacity = k > 0.7 ? (1 - (k - 0.7) / 0.3).toFixed(3) : 1;
    }
    if (!p || this.hud.classList.contains('hidden')) { this.barLayer.style.display = 'none'; return; }
    this.barLayer.style.display = '';
    const d = G.stats.derived();
    // Barras
    this.hpFill.style.width = (100 * Math.max(0, p.hp) / d.maxHp).toFixed(1) + '%';
    this.hpText.textContent = Math.ceil(Math.max(0, p.hp)) + ' / ' + d.maxHp;
    this.mpFill.style.width = (100 * p.mana / d.maxMana).toFixed(1) + '%';
    this.mpText.textContent = Math.floor(p.mana) + ' / ' + d.maxMana;
    this.stFill.style.width = (100 * p.stamina / d.maxStamina).toFixed(1) + '%';
    this.xpFill.style.width = (100 * G.stats.xp / G.stats.xpToNext()).toFixed(1) + '%';
    this.lvlEl.textContent = G.stats.level;
    this.goldEl.innerHTML = `<span class="coin"></span>${G.stats.gold}`;
    const pts = [];
    if (G.stats.points > 0) pts.push(`+${G.stats.points} atributos [C]`);
    if (G.stats.skillPoints > 0) pts.push(`+${G.stats.skillPoints} essência [K]`);
    this.pointsEl.textContent = pts.join('  ');
    G.post.u.uLowHp.value = p.alive && p.hp / d.maxHp < 0.3 ? 1 - p.hp / d.maxHp / 0.3 : 0;
    // Buffs
    const buffs = [];
    if (p.buffs.stoneskin) buffs.push(['Pele de Pedra', p.buffs.stoneskin.t, '#b8864a']);
    if (p.buffs.haste) buffs.push(['Veloz', p.buffs.haste.t, '#7ae8c8']);
    for (const s in p.status) buffs.push([({ burn: 'Queimando', wet: 'Molhado', slow: 'Lento', stun: 'Atordoado', regen: 'Regenerando', blind: 'Cego' })[s] || s, p.status[s].t, s === 'regen' ? '#5ac8ff' : '#d86a4a']);
    const key = buffs.map((b) => b[0] + Math.ceil(b[1])).join('|');
    if (key !== this._buffKey) {
      this._buffKey = key;
      clear(this.buffsEl);
      for (const [n, t, c] of buffs) this.buffsEl.appendChild(h('div', { class: 'buff', style: { borderColor: c } }, `${n} ${Math.ceil(t)}s`));
    }
    // Barra de poderes
    const pw = G.powers;
    this.slots.forEach((s, i) => {
      const id = pw.slots[i];
      if (id !== s.id) {
        s.id = id;
        s.icon.innerHTML = id ? SCHOOL_ICONS[POWERS[id].school] : '';
        s.el.title = id ? POWERS[id].name : 'Vazio';
        s.cost.textContent = id ? POWERS[id].mana : '';
        s.el.classList.toggle('empty', !id);
      }
      if (!id) return;
      const cd = pw.cooldownOf(id), max = pw.maxCd(id);
      const frac = cd > 0 ? cd / max : 0;
      s.cd.style.background = frac > 0 ? `conic-gradient(rgba(0,0,0,0.7) ${(frac * 360).toFixed(0)}deg, transparent 0)` : 'none';
      s.cdText.textContent = cd > 0.05 ? (cd < 1 ? cd.toFixed(1) : Math.ceil(cd)) : '';
      s.el.classList.toggle('nomana', p.mana < POWERS[id].mana);
    });
    this.potHp.querySelector('.slot-count').textContent = G.inventory.count('pocao_vida');
    this.potMp.querySelector('.slot-count').textContent = G.inventory.count('pocao_mana');

    // Bússola
    const yaw = G.cameraRig.yaw;
    const heading = ((-yaw * 180 / Math.PI) % 360 + 360) % 360; // 0 = norte
    const span = 180, width = 420;
    for (const k in this.compassMarks) {
      const m = this.compassMarks[k];
      let dA = ((m.ang - heading + 540) % 360) - 180;
      const vis = Math.abs(dA) < span / 2;
      m.el.style.display = vis ? '' : 'none';
      if (vis) m.el.style.transform = `translateX(${(dA / span) * width}px)`;
    }
    const tq = G.quests.tracked;
    const mk = tq ? G.quests.markerOf(tq) : null;
    if (mk) {
      const ang = (Math.atan2(mk.x - p.pos.x, -(mk.z - p.pos.z)) * 180 / Math.PI + 360) % 360;
      let dA = ((ang - heading + 540) % 360) - 180;
      dA = Math.max(-span / 2, Math.min(span / 2, dA));
      this.compassQuest.style.display = '';
      this.compassQuestDist.style.display = '';
      this.compassQuest.style.transform = `translateX(${(dA / span) * width}px)`;
      this.compassQuestDist.style.transform = `translateX(${(dA / span) * width}px)`;
      this.compassQuestDist.textContent = Math.round(Math.hypot(mk.x - p.pos.x, mk.z - p.pos.z)) + 'm';
    } else { this.compassQuest.style.display = 'none'; this.compassQuestDist.style.display = 'none'; }

    // Rastreador
    const tKey = tq + ':' + JSON.stringify(G.quests.state[tq]?.progress) + ':' + G.quests.state[tq]?.stage;
    if (tKey !== this._trackKey) {
      this._trackKey = tKey;
      clear(this.tracker);
      if (tq) {
        const def = G.quests.def(tq);
        this.tracker.appendChild(h('div', { class: 'tracker-title ' + def.type }, fmt(def.title)));
        for (const l of G.quests.objectiveLines(tq)) this.tracker.appendChild(h('div', { class: 'tracker-line' + (l.done ? ' done' : '') + (l.main ? ' main' : '') }, l.text));
        const others = G.quests.active().length - 1;
        if (others > 0) this.tracker.appendChild(h('div', { class: 'tracker-more' }, `+${others} missões ativas [J]`));
      }
    }

    // Região e hora
    const reg = G.world.regionAt(p.pos.x, p.pos.z);
    if (reg !== this._reg) {
      this._reg = reg;
      this.regionEl.textContent = REGION_NAMES[reg] || '';
      if (this._regInit) this.regionBanner(REGION_NAMES[reg]);
      this._regInit = true;
      G.story.discovered[reg] = true;
    }
    const hh = Math.floor(G.time.hours), mm = Math.floor((G.time.hours % 1) * 60);
    this.timeEl.textContent = `${hh < 10 ? '0' : ''}${hh}:${mm < 10 ? '0' : ''}${mm} — Dia ${G.time.day}`;
    this.drawMinimap(p);

    // Prompt de interação
    let promptText = null;
    if (G.state === 'play' && p.alive) {
      const npc = G.npcs.nearestTalkable(p.pos, 3.0);
      const it = G.world.nearestInteractable(p.pos, p.yaw);
      if (npc && (!it || npc.distTo(p) <= Math.hypot(it.pos.x - p.pos.x, it.pos.z - p.pos.z))) promptText = `<b>[E]</b> Falar — ${esc(npc.name)}${npc.title ? ` <i>${esc(npc.title)}</i>` : ''}`;
      else if (it) promptText = `<b>[E]</b> ${esc(fmt(typeof it.prompt === 'function' ? it.prompt() : it.prompt))}`;
    }
    if (promptText !== this._prompt) {
      this._prompt = promptText;
      this.prompt.innerHTML = promptText || '';
      this.prompt.classList.toggle('hidden', !promptText);
    }

    // Retícula de trava
    const lt = p.lockTarget;
    if (lt && lt.alive) {
      _v.copy(lt.center).project(cam);
      this.lockReticle.classList.remove('hidden');
      this.lockReticle.style.transform = `translate(-50%,-50%) translate(${((_v.x * 0.5 + 0.5) * w).toFixed(1)}px,${((-_v.y * 0.5 + 0.5) * hgt).toFixed(1)}px)`;
    } else this.lockReticle.classList.add('hidden');

    // Barra do chefe
    if (this.boss) {
      const b = this.boss;
      const frac = Math.max(0, b.hp / b.maxHp);
      this.bossFill.style.width = (frac * 100).toFixed(2) + '%';
      this.bossLagV += (frac - this.bossLagV) * Math.min(1, dt * 2);
      this.bossLag.style.width = (this.bossLagV * 100).toFixed(2) + '%';
      if (!b.alive && !b.keepBar) setTimeout(() => this.setBoss(null), 1500);
    }

    this.updateEnemyBars(cam, w, hgt);
  }

  updateEnemyBars(cam, w, hgt) {
    const seen = new Set();
    for (const e of G.entities.list) {
      if (e.kind === 'npc' && e.visible && e.nameTag && G.player && e.distTo(G.player) < 9 && G.state === 'play') {
        seen.add(e);
        let b = this.enemyBars.get(e);
        if (!b) {
          b = { el: h('div', { class: 'name-tag' }, h('div', { class: 'nt-name' }, e.name), e.title ? h('div', { class: 'nt-title' }, e.title) : null), npc: true };
          this.barLayer.appendChild(b.el); this.enemyBars.set(e, b);
        }
        _v.set(e.pos.x, e.pos.y + e.height * 1.12 + 0.25, e.pos.z).project(cam);
        b.el.style.display = _v.z < 1 ? '' : 'none';
        b.el.style.transform = `translate(-50%,-100%) translate(${((_v.x * 0.5 + 0.5) * w).toFixed(0)}px,${((-_v.y * 0.5 + 0.5) * hgt).toFixed(0)}px)`;
        continue;
      }
      if (!e.alive || e.removed || e.kind !== 'enemy' || e.boss && this.boss === e) continue;
      const showT = e.hp < e.maxHp || e.state === 'chase' || e.state === 'attack';
      if (!showT || !G.player || e.distTo(G.player) > 30) continue;
      seen.add(e);
      let b = this.enemyBars.get(e);
      if (!b) {
        const fill = h('div', { class: 'eb-fill' });
        b = { el: h('div', { class: 'enemy-bar' + (e.team === 'ally' ? ' ally' : '') }, h('div', { class: 'eb-name' }, `${e.name} · Nv ${e.level}`), h('div', { class: 'eb-track' }, fill)), fill };
        this.barLayer.appendChild(b.el); this.enemyBars.set(e, b);
      }
      b.el.classList.toggle('ally', e.team === 'ally');
      _v.set(e.pos.x, e.pos.y + e.height + 0.5, e.pos.z).project(cam);
      b.el.style.display = _v.z < 1 ? '' : 'none';
      b.el.style.transform = `translate(-50%,-100%) translate(${((_v.x * 0.5 + 0.5) * w).toFixed(0)}px,${((-_v.y * 0.5 + 0.5) * hgt).toFixed(0)}px)`;
      b.fill.style.width = (100 * Math.max(0, e.hp) / e.maxHp).toFixed(1) + '%';
    }
    for (const [e, b] of this.enemyBars) if (!seen.has(e)) { b.el.remove(); this.enemyBars.delete(e); }
  }

  // ---------------- Minimapa ----------------
  buildMapImage() {
    const T = G.world.terrain;
    const S = 360;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S);
    const col = T.mesh.geometry.attributes.color;
    const n = T.n;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const wx = (x / S) * WORLD.half * 2 - WORLD.half, wz = (y / S) * WORLD.half * 2 - WORLD.half;
      const ix = Math.min(n - 1, Math.round((wx + WORLD.half) / T.step)), iz = Math.min(n - 1, Math.round((wz + WORLD.half) / T.step));
      const vi = iz * n + ix;
      let r = col.getX(vi), g = col.getY(vi), b = col.getZ(vi);
      const h0 = T.heights[vi];
      const shade = 0.75 + Math.min(0.5, Math.max(-0.3, (h0 - (T.heights[Math.max(0, vi - n - 1)] || h0)) * 0.12));
      r *= shade; g *= shade; b *= shade;
      if (T.waterAt(wx, wz)) { r = 0.12; g = 0.32; b = 0.5; }
      const o = (y * S + x) * 4;
      img.data[o] = Math.min(255, Math.pow(r, 1 / 2.2) * 255);
      img.data[o + 1] = Math.min(255, Math.pow(g, 1 / 2.2) * 255);
      img.data[o + 2] = Math.min(255, Math.pow(b, 1 / 2.2) * 255);
      img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // estruturas aproximadas
    ctx.fillStyle = 'rgba(60,40,20,0.8)';
    for (const cc of G.world.collision.all) {
      if (cc.type !== 'b' || cc.hw * cc.hd < 4 || cc.platform || cc.tag === 'barrier') continue;
      const x = (cc.x + WORLD.half) / (WORLD.half * 2) * S, y = (cc.z + WORLD.half) / (WORLD.half * 2) * S;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-cc.rot);
      ctx.fillRect(-cc.hw / 2, -cc.hd / 2, cc.hw, cc.hd);
      ctx.restore();
    }
    this.mapImage = c;
    return c;
  }

  drawMinimap(p) {
    if (!this.mapImage) this.buildMapImage();
    const cv = this.minimapCanvas;
    const ctx = cv.getContext('2d');
    const S = cv.width;
    const scale = this.mapImage.width / (WORLD.half * 2); // px por unidade no mapa
    const zoom = 2.6; // px da tela por px do mapa
    ctx.save();
    ctx.clearRect(0, 0, S, S);
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#1a1410'; ctx.fillRect(0, 0, S, S);
    const mx = (p.pos.x + WORLD.half) * scale, mz = (p.pos.z + WORLD.half) * scale;
    ctx.translate(S / 2, S / 2);
    ctx.scale(zoom, zoom);
    ctx.drawImage(this.mapImage, -mx, -mz);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // marcadores
    const toScreen = (x, z) => [S / 2 + (x - p.pos.x) * scale * zoom, S / 2 + (z - p.pos.z) * scale * zoom];
    for (const e of G.entities.list) {
      if (!e.alive || e.removed || e === p) continue;
      if (e.kind === 'npc' && !e.visible) continue;
      const [x, y] = toScreen(e.pos.x, e.pos.z);
      if (Math.hypot(x - S / 2, y - S / 2) > S / 2) continue;
      ctx.fillStyle = e.kind === 'npc' ? '#ffe070' : e.team === 'ally' ? '#70d0ff' : e.boss ? '#ff3030' : '#e84a3a';
      ctx.beginPath(); ctx.arc(x, y, e.kind === 'npc' ? 3 : e.boss ? 5 : 2.5, 0, Math.PI * 2); ctx.fill();
    }
    for (const w of G.world.anchors.waystones) {
      const [x, y] = toScreen(w.x, w.z);
      ctx.fillStyle = G.story.waystones[w.id] ? '#5ae0ff' : '#5a7078';
      ctx.fillRect(x - 2.5, y - 4, 5, 8);
    }
    const tq = G.quests.tracked;
    const mk = tq ? G.quests.markerOf(tq) : null;
    if (mk) {
      let [x, y] = toScreen(mk.x, mk.z);
      const dx = x - S / 2, dy = y - S / 2, dd = Math.hypot(dx, dy);
      if (dd > S / 2 - 10) { x = S / 2 + dx / dd * (S / 2 - 10); y = S / 2 + dy / dd * (S / 2 - 10); }
      ctx.fillStyle = '#f3d27a'; ctx.strokeStyle = '#3a2408'; ctx.lineWidth = 2;
      star(ctx, x, y, 7);
    }
    // seta do jogador
    ctx.translate(S / 2, S / 2);
    ctx.rotate(Math.PI - p.yaw);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5.5, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

export function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

// ---------------- Caixa de diálogo ----------------
class DialogueBox {
  constructor(ui) {
    this.ui = ui;
    this.speaker = h('div', { class: 'dlg-speaker' });
    this.text = h('div', { class: 'dlg-text' });
    this.choicesEl = h('div', { class: 'dlg-choices' });
    this.hint = h('div', { class: 'dlg-hint' }, 'Espaço / clique para continuar');
    this.el = h('div', { class: 'dialogue hidden interactive' }, this.speaker, this.text, this.choicesEl, this.hint);
    this.el.addEventListener('click', (e) => { if (e.target.closest('.dlg-choice')) return; this.onContinue(); });
    ui.root.appendChild(this.el);
    this.full = '';
    this.shown = 0;
    this.typing = false;
    events.on('key', (code) => {
      if (!G.dialogue?.isOpen()) return;
      if (code === 'Space' || code === 'Enter' || code === 'KeyE') this.onContinue();
      const m = /^Digit(\d)$/.exec(code);
      if (m && !this.typing) G.dialogue.choose(Number(m[1]) - 1);
    });
  }

  show() { this.el.classList.remove('hidden'); this.ui.letterbox(true); this.ui.showHUD(false); input.unlock(); }
  hide() { this.el.classList.add('hidden'); this.ui.letterbox(false); this.ui.showHUD(true); }

  setNode({ speaker, text, choices, isPlayer, narration }) {
    this.speaker.textContent = speaker || '';
    this.speaker.classList.toggle('player', !!isPlayer);
    this.el.classList.toggle('narration', !!narration);
    this.full = text;
    this.shown = 0;
    this.typing = true;
    this.pendingChoices = choices;
    clear(this.choicesEl);
    this.hint.style.visibility = 'hidden';
    clearInterval(this._iv);
    const speed = G.settings.textSpeed ?? 55;
    this._iv = setInterval(() => {
      this.shown += 2;
      this.text.textContent = this.full.slice(0, this.shown);
      if (this.shown >= this.full.length) this.finishTyping();
    }, 1000 / speed);
  }

  finishTyping() {
    clearInterval(this._iv);
    this.typing = false;
    this.text.textContent = this.full;
    const ch = this.pendingChoices || [];
    clear(this.choicesEl);
    ch.forEach((c, i) => {
      const el = h('div', { class: 'dlg-choice' + (c.enabled ? '' : ' disabled') },
        h('span', { class: 'dlg-num' }, String(i + 1) + '.'),
        c.tag ? h('span', { class: 'dlg-tag' }, c.tag + ' ') : null,
        h('span', {}, c.label),
        c.reqText ? h('span', { class: 'dlg-req' }, ` (${c.reqText})`) : null);
      el.addEventListener('click', (e) => { e.stopPropagation(); G.dialogue.choose(i); });
      this.choicesEl.appendChild(el);
    });
    this.hint.style.visibility = ch.length ? 'hidden' : 'visible';
  }

  onContinue() {
    if (this.typing) { this.finishTyping(); return; }
    G.dialogue.advance();
  }
}
