// Menus: Personagem, Inventário, Poderes, Diário, Mapa, Crônicas, Pausa, Loja, Descanso e Viagem.
import { G } from '../core/context.js';
import { events } from '../core/Events.js';
import { input } from '../core/Input.js';
import { h, clear, esc } from './dom.js';
import { SCHOOL_ICONS, ATTR_ICONS, itemIcon, UI_ICONS } from './icons.js';
import { POWERS, SCHOOLS, SCHOOL_POWERS } from '../combat/Powers.js';
import { ITEMS, itemName } from '../data/items.js';
import { ATTRS, ATTR_INFO } from '../rpg/Stats.js';
import { LOC, WORLD, WAYSTONES } from '../world/WorldMap.js';
import { fmt } from '../rpg/Story.js';
import { CODEX } from '../data/lore.js';
import { SHOPS } from '../data/npcs.js';
import { star } from './UI.js';

const TABS = [
  ['char', 'Personagem', 'C'],
  ['inv', 'Inventário', 'I'],
  ['powers', 'Poderes', 'K'],
  ['journal', 'Diário', 'J'],
  ['map', 'Mapa', 'M'],
  ['codex', 'Crônicas', 'L'],
];

export class Menus {
  constructor(ui) {
    this.ui = ui;
    this.tabBar = h('div', { class: 'book-tabs' });
    this.body = h('div', { class: 'book-body' });
    this.closeBtn = h('button', { class: 'book-close', onclick: () => this.close() }, '✕');
    this.el = h('div', { class: 'book hidden interactive' }, this.tabBar, this.body, this.closeBtn);
    ui.root.appendChild(this.el);
    this.tab = 'char';
    this.selSlot = null;
    for (const [id, name, key] of TABS) {
      const b = h('button', { class: 'book-tab', 'data-tab': id, onclick: () => this.show(id) }, name, h('span', { class: 'key' }, key));
      this.tabBar.appendChild(b);
    }
    // Pausa
    this.pauseEl = h('div', { class: 'pause hidden interactive' });
    ui.root.appendChild(this.pauseEl);
    // Painel genérico (loja, viagem, descanso)
    this.panelEl = h('div', { class: 'panel-modal hidden interactive' });
    ui.root.appendChild(this.panelEl);

    events.on('key', (code) => this.onKey(code));
    events.on('pointerunlock', () => {
      if (G.state === 'play' && !this.ignoreUnlock) this.openPause();
    });
  }

  onKey(code) {
    if (G.state === 'title' || G.state === 'create' || G.state === 'intro' || G.state === 'ending' || G.state === 'cutscene' || G.state === 'dead') return;
    const map = { KeyC: 'char', KeyI: 'inv', KeyK: 'powers', KeyJ: 'journal', KeyM: 'map', KeyL: 'codex', Tab: 'inv' };
    if (code === 'Escape') {
      if (!this.panelEl.classList.contains('hidden')) { this.closePanel(); return; }
      if (G.state === 'menu') { this.close(); return; }
      if (G.state === 'pause') { this.closePause(); return; }
      if (G.state === 'play') { this.openPause(); return; }
    }
    if (map[code]) {
      if (G.state === 'menu') {
        if (this.tab === map[code]) this.close(); else this.show(map[code]);
      } else if (G.state === 'play') this.open(map[code]);
    }
    if (G.state === 'menu' && this.tab === 'powers' && this.selPower) {
      const m = /^Digit([1-4])$/.exec(code);
      if (m) { this.assignSlot(Number(m[1]) - 1, this.selPower); }
    }
  }

  open(tab = 'char') {
    if (G.state !== 'play') return;
    G.setState('menu');
    this.el.classList.remove('hidden');
    this.ignoreUnlock = true;
    input.unlock();
    setTimeout(() => (this.ignoreUnlock = false), 100);
    this.show(tab);
    G.audio?.play('book');
  }

  close() {
    this.el.classList.add('hidden');
    if (G.state === 'menu') G.setState('play');
    G.audio?.play('click');
  }

  show(tab) {
    this.tab = tab;
    for (const b of this.tabBar.children) b.classList.toggle('active', b.dataset.tab === tab);
    clear(this.body);
    this['render_' + tab]?.(this.body);
  }

