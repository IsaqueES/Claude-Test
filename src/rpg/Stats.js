// Atributos, níveis e estatísticas derivadas.
import { G } from '../core/context.js';
import { events } from '../core/Events.js';

export const ATTRS = ['for', 'des', 'vit', 'int', 'esp', 'car'];

export const ATTR_INFO = {
  for: { name: 'Força', short: 'FOR', icon: 'fist', desc: 'Aumenta o dano com armas, a eficiência do bloqueio e permite intimidar em diálogos.' },
  des: { name: 'Destreza', short: 'DES', icon: 'feather', desc: 'Aumenta a velocidade de ataque, a chance de golpe crítico e reduz o custo da esquiva.' },
  vit: { name: 'Vitalidade', short: 'VIT', icon: 'heart', desc: 'Aumenta a vida máxima, o vigor e a resistência a efeitos.' },
  int: { name: 'Inteligência', short: 'INT', icon: 'book', desc: 'Aumenta o dano dos poderes naturais (fogo, água, luz, terra, vento) e a mana máxima. Revela pistas em diálogos.' },
  esp: { name: 'Espírito', short: 'ESP', icon: 'eye', desc: 'Aumenta o dano dos poderes sobrenaturais (psíquico, toon, sombra) e a regeneração de mana. Abre caminhos místicos em diálogos.' },
  car: { name: 'Carisma', short: 'CAR', icon: 'crown', desc: 'Reduz preços nas lojas e desbloqueia opções persuasivas em diálogos.' },
};

export const ORIGINS = {
  ferreiro: { name: 'Aprendiz de Ferreiro', desc: 'Cresceu batendo ferro na forja de Bram. Braços fortes, coração firme.', bonus: { for: 2, vit: 1 }, gold: 20 },
  cacador: { name: 'Caçador das Brumas', desc: 'Conhece cada trilha da floresta. Ágil e silencioso.', bonus: { des: 2, vit: 1 }, gold: 25 },
  erudito: { name: 'Erudito do Mosteiro', desc: 'Leu os pergaminhos proibidos da capela. A mente é sua lâmina.', bonus: { int: 2, esp: 1 }, gold: 30 },
  andarilho: { name: 'Andarilho Contador de Histórias', desc: 'Viajou de vila em vila com histórias e um sorriso.', bonus: { car: 2, esp: 1 }, gold: 60 },
};

export class Stats {
  constructor() {
    this.level = 1;
    this.xp = 0;
    this.attrs = { for: 5, des: 5, vit: 5, int: 5, esp: 5, car: 5 };
    this.points = 0;
    this.skillPoints = 0;
    this.gold = 0;
    this.maxLevel = 20;
  }

  xpToNext() {
    const l = this.level;
    return Math.round(100 + (l - 1) * 90 + Math.pow(l - 1, 2) * 8);
  }

  addXp(n) {
    if (this.level >= this.maxLevel) return;
    n = Math.round(n);
    this.xp += n;
    events.emit('xp', n);
    while (this.xp >= this.xpToNext() && this.level < this.maxLevel) {
      this.xp -= this.xpToNext();
      this.level++;
      this.points += 3;
      this.skillPoints += 1;
      events.emit('levelup', this.level);
    }
  }

  addGold(n) {
    this.gold = Math.max(0, this.gold + Math.round(n));
    events.emit('gold', n);
  }

  // Valor efetivo (base + bônus de equipamento/efeitos)
  attr(k) {
    const eq = G.inventory ? G.inventory.attrBonus(k) : 0;
    const buff = G.player && G.player.attrBuff ? (G.player.attrBuff[k] || 0) : 0;
    return this.attrs[k] + eq + buff;
  }

  derived() {
    const F = this.attr('for'), D = this.attr('des'), V = this.attr('vit'), I = this.attr('int'), E = this.attr('esp'), C = this.attr('car');
    const L = this.level;
    const inv = G.inventory;
    const weaponDmg = inv ? inv.weaponDamage() : 10;
    const def = inv ? inv.defense() : 3;
    const extra = inv ? inv.extraStats() : {};
    return {
      maxHp: Math.round(70 + V * 12 + L * 8 + (extra.hp || 0)),
      maxMana: Math.round(40 + I * 5 + E * 4 + L * 3 + (extra.mana || 0)),
      maxStamina: Math.round(80 + V * 3 + D * 3),
      meleeDmg: weaponDmg * (1 + F * 0.06) + L * 0.6,
      natPower: 1 + I * 0.07 + L * 0.02,
      supPower: 1 + E * 0.07 + L * 0.02,
      crit: Math.min(0.5, 0.04 + D * 0.012 + (extra.crit || 0)),
      critMul: 1.6 + (extra.critMul || 0),
      atkSpeed: 1 + D * 0.018,
      manaRegen: 1.4 + E * 0.22 + (extra.manaRegen || 0),
      stamRegen: 28 + D * 1.2,
      defense: def,
      blockEff: Math.min(0.92, 0.62 + F * 0.015),
      rollCost: Math.max(12, 24 - D * 0.6),
      priceMul: Math.max(0.6, 1.25 - C * 0.035),
      sellMul: Math.min(0.6, 0.25 + C * 0.02),
      lightBonus: extra.lightBonus || 0,
    };
  }

  serialize() {
    return { level: this.level, xp: this.xp, attrs: { ...this.attrs }, points: this.points, skillPoints: this.skillPoints, gold: this.gold };
  }

  load(d) {
    Object.assign(this, { level: d.level, xp: d.xp, points: d.points, skillPoints: d.skillPoints, gold: d.gold });
    this.attrs = { ...d.attrs };
  }
}
