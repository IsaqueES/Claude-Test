// Salvamento em localStorage.
import { G } from './context.js';

const KEY = 'valdren_save_v1';
const SETTINGS_KEY = 'valdren_settings_v1';

export class SaveSystem {
  has() {
    try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
  }

  info() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      return d ? { name: d.app?.name, level: d.stats?.level, time: d.savedAt, playTime: d.time?.playTime } : null;
    } catch (e) { return null; }
  }

  gather() {
    const p = G.player;
    return {
      version: 1,
      savedAt: Date.now(),
      app: G.app,
      stats: G.stats.serialize(),
      inventory: G.inventory.serialize(),
      powers: G.powers.serialize(),
      quests: G.quests.serialize(),
      story: G.story.serialize(),
      time: { hours: G.time.hours, day: G.time.day, playTime: G.time.playTime },
      player: { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw, hp: p.hp, mana: p.mana },
      npcs: Object.fromEntries(G.npcs.list.map((n) => [n.id, { x: n.home.x, z: n.home.z, yaw: n.baseYaw }])),
    };
  }

  save(kind = 'auto') {
    if (!G.player || !G.player.alive) return false;
    if (G.story.flags.noSave) return false;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.gather()));
      return true;
    } catch (e) {
      console.warn('Falha ao salvar', e);
      return false;
    }
  }

  autosave() {
    if (G.state === 'play' || G.state === 'dialogue' || G.state === 'menu') {
      if (this.save('auto')) G.ui?.toast('Jogo salvo automaticamente', 'save');
    }
  }

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      return d && d.version === 1 ? d : null;
    } catch (e) { return null; }
  }

  wipe() { try { localStorage.removeItem(KEY); } catch (e) { /* */ } }

  loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      if (s) Object.assign(G.settings, s);
    } catch (e) { /* */ }
  }

  saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(G.settings)); } catch (e) { /* */ }
  }
}