  refresh() { if (!this.el.classList.contains('hidden')) this.show(this.tab); }

  // ======================= PERSONAGEM =======================
  render_char(B) {
    const S = G.stats, d = S.derived();
    const app = G.player.app;
    const left = h('div', { class: 'page left' });
    const right = h('div', { class: 'page right' });
    left.append(
      h('h2', {}, app.name),
      h('div', { class: 'subtle' }, `${G.app.originName || ''} — Nível ${S.level}`),
      h('div', { class: 'xp-line' }, `Experiência: ${S.xp} / ${S.xpToNext()}`),
      h('div', { class: 'align-box' },
        h('div', { class: 'align-label' }, 'Alinhamento: ' + G.story.alignmentName()),
        h('div', { class: 'align-track' }, h('div', { class: 'align-dot', style: { left: (50 + G.story.karma / 2) + '%' } })),
        h('div', { class: 'align-ends' }, h('span', {}, 'Sombra'), h('span', {}, 'Luz'))),
      h('h3', {}, 'Atributos'),
      h('div', { class: 'points' }, S.points > 0 ? `Pontos disponíveis: ${S.points}` : 'Ganhe pontos subindo de nível.'),
    );
    for (const k of ATTRS) {
      const info = ATTR_INFO[k];
      const base = S.attrs[k], total = S.attr(k);
      const plus = h('button', { class: 'attr-plus', disabled: S.points <= 0 || null, onclick: () => { S.attrs[k]++; S.points--; G.audio?.play('upgrade'); this.refresh(); } }, '+');
      left.appendChild(h('div', { class: 'attr-row', title: info.desc },
        h('div', { class: 'attr-icon', html: ATTR_ICONS[k] }),
        h('div', { class: 'attr-name' }, info.name, h('div', { class: 'attr-desc' }, info.desc)),
        h('div', { class: 'attr-val' }, String(total), total !== base ? h('span', { class: 'bonus' }, ` (${base}+${total - base})`) : null),
        plus));
    }
    right.append(h('h3', {}, 'Estatísticas'));
    const rows = [
      ['Vida máxima', d.maxHp], ['Mana máxima', d.maxMana], ['Vigor máximo', d.maxStamina],
      ['Dano da arma', Math.round(d.meleeDmg)], ['Poder natural', '×' + d.natPower.toFixed(2)], ['Poder sobrenatural', '×' + d.supPower.toFixed(2)],
      ['Chance de crítico', Math.round(d.crit * 100) + '%'], ['Velocidade de ataque', '×' + d.atkSpeed.toFixed(2)],
      ['Defesa', d.defense + ` (−${Math.round((1 - 60 / (60 + d.defense)) * 100)}% dano)`], ['Eficiência de bloqueio', Math.round(d.blockEff * 100) + '%'],
      ['Regeneração de mana', d.manaRegen.toFixed(1) + '/s'], ['Preços nas lojas', Math.round(d.priceMul * 100) + '%'],
    ];
    const tbl = h('div', { class: 'stat-table' });
    for (const [a, b] of rows) tbl.appendChild(h('div', { class: 'stat-row' }, h('span', {}, a), h('span', {}, String(b))));
    right.appendChild(tbl);
    right.appendChild(h('h3', {}, 'Equipamento'));
    for (const [slot, label] of [['weapon', 'Arma'], ['armor', 'Armadura'], ['amulet', 'Amuleto']]) {
      const id = G.inventory.equipped[slot];
      right.appendChild(h('div', { class: 'equip-row' }, h('div', { class: 'equip-icon', html: itemIcon(ITEMS[id] || { type: slot }) }), h('div', {}, h('div', { class: 'equip-label' }, label), h('div', { class: 'equip-name' }, id ? itemName(id) : '— vazio —'))));
    }
    B.append(left, right);
  }

