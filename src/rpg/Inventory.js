// Inventário, equipamento, consumíveis e espólio no chão.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { events } from '../core/Events.js';
import { ITEMS, itemName } from '../data/items.js';
import { rand } from '../core/math.js';

export class Inventory {
  constructor() {
    this.items = {}; // id -> quantidade
    this.equipped = { weapon: 'espada_gasta', armor: 'tunica', amulet: null };
  }

  count(id) { return this.items[id] || 0; }
  has(id, n = 1) { return this.count(id) >= n; }

  add(id, n = 1, silent = false) {
    if (!ITEMS[id]) { console.warn('item desconhecido', id); return; }
    this.items[id] = (this.items[id] || 0) + n;
    if (!silent) {
      G.ui?.toast(`Obteve: ${itemName(id)}${n > 1 ? ' ×' + n : ''}`, 'item');
      G.audio?.play('pickup');
    }
    events.emit('item', { id, n });
  }

  remove(id, n = 1) {
    if (!this.has(id, n)) return false;
    this.items[id] -= n;
    if (this.items[id] <= 0) delete this.items[id];
    events.emit('itemRemoved', { id, n });
    return true;
  }

  equip(id) {
    const it = ITEMS[id];
    if (!it || !this.has(id)) return false;
    const slot = it.type;
    if (!['weapon', 'armor', 'amulet'].includes(slot)) return false;
    this.equipped[slot] = id;
    G.audio?.play('equip');
    if ((slot === 'weapon' || slot === 'armor') && G.player) G.player.buildModel();
    events.emit('equip', { slot, id });
    return true;
  }

  unequip(slot) {
    if (slot === 'weapon') return false;
    if (slot === 'armor') this.equipped.armor = 'tunica';
    else this.equipped[slot] = null;
    if (G.player && slot === 'armor') G.player.buildModel();
    return true;
  }

  isEquipped(id) { return Object.values(this.equipped).includes(id); }

  weaponDamage() { return ITEMS[this.equipped.weapon]?.dmg || 8; }
  weaponElement() { return ITEMS[this.equipped.weapon]?.element || 'physical'; }

  defense() {
    let d = ITEMS[this.equipped.armor]?.def || 2;
    if (this.equipped.amulet) d += ITEMS[this.equipped.amulet]?.def || 0;
    return d;
  }

  attrBonus(k) {
    let b = 0;
    for (const s in this.equipped) {
      const it = ITEMS[this.equipped[s]];
      if (it?.bonus?.[k]) b += it.bonus[k];
    }
    return b;
  }

  extraStats() {
    const out = { hp: 0, mana: 0, crit: 0, manaRegen: 0 };
    for (const s in this.equipped) {
      const it = ITEMS[this.equipped[s]];
      if (!it) continue;
      if (it.mana) out.mana += it.mana;
      if (it.hp) out.hp += it.hp;
      if (it.crit) out.crit += it.crit;
      if (it.manaRegen) out.manaRegen += it.manaRegen;
    }
    return out;
  }

  // Usa um consumível
  use(id) {
    const it = ITEMS[id];
    if (!it || it.type !== 'consumable' || !this.has(id)) return false;
    const p = G.player;
    if (!p.alive) return false;
    const d = G.stats.derived();
    if (it.heal) G.combat.heal(p, d.maxHp * it.heal);
    if (it.healFlat) G.combat.heal(p, it.healFlat);
    if (it.mana) { p.mana = Math.min(d.maxMana, p.mana + d.maxMana * it.mana); G.ui?.floatText(p.center, '+Mana', 'mana'); }
    if (it.buff === 'haste') { p.buffs.haste = { t: 30 }; G.ui?.floatText(p.center, 'Veloz!', 'buff'); }
    this.remove(id, 1);
    G.fx.burst(it.mana && !it.heal ? 'water' : 'heal', p.pos.x, p.pos.y + 1, p.pos.z, 0.6);
    G.audio?.play('drink');
    return true;
  }

  quickUse(id) {
    if (!this.has(id)) {
      // alternativas
      const alt = id === 'pocao_vida' ? ['elixir', 'queijo', 'pao'] : ['elixir'];
      const a = alt.find((x) => this.has(x));
      if (a) return this.use(a);
      G.ui?.toast(`Sem ${itemName(id)}`, 'warn');
      G.audio?.play('denied');
      return false;
    }
    return this.use(id);
  }

  serialize() { return { items: { ...this.items }, equipped: { ...this.equipped } }; }
  load(d) { this.items = { ...(d.items || {}) }; this.equipped = { weapon: 'espada_gasta', armor: 'tunica', amulet: null, ...(d.equipped || {}) }; }
}

// Espólio no chão (moedas e itens) com coleta automática ao se aproximar.
export class Loot {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.coinGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 10);
    this.coinMat = new THREE.MeshStandardMaterial({ color: 0xffd040, metalness: 0.8, roughness: 0.3, emissive: 0x403000 });
    this.bagGeo = new THREE.IcosahedronGeometry(0.28, 0);
    this.bagMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, flatShading: true, emissive: 0x201000 });
    this.glowMat = new THREE.SpriteMaterial({ color: 0xffe080, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  }

  dropGold(pos, amount) {
    const n = Math.min(6, Math.ceil(amount / 5));
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.coinGeo, this.coinMat);
      m.rotation.x = Math.PI / 2;
      this.spawn(m, pos, { gold: Math.round(amount / n) + (i === 0 ? amount % n : 0) });
    }
  }

  dropItem(pos, id) {
    const m = new THREE.Mesh(this.bagGeo, this.bagMat);
    const s = new THREE.Sprite(this.glowMat);
    s.scale.setScalar(1.2);
    m.add(s);
    this.spawn(m, pos, { item: id });
  }

  spawn(mesh, pos, data) {
    mesh.position.set(pos.x, pos.y + 1, pos.z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    const a = rand(0, Math.PI * 2), sp = rand(1.5, 3.5);
    this.list.push({ mesh, ...data, vel: new THREE.Vector3(Math.cos(a) * sp, rand(4, 6), Math.sin(a) * sp), t: 0, grounded: false });
  }

  update(dt) {
    const p = G.player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const l = this.list[i];
      l.t += dt;
      const m = l.mesh;
      if (!l.grounded) {
        l.vel.y -= 18 * dt;
        m.position.addScaledVector(l.vel, dt);
        const g = G.world.groundAt(m.position.x, m.position.z, m.position.y + 1) + 0.2;
        if (m.position.y < g) { m.position.y = g; l.grounded = true; }
      } else {
        m.rotation.y += dt * 3;
      }
      if (!p || !p.alive) continue;
      const dx = p.pos.x - m.position.x, dz = p.pos.z - m.position.z, dy = p.pos.y + 0.8 - m.position.y;
      const d = Math.hypot(dx, dy, dz);
      if (l.t > 0.6 && d < 3.5) {
        // atração magnética
        const k = Math.min(1, dt * 10);
        m.position.x += dx * k; m.position.y += dy * k; m.position.z += dz * k;
      }
      if (l.t > 0.6 && d < 0.9 || l.t > 60) {
        if (l.t <= 60) {
          if (l.gold) { G.stats.addGold(l.gold); G.audio?.play('coin'); G.ui?.floatText(p.center, '+' + l.gold + ' ouro', 'gold'); }
          if (l.item) G.inventory.add(l.item);
        }
        m.parent?.remove(m);
        this.list.splice(i, 1);
      }
    }
  }

  clear() { for (const l of this.list) l.mesh.parent?.remove(l.mesh); this.list.length = 0; }
}
