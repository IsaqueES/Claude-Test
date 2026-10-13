// Gerenciador de missões: estágios, objetivos, eventos, marcadores e recompensas.
import { G } from '../core/context.js';
import { events } from '../core/Events.js';
import { itemName } from '../data/items.js';
import { fmt } from './Story.js';

export class QuestManager {
  constructor(defs) {
    this.defs = defs;
    this.state = {};
    this.tracked = null;
    this._t = 0;
    this._pending = {}; // id da missão -> índice do estágio com avanço agendado
    events.on('kill', (d) => this.onEvent('kill', d));
    events.on('item', (d) => this.onEvent('item', d));
    events.on('itemRemoved', (d) => this.onEvent('item', d));
    events.on('flag', (d) => this.onEvent('flag', d));
    events.on('interact', (d) => this.onEvent('interact', d));
    events.on('talk', (d) => this.onEvent('talk', d));
  }

  def(id) { return this.defs[id]; }
  st(id) { return this.state[id]; }
  isActive(id) { return this.state[id]?.status === 'active'; }
  isDone(id) { return this.state[id]?.status === 'done'; }
  isStarted(id) { return !!this.state[id]; }
  stageId(id) { const s = this.state[id]; if (!s || s.status !== 'active') return null; return this.defs[id].stages[s.stage]?.id; }
  atStage(id, stageId) { return this.stageId(id) === stageId; }
  pastStage(id, stageId) {
    const s = this.state[id];
    if (!s) return false;
    if (s.status === 'done') return true;
    const idx = this.defs[id].stages.findIndex((x) => x.id === stageId);
    return s.stage > idx;
  }

  start(id, silent = false) {
    const d = this.defs[id];
    if (!d || this.state[id]) return false;
    this.state[id] = { status: 'active', stage: 0, progress: [] };
    if (!silent) {
      G.ui?.questBanner(d.type === 'main' ? 'Missão Principal' : 'Missão Secundária', fmt(d.title));
      G.audio?.play('questStart');
    }
    if (!this.tracked || d.type === 'main' || !this.isActive(this.tracked)) this.tracked = id;
    this.enterStage(id);
    events.emit('questStart', id);
    return true;
  }

  enterStage(id) {
    const s = this.state[id];
    const stage = this.defs[id].stages[s.stage];
    s.progress = (stage.objectives || []).map(() => 0);
    stage.onStart?.(this.ctx());
    stage.setup?.(this.ctx());
    this.checkPassive(id);
    events.emit('questUpdate', id);
  }

  // Avança para o próximo estágio (ou um estágio nomeado)
  advance(id, toStageId) {
    const s = this.state[id];
    if (!s || s.status !== 'active') return;
    const d = this.defs[id];
    const cur = d.stages[s.stage];
    cur.onComplete?.(this.ctx());
    if (toStageId) s.stage = d.stages.findIndex((x) => x.id === toStageId);
    else s.stage++;
    if (s.stage < 0 || s.stage >= d.stages.length) { this.complete(id); return; }
    G.ui?.toast('Missão atualizada: ' + fmt(d.title), 'quest');
    G.audio?.play('questUpdate');
    this.enterStage(id);
  }

  setStage(id, stageId) {
    if (!this.state[id]) this.start(id, true);
    const s = this.state[id];
    s.status = 'active';
    s.stage = this.defs[id].stages.findIndex((x) => x.id === stageId);
    this.enterStage(id);
  }

  complete(id) {
    const s = this.state[id];
    if (!s || s.status === 'done') return;
    const d = this.defs[id];
    s.status = 'done';
    s.stage = d.stages.length;
    const r = d.rewards || {};
    if (r.xp) G.stats.addXp(r.xp);
    if (r.gold) G.stats.addGold(r.gold);
    if (r.skillPoints) G.stats.skillPoints += r.skillPoints;
    if (r.items) for (const [it, n] of r.items) G.inventory.add(it, n ?? 1, true);
    G.ui?.questBanner('Missão Concluída', fmt(d.title), rewardText(r));
    G.audio?.play('questDone');
    d.onComplete?.(this.ctx());
    if (this.tracked === id) this.tracked = this.pickTracked();
    events.emit('questDone', id);
    G.save?.autosave();
  }