  // ======================= INVENTÁRIO =======================
  render_inv(B) {
    const inv = G.inventory;
    const left = h('div', { class: 'page left' });
    const right = h('div', { class: 'page right' });
    left.append(h('h2', {}, 'Inventário'), h('div', { class: 'subtle' }, `Ouro: ${G.stats.gold}`));
    const groups = [['Equipamentos', ['weapon', 'armor', 'amulet']], ['Consumíveis', ['consumable']], ['Itens de missão', ['quest']], ['Materiais', ['material']]];
    const ids = Object.keys(inv.items);
    for (const [gname, types] of groups) {
      const list = ids.filter((id) => types.includes(ITEMS[id]?.type));
      if (!list.length) continue;
      left.appendChild(h('h3', {}, gname));
      const grid = h('div', { class: 'item-grid' });
      for (const id of list) {
        const it = ITEMS[id];
        const cell = h('div', { class: 'item-cell' + (inv.isEquipped(id) ? ' equipped' : '') + (this.selItem === id ? ' sel' : ''), onclick: () => { this.selItem = id; this.show('inv'); } },
          h('div', { class: 'item-icon', html: itemIcon(it) }),
          inv.items[id] > 1 ? h('div', { class: 'item-count' }, String(inv.items[id])) : null);
        cell.title = it.name;
        grid.appendChild(cell);
      }
      left.appendChild(grid);
    }
    if (!ids.length) left.appendChild(h('p', { class: 'subtle' }, 'Sua bolsa está vazia.'));
    const id = this.selItem && inv.has(this.selItem) ? this.selItem : null;
    if (id) {
      const it = ITEMS[id];
      right.append(h('div', { class: 'item-big', html: itemIcon(it) }), h('h2', {}, it.name), h('p', { class: 'item-desc' }, it.desc));
      const props = [];
      if (it.dmg) props.push(`Dano: ${it.dmg}` + (it.element ? ` (${({ light: 'Luz', shadow: 'Sombra' })[it.element]})` : ''));
      if (it.def) props.push(`Defesa: ${it.def}`);
      if (it.bonus) for (const k in it.bonus) props.push(`+${it.bonus[k]} ${ATTR_INFO[k].name}`);
      if (it.mana && it.type !== 'consumable') props.push(`+${it.mana} Mana máxima`);
      if (it.manaRegen) props.push(`+${it.manaRegen} Regeneração de mana`);
      if (it.crit) props.push(`+${Math.round(it.crit * 100)}% Crítico`);
      if (it.price) props.push(`Valor: ${it.price} ouro`);
      right.appendChild(h('ul', { class: 'props' }, props.map((p) => h('li', {}, p))));
      if (['weapon', 'armor', 'amulet'].includes(it.type)) {
        if (inv.isEquipped(id)) right.appendChild(h('div', { class: 'subtle' }, 'Equipado'));
        else right.appendChild(h('button', { class: 'btn', onclick: () => { inv.equip(id); this.show('inv'); } }, 'Equipar'));
      }
      if (it.type === 'consumable') right.appendChild(h('button', { class: 'btn', onclick: () => { inv.use(id); this.show('inv'); } }, 'Usar'));
    } else right.appendChild(h('p', { class: 'subtle center' }, 'Selecione um item para ver detalhes.'));
    B.append(left, right);
  }

