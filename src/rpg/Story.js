// Estado narrativo: marcadores de escolhas, carma e utilidades de texto.
import { G } from '../core/context.js';
import { events } from '../core/Events.js';

export class Story {
  constructor() {
    this.flags = {};
    this.karma = 0;          // -100 (sombra) .. +100 (luz)
    this.discovered = {};    // locais descobertos
    this.waystones = {};     // pedras-guia ativadas
    this.codex = [];         // entradas de lore desbloqueadas
    this.choices = [];       // histórico de escolhas relevantes (para o epílogo)
  }

  set(k, v = true) {
    const old = this.flags[k];
    this.flags[k] = v;
    if (old !== v) events.emit('flag', { k, v });
  }
  get(k) { return this.flags[k]; }
  inc(k, n = 1) { this.set(k, (this.flags[k] || 0) + n); return this.flags[k]; }

  addKarma(n, silent = false) {
    this.karma = Math.max(-100, Math.min(100, this.karma + n));
    if (!silent) {
      if (n > 0) G.ui?.toast('Sua consciência se aquieta. (Luz +' + n + ')', 'karmaUp');
      else if (n < 0) G.ui?.toast('Algo sombrio se agita em você. (Sombra +' + -n + ')', 'karmaDown');
    }
    events.emit('karma', this.karma);
  }

  record(text) { this.choices.push(text); }

  addCodex(id) {
    if (this.codex.includes(id)) return false;
    this.codex.push(id);
    G.ui?.toast('Nova entrada nas Crônicas', 'codex');
    return true;
  }

  alignmentName() {
    const k = this.karma;
    if (k >= 50) return 'Portador da Aurora';
    if (k >= 20) return 'Coração Luminoso';
    if (k > -20) return 'Equilíbrio Incerto';
    if (k > -50) return 'Coração Sombrio';
    return 'Arauto do Abismo';
  }

  serialize() {
    return { flags: { ...this.flags }, karma: this.karma, discovered: { ...this.discovered }, waystones: { ...this.waystones }, codex: [...this.codex], choices: [...this.choices] };
  }
  load(d) {
    this.flags = { ...(d.flags || {}) };
    this.karma = d.karma || 0;
    this.discovered = { ...(d.discovered || {}) };
    this.waystones = { ...(d.waystones || {}) };
    this.codex = [...(d.codex || [])];
    this.choices = [...(d.choices || [])];
  }
}

// Formata texto: {nome} e formas de gênero {o|a}
export function fmt(text) {
  if (typeof text === 'function') text = text();
  if (!text) return '';
  const app = G.player?.app || G.app || { name: 'Viajante', gender: 'm' };
  const fem = app.gender === 'f';
  return text
    .replace(/\{nome\}/g, app.name)
    .replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m, f) => (fem ? f : m));
}