  fail(id, reason) {
    const s = this.state[id];
    if (!s) return;
    s.status = 'failed';
    G.ui?.toast('Missão falhou: ' + fmt(this.defs[id].title) + (reason ? ' — ' + reason : ''), 'warn');
    if (this.tracked === id) this.tracked = this.pickTracked();
  }

  pickTracked() {
    const act = Object.keys(this.state).filter((k) => this.state[k].status === 'active');
    return act.find((k) => this.defs[k].type === 'main') || act[0] || null;
  }

  active() { return Object.keys(this.state).filter((k) => this.state[k].status === 'active'); }
  done() { return Object.keys(this.state).filter((k) => this.state[k].status === 'done'); }

  ctx() { return G.questCtx; }

  // Eventos do jogo -> objetivos
  onEvent(type, data) {
    for (const id of this.active()) {
      const s = this.state[id];
      const stage = this.defs[id].stages[s.stage];
      if (!stage?.objectives) continue;
      let changed = false;
      stage.objectives.forEach((o, i) => {
        if (s.progress[i] >= (o.count || 1)) return;
        if (o.type === 'kill' && type === 'kill') {
          const t = data.target;
          const okType = !o.enemy || (Array.isArray(o.enemy) ? o.enemy.includes(data.type) : o.enemy === data.type);
          const okTag = !o.tag || (data.tags || []).includes(o.tag) || t?.questTag === o.tag;
          if (okType && okTag) { s.progress[i]++; changed = true; }
        } else if (o.type === 'talk' && type === 'talk' && data.npc === o.npc) {
          s.progress[i] = 1; changed = true;
        } else if (o.type === 'interact' && type === 'interact' && data.id === o.id) {
          s.progress[i] = Math.min((o.count || 1), s.progress[i] + 1); changed = true;
        }
      });
      if (type === 'item' || type === 'flag') this.checkPassive(id);
      if (changed) this.afterProgress(id);
    }
  }

  // Objetivos de estado (ter item, marcador, local)
  checkPassive(id) {
    const s = this.state[id];
    if (!s || s.status !== 'active') return;
    const stage = this.defs[id].stages[s.stage];
    if (!stage?.objectives) return;
    let changed = false;
    stage.objectives.forEach((o, i) => {
      let v = s.progress[i];
      if (o.type === 'have') v = Math.min(o.count || 1, G.inventory.count(o.item));
      else if (o.type === 'flag') v = G.story.flags[o.flag] ? 1 : 0;
      else if (o.type === 'reach' && G.player && (!o.when || o.when())) {
        const d = Math.hypot(G.player.pos.x - o.x, G.player.pos.z - o.z);
        if (d < (o.r || 8)) v = 1;
      } else if (o.type === 'count' && o.fn) v = Math.min(o.count || 1, o.fn());
      if (v !== s.progress[i]) { s.progress[i] = v; changed = true; }
    });
    if (changed) this.afterProgress(id);
  }

  afterProgress(id) {
    const s = this.state[id];
    if (!s || s.status !== 'active') return;
    events.emit('questUpdate', id);
    this.scheduleAdvance(id);
  }

  stageDone(id) {
    const s = this.state[id];
    const stage = s && this.defs[id].stages[s.stage];
    return !!stage?.objectives && stage.objectives.every((o, i) => s.progress[i] >= (o.count || 1));
  }