  // ======================= PODERES =======================
  render_powers(B) {
    const pw = G.powers;
    const left = h('div', { class: 'page left wide' });
    left.append(h('h2', {}, 'Escolas de Poder'), h('div', { class: 'subtle' }, `Pontos de Essência: ${G.stats.skillPoints}  •  Clique em um poder e pressione 1–4 (ou clique num espaço) para equipá-lo.`));
    const slotsRow = h('div', { class: 'slot-row' });
    pw.slots.forEach((id, i) => {
      slotsRow.appendChild(h('div', { class: 'pslot' + (this.selPower ? ' target' : ''), onclick: () => { if (this.selPower) this.assignSlot(i, this.selPower); else { pw.slots[i] = null; this.show('powers'); } } },
        h('div', { class: 'pslot-key' }, String(i + 1)),
        id ? h('div', { class: 'pslot-icon', html: SCHOOL_ICONS[POWERS[id].school] }) : null,
        h('div', { class: 'pslot-name' }, id ? POWERS[id].name : 'vazio')));
    });
    left.appendChild(slotsRow);
    const grid = h('div', { class: 'school-grid' });
    for (const sid in SCHOOLS) {
      const sc = SCHOOLS[sid];
      const has = pw.hasSchool(sid);
      const card = h('div', { class: 'school-card' + (has ? '' : ' locked') },
        h('div', { class: 'school-head' }, h('div', { class: 'school-icon', html: SCHOOL_ICONS[sid] }), h('div', {}, h('div', { class: 'school-name', style: { color: sc.color } }, sc.name), h('div', { class: 'school-kind' }, sc.kind === 'natural' ? 'Poder Natural' : 'Poder Sobrenatural'))),
        h('div', { class: 'school-desc' }, has ? sc.desc : 'Ainda não despertado. ' + hintFor(sid)));
      if (has) {
        for (const pid of SCHOOL_POWERS[sid]) {
          const p = POWERS[pid];
          const r = pw.ranks[pid] || 0;
          const can = pw.canUpgrade(pid);
          const row = h('div', { class: 'power-row' + (r ? '' : ' unlearned') + (this.selPower === pid ? ' sel' : ''), onclick: () => { if (r) { this.selPower = this.selPower === pid ? null : pid; this.show('powers'); } } },
            h('div', { class: 'power-main' },
              h('div', { class: 'power-name' }, p.name, h('span', { class: 'rank' }, ' ' + '◆'.repeat(r) + '◇'.repeat(3 - r))),
              h('div', { class: 'power-desc' }, p.desc),
              h('div', { class: 'power-meta' }, `Mana ${p.mana} • Recarga ${pw.maxCd(pid).toFixed(1)}s` + (r ? ` • Poder ×${pw.mult(pid).toFixed(2)}` : ''))),
            h('button', { class: 'btn small', disabled: !can.ok || null, title: can.why || '', onclick: (e) => { e.stopPropagation(); if (pw.upgrade(pid)) this.show('powers'); } }, r ? 'Aprimorar' : 'Aprender'));
          card.appendChild(row);
        }
      }
      grid.appendChild(card);
    }
    left.appendChild(grid);
    B.append(left);
  }

  assignSlot(i, pid) {
    const pw = G.powers;
    const j = pw.slots.indexOf(pid);
    if (j >= 0) pw.slots[j] = pw.slots[i];
    pw.slots[i] = pid;
    this.selPower = null;
    G.audio?.play('equip');
    this.show('powers');
  }

  // ======================= DIÁRIO =======================
  render_journal(B) {
    const Q = G.quests;
    const left = h('div', { class: 'page left' });
    const right = h('div', { class: 'page right' });
    left.appendChild(h('h2', {}, 'Diário de Missões'));
    const section = (title, ids, cls) => {
      if (!ids.length) return;
      left.appendChild(h('h3', {}, title));
      for (const id of ids) {
        const d = Q.def(id);
        const el = h('div', { class: 'quest-item ' + cls + (this.selQuest === id ? ' sel' : '') + (Q.tracked === id ? ' tracked' : ''), onclick: () => { this.selQuest = id; this.show('journal'); } },
          Q.tracked === id ? h('span', { class: 'qstar', html: UI_ICONS.quest }) : null, fmt(d.title));
        left.appendChild(el);
      }
    };
    const act = Q.active();
    section('Principais', act.filter((i) => Q.def(i).type === 'main'), 'main');
    section('Secundárias', act.filter((i) => Q.def(i).type !== 'main'), 'side');
    section('Concluídas', Q.done(), 'done');
    if (!Object.keys(Q.state).length) left.appendChild(h('p', { class: 'subtle' }, 'Nenhuma missão ainda.'));
    const id = this.selQuest || Q.tracked;
    if (id && Q.state[id]) {
      const d = Q.def(id), s = Q.state[id];
      right.append(h('h2', {}, fmt(d.title)), h('div', { class: 'subtle' }, (d.type === 'main' ? 'Missão Principal' : 'Missão Secundária') + (d.giver ? ' — ' + d.giver : '')), h('p', { class: 'quest-summary' }, fmt(d.summary || '')));
      if (s.status === 'active') {
        right.appendChild(h('h3', {}, 'Objetivo atual'));
        for (const l of Q.objectiveLines(id)) right.appendChild(h('div', { class: 'obj-line' + (l.done ? ' done' : '') }, (l.done ? '✔ ' : '• ') + l.text));
        right.appendChild(h('h3', {}, 'Progresso'));
        d.stages.slice(0, s.stage).forEach((st) => right.appendChild(h('div', { class: 'obj-line done' }, '✔ ' + fmt(st.text || ''))));
        if (Q.tracked !== id) right.appendChild(h('button', { class: 'btn', onclick: () => { Q.tracked = id; this.show('journal'); } }, 'Rastrear missão'));
      } else if (s.status === 'done') {
        right.appendChild(h('div', { class: 'stamp' }, 'CONCLUÍDA'));
        if (d.doneText) right.appendChild(h('p', { class: 'quest-summary' }, fmt(typeof d.doneText === 'function' ? d.doneText(G.questCtx) : d.doneText)));
      } else right.appendChild(h('div', { class: 'stamp failed' }, 'FALHOU'));
    }
    B.append(left, right);
  }

  // ======================= MAPA =======================
  render_map(B) {
    const page = h('div', { class: 'page left wide map-page' });
    const S = 640;
    const cv = h('canvas', { class: 'world-map', width: S, height: S });
    page.appendChild(h('h2', {}, 'Mapa do Reino de Valdren'));
    page.appendChild(h('div', { class: 'subtle' }, 'Pedras-guia ativadas permitem viagem rápida: clique nelas no mapa.'));
    const wrap = h('div', { class: 'map-wrap' }, cv);
    page.appendChild(wrap);
    B.appendChild(page);
    const ctx = cv.getContext('2d');
    const img = this.ui.mapImage || this.ui.buildMapImage();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, S, S);
    // vinheta de pergaminho
    const grd = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.72);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(60,40,10,0.55)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, S, S);
    const toMap = (x, z) => [(x + WORLD.half) / (WORLD.half * 2) * S, (z + WORLD.half) / (WORLD.half * 2) * S];
    ctx.font = '600 13px Cinzel, Georgia, serif';
    ctx.textAlign = 'center';
    for (const k in LOC) {
      const l = LOC[k];
      if (k === 'mountains') continue;
      const known = G.story.discovered[k] || ['brumavale', 'castle', 'rift'].includes(k);
      const [x, y] = toMap(l.x, l.z);
      ctx.fillStyle = known ? '#2a1a08' : 'rgba(42,26,8,0.45)';
      ctx.strokeStyle = 'rgba(255,240,200,0.85)';
      ctx.lineWidth = 3;
      const name = known ? l.name : '???';
      ctx.strokeText(name, x, y - 8);
      ctx.fillText(name, x, y - 8);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }
    const stones = [];
    for (const w of WAYSTONES) {
      const [x, y] = toMap(w.x, w.z);
      const on = G.story.waystones[w.id];
      ctx.fillStyle = on ? '#5ae0ff' : '#506068';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.fillRect(x - 4, y - 7, 8, 14); ctx.strokeRect(x - 4, y - 7, 8, 14);
      stones.push({ w, x, y, on });
    }
    const tq = G.quests.tracked, mk = tq ? G.quests.markerOf(tq) : null;
    if (mk) { const [x, y] = toMap(mk.x, mk.z); ctx.fillStyle = '#f3d27a'; ctx.strokeStyle = '#3a2408'; ctx.lineWidth = 2; star(ctx, x, y, 10); }
    const p = G.player;
    const [px, py] = toMap(p.pos.x, p.pos.z);
    ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI - p.yaw);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // rosa dos ventos
    ctx.fillStyle = '#2a1a08'; ctx.font = '700 18px Cinzel, Georgia, serif'; ctx.fillText('N', S - 34, 40);
    ctx.beginPath(); ctx.moveTo(S - 34, 46); ctx.lineTo(S - 40, 70); ctx.lineTo(S - 34, 64); ctx.lineTo(S - 28, 70); ctx.closePath(); ctx.fill();
    cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect();
      const mx = (e.clientX - r.left) * (S / r.width), my = (e.clientY - r.top) * (S / r.height);
      for (const s of stones) if (Math.hypot(mx - s.x, my - s.y) < 12) {
        if (!s.on) { G.ui.toast('Ative esta pedra-guia visitando-a primeiro.', 'warn'); return; }
        this.close();
        G.travelTo(s.w);
        return;
      }
    });
  }

  // ======================= CRÔNICAS =======================
  render_codex(B) {
    const left = h('div', { class: 'page left' });
    const right = h('div', { class: 'page right' });
    left.appendChild(h('h2', {}, 'Crônicas de Valdren'));
    const ids = G.story.codex;
    if (!ids.length) left.appendChild(h('p', { class: 'subtle' }, 'Converse com as pessoas e explore para descobrir a história do reino.'));
    for (const id of ids) {
      const e = CODEX[id];
      if (!e) continue;
      left.appendChild(h('div', { class: 'quest-item' + (this.selCodex === id ? ' sel' : ''), onclick: () => { this.selCodex = id; this.show('codex'); } }, e.title));
    }
    const sel = this.selCodex && CODEX[this.selCodex] ? CODEX[this.selCodex] : null;
    if (sel) right.append(h('h2', {}, sel.title), ...sel.text.split('\n\n').map((p) => h('p', { class: 'codex-text' }, fmt(p))));
    else right.appendChild(h('p', { class: 'subtle center' }, `Memórias de Lyra recuperadas: ${G.story.flags.lyraMemories || 0} / 5`));
    B.append(left, right);
  }

  // ======================= PAUSA =======================
  openPause() {
    if (G.state !== 'play') return;
    G.setState('pause');
    this.renderPause();
    this.pauseEl.classList.remove('hidden');
  }

  closePause() {
    this.pauseEl.classList.add('hidden');
    if (G.state === 'pause') G.setState('play');
    G.input.wantLock = true;
    G.input.lock();
  }

  renderPause(sub = 'main') {
    const P = this.pauseEl;
    clear(P);
    const box = h('div', { class: 'pause-box' });
    P.appendChild(box);
    if (sub === 'main') {
      box.append(h('h1', {}, 'Pausa'), h('div', { class: 'subtle' }, `Tempo de jogo: ${formatPlay(G.time.playTime)}`));
      const btn = (t, f) => h('button', { class: 'btn wide', onclick: f }, t);
      box.append(
        btn('Continuar', () => this.closePause()),
        btn('Salvar jogo', () => { G.save.save('manual'); G.ui.toast('Jogo salvo.', 'item'); }),
        btn('Carregar último save', () => { if (G.save.has()) { this.pauseEl.classList.add('hidden'); G.loadGame(); } else G.ui.toast('Nenhum save encontrado.', 'warn'); }),
        btn('Configurações', () => this.renderPause('settings')),
        btn('Controles', () => this.renderPause('controls')),
        btn('Voltar ao título', () => { if (confirm('Voltar ao título? O progresso não salvo será perdido.')) { this.pauseEl.classList.add('hidden'); G.toTitle(); } }),
      );
    } else if (sub === 'settings') {
      box.appendChild(h('h1', {}, 'Configurações'));
      box.appendChild(settingsPanel(() => this.renderPause('settings')));
      box.appendChild(h('button', { class: 'btn wide', onclick: () => this.renderPause('main') }, 'Voltar'));
    } else if (sub === 'controls') {
      box.appendChild(h('h1', {}, 'Controles'));
      box.appendChild(controlsTable());
      box.appendChild(h('button', { class: 'btn wide', onclick: () => this.renderPause('main') }, 'Voltar'));
    }
  }

  // ======================= AÇÕES (loja/descanso/viagem) =======================
  openAction(action, npc) {
    if (!action) return;
    const [kind, arg] = String(action).split(':');
    if (kind === 'shop') this.openShop(arg || npc?.id);
    else if (kind === 'rest') this.openRest();
    else if (kind === 'travel') this.openTravel();
  }

  openPanel(title, content) {
    if (G.state === 'play') G.setState('menu');
    input.unlock();
    clear(this.panelEl);
    const box = h('div', { class: 'panel-box' }, h('h2', {}, title), content, h('button', { class: 'btn', onclick: () => this.closePanel() }, 'Fechar [Esc]'));
    this.panelEl.appendChild(box);
    this.panelEl.classList.remove('hidden');
  }

  closePanel() {
    this.panelEl.classList.add('hidden');
    if (G.state === 'menu' && this.el.classList.contains('hidden')) G.setState('play');
  }

  openShop(shopId, tab = 'buy') {
    const shop = SHOPS[shopId];
    if (!shop) return;
    const d = G.stats.derived();
    const wrap = h('div', { class: 'shop' });
    const tabs = h('div', { class: 'shop-tabs' },
      h('button', { class: 'btn small' + (tab === 'buy' ? ' active' : ''), onclick: () => this.openShop(shopId, 'buy') }, 'Comprar'),
      h('button', { class: 'btn small' + (tab === 'sell' ? ' active' : ''), onclick: () => this.openShop(shopId, 'sell') }, 'Vender'),
      h('span', { class: 'shop-gold' }, `Seu ouro: ${G.stats.gold}`));
    wrap.appendChild(tabs);
    const list = h('div', { class: 'shop-list' });
    if (tab === 'buy') {
      for (const id of shop.items(G.questCtx)) {
        const it = ITEMS[id];
        const price = Math.round(it.price * d.priceMul);
        const owned = G.inventory.count(id);
        const unique = ['weapon', 'armor', 'amulet'].includes(it.type) && owned > 0;
        list.appendChild(h('div', { class: 'shop-row' },
          h('div', { class: 'shop-icon', html: itemIcon(it) }),
          h('div', { class: 'shop-info' }, h('div', { class: 'shop-name' }, it.name + (owned ? ` (tem ${owned})` : '')), h('div', { class: 'shop-desc' }, it.desc + statLine(it))),
          h('button', { class: 'btn small', disabled: unique || G.stats.gold < price || null, onclick: () => { G.stats.addGold(-price); G.inventory.add(id, 1); G.audio?.play('coin'); this.openShop(shopId, 'buy'); } }, unique ? 'Possui' : `${price} ouro`)));
      }
    } else {
      const ids = Object.keys(G.inventory.items).filter((id) => ITEMS[id].type !== 'quest' && !G.inventory.isEquipped(id) && ITEMS[id].price > 0);
      if (!ids.length) list.appendChild(h('p', { class: 'subtle' }, 'Nada para vender.'));
      for (const id of ids) {
        const it = ITEMS[id];
        const price = Math.max(1, Math.round(it.price * d.sellMul));
        list.appendChild(h('div', { class: 'shop-row' },
          h('div', { class: 'shop-icon', html: itemIcon(it) }),
          h('div', { class: 'shop-info' }, h('div', { class: 'shop-name' }, `${it.name} ×${G.inventory.count(id)}`), h('div', { class: 'shop-desc' }, it.desc)),
          h('button', { class: 'btn small', onclick: () => { G.inventory.remove(id, 1); G.stats.addGold(price); G.audio?.play('coin'); this.openShop(shopId, 'sell'); } }, `+${price} ouro`)));
      }
    }
    wrap.appendChild(list);
    this.openPanel(shop.name, wrap);
  }

  openRest() {
    const wrap = h('div', { class: 'rest' },
      h('p', {}, 'Um quarto aquecido, lençóis limpos e o cheiro de pão. Descansar restaura completamente sua vida e mana.'),
      h('div', { class: 'rest-btns' },
        h('button', { class: 'btn', onclick: () => { this.closePanel(); G.rest(7); } }, 'Dormir até o amanhecer (7h)'),
        h('button', { class: 'btn', onclick: () => { this.closePanel(); G.rest(21); } }, 'Dormir até a noite (21h)'),
        h('button', { class: 'btn', onclick: () => { this.closePanel(); G.rest(12); } }, 'Dormir até o meio-dia (12h)')));
    this.openPanel('Descansar na Estalagem', wrap);
  }

  openTravel() {
    const wrap = h('div', { class: 'travel' }, h('p', {}, 'A pedra vibra sob seus dedos. Para onde deseja ir?'));
    for (const w of WAYSTONES) {
      const on = G.story.waystones[w.id];
      wrap.appendChild(h('button', { class: 'btn wide', disabled: !on || null, onclick: () => { this.closePanel(); G.travelTo(w); } }, on ? w.name : '??? (não ativada)'));
    }
    this.openPanel('Pedra-Guia', wrap);
  }
}