  // Com todos os objetivos do estágio atual cumpridos, avança após um pequeno atraso (para o
  // jogador perceber). O agendamento vale só para aquele estágio: um avanço pendente de um
  // estágio anterior nunca bloqueia o seguinte.
  scheduleAdvance(id) {
    const s = this.state[id];
    if (!s || s.status !== 'active') return;
    const idx = s.stage;
    if (this.defs[id].stages[idx]?.auto === false || !this.stageDone(id)) return;
    if (this._pending[id] === idx) return;
    this._pending[id] = idx;
    setTimeout(() => {
      if (this._pending[id] === idx) delete this._pending[id];
      if (this.state[id]?.status === 'active' && this.state[id].stage === idx && this.stageDone(id)) this.advance(id);
    }, 600);
  }

  update(dt) {
    this._t += dt;
    if (this._t > 0.5) {
      this._t = 0;
      for (const id of this.active()) this.checkPassive(id);
    }
  }

  // Texto dos objetivos para HUD/diário
  objectiveLines(id) {
    const s = this.state[id];
    if (!s || s.status !== 'active') return [];
    const stage = this.defs[id].stages[s.stage];
    const lines = [];
    if (stage.text) lines.push({ text: fmt(stage.text), done: false, main: true });
    (stage.objectives || []).forEach((o, i) => {
      if (!o.label && (o.count || 1) <= 1) return;
      const c = o.count || 1;
      const label = fmt(o.label || (o.type === 'have' ? itemName(o.item) : o.type === 'kill' ? 'Derrotados' : ''));
      lines.push({ text: c > 1 ? `${label} (${Math.min(c, s.progress[i])}/${c})` : label, done: s.progress[i] >= c });
    });
    return lines;
  }

  // Posição do marcador do estágio atual
  markerOf(id) {
    const s = this.state[id];
    if (!s || s.status !== 'active') return null;
    const stage = this.defs[id].stages[s.stage];
    let m = stage.marker;
    if (typeof m === 'function') m = m(this.ctx());
    if (!m) {
      const o = (stage.objectives || []).find((ob, i) => s.progress[i] < (ob.count || 1));
      if (o?.type === 'talk') m = { npc: o.npc };
      else if (o?.type === 'reach') m = { x: o.x, z: o.z };
    }
    if (!m) return null;
    if (m.npc) {
      const n = G.npcs?.get(m.npc);
      return n && n.visible !== false ? { x: n.pos.x, z: n.pos.z, y: n.pos.y } : null;
    }
    if (m.interact) {
      const it = G.world.getInteractable(m.interact);
      return it ? { x: it.pos.x, z: it.pos.z, y: it.pos.y } : null;
    }
    return m;
  }

  serialize() {
    const st = {};
    for (const k in this.state) st[k] = { status: this.state[k].status, stage: this.state[k].stage, progress: [...this.state[k].progress] };
    return { state: st, tracked: this.tracked };
  }

  reset() {
    this.state = {};
    this.tracked = null;
    this._pending = {};
  }

  load(d) {
    this.state = {};
    this._pending = {};
    for (const k in d.state || {}) if (this.defs[k]) this.state[k] = { ...d.state[k], progress: [...(d.state[k].progress || [])] };
    this.tracked = d.tracked;
  }

  // Recria o estado do mundo para estágios ativos (após carregar)
  restoreWorld() {
    for (const id of this.active()) {
      const s = this.state[id];
      const stage = this.defs[id].stages[s.stage];
      stage.setup?.(this.ctx(), true);
    }
    for (const id of Object.keys(this.state)) this.defs[id].restore?.(this.ctx(), this.state[id]);
    // um save feito logo depois de cumprir os objetivos ainda precisa avançar o estágio
    for (const id of this.active()) this.scheduleAdvance(id);
  }
}

function rewardText(r) {
  const parts = [];
  if (r.xp) parts.push(`+${r.xp} XP`);
  if (r.gold) parts.push(`+${r.gold} ouro`);
  if (r.skillPoints) parts.push(`+${r.skillPoints} Ponto de Essência`);
  if (r.items) for (const [it, n] of r.items) parts.push(itemName(it) + ((n ?? 1) > 1 ? ' ×' + n : ''));
  return parts.join('  •  ');
}