function statLine(it) {
  const p = [];
  if (it.dmg) p.push(`Dano ${it.dmg}`);
  if (it.def) p.push(`Defesa ${it.def}`);
  if (it.bonus) for (const k in it.bonus) p.push(`+${it.bonus[k]} ${ATTR_INFO[k].short}`);
  return p.length ? ' — ' + p.join(', ') : '';
}

function hintFor(sid) {
  return ({
    fogo: 'Dizem que o Santuário da Chama, nas colinas a nordeste de Brumavale, guarda uma brasa eterna.',
    agua: 'A druida Thalia protege o Lago Espelhado, a oeste.',
    luz: 'O Templo do Sol Caído fica a leste, além do rio.',
    terra: 'Algo antigo dorme na Cratera do Colosso, nos Picos de Granito.',
    vento: 'Um eremita excêntrico vive numa torre a sudoeste.',
    psiquico: 'Uma voz infantil chama você em sonhos...',
    toon: 'As crianças da vila falam de um "bicho desenhado".',
    sombra: 'A Pedra Negra do cemitério sussurra à noite.',
  })[sid] || '';
}

export function settingsPanel(rerender) {
  const S = G.settings;
  const wrap = h('div', { class: 'settings' });
  const row = (label, control) => h('div', { class: 'set-row' }, h('label', {}, label), control);
  const range = (key, min, max, step, onChange) => {
    const el = h('input', { type: 'range', min, max, step, value: S[key] });
    el.addEventListener('input', () => { S[key] = Number(el.value); onChange?.(); G.saveSettings(); });
    return el;
  };
  wrap.append(
    row('Sensibilidade do mouse', range('sensitivity', 0.2, 3, 0.05)),
    row('Inverter eixo Y', (() => { const c = h('input', { type: 'checkbox' }); c.checked = S.invertY; c.addEventListener('change', () => { S.invertY = c.checked; G.saveSettings(); }); return c; })()),
    row('Campo de visão', range('fov', 50, 90, 1)),
    row('Volume da música', range('musicVolume', 0, 1, 0.05, () => G.audio?.applyVolumes())),
    row('Volume dos efeitos', range('sfxVolume', 0, 1, 0.05, () => G.audio?.applyVolumes())),
    row('Números de dano', (() => { const c = h('input', { type: 'checkbox' }); c.checked = S.showDamage; c.addEventListener('change', () => { S.showDamage = c.checked; G.saveSettings(); }); return c; })()),
    row('Qualidade gráfica', (() => {
      const sel = h('select', {}, ...['low', 'medium', 'high'].map((q) => h('option', { value: q, selected: S.quality === q || null }, { low: 'Baixa', medium: 'Média', high: 'Alta' }[q])));
      sel.addEventListener('change', () => { S.quality = sel.value; G.engine.applyQuality(); G.saveSettings(); });
      return sel;
    })()),
  );
  return wrap;
}

export function controlsTable() {
  const rows = [
    ['W A S D', 'Mover'], ['Mouse', 'Câmera'], ['Shift', 'Correr'], ['Espaço', 'Pular'], ['Q', 'Esquivar (rolamento)'],
    ['Botão esquerdo', 'Ataque com espada (combo de 3)'], ['Botão direito', 'Bloquear — no momento exato: APARO'],
    ['1 – 4', 'Poderes equipados'], ['E', 'Interagir / Falar'], ['R / T', 'Poção de vida / mana'], ['F', 'Travar alvo'],
    ['C', 'Personagem e atributos'], ['I', 'Inventário'], ['K', 'Poderes'], ['J', 'Diário'], ['M', 'Mapa'], ['L', 'Crônicas'], ['Esc', 'Pausa'],
    ['Roda do mouse', 'Zoom da câmera'], ['Setas', 'Girar câmera (alternativa)'],
  ];
  return h('div', { class: 'controls' }, rows.map(([k, v]) => h('div', { class: 'ctrl-row' }, h('span', { class: 'kbd' }, k), h('span', {}, v))));
}

function formatPlay(s) {
  s = Math.floor(s);
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
}
