// Motor de diálogos: árvores com condições, testes de atributos, efeitos e câmera cinematográfica.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { events } from '../core/Events.js';
import { fmt } from './Story.js';
import { ATTR_INFO } from './Stats.js';
import { itemName } from '../data/items.js';

export class DialogueManager {
  constructor(defs) {
    this.defs = defs;
    this.active = null;
  }

  // Inicia conversa com NPC (usa a árvore pelo id do NPC)
  startWithNPC(npc) {
    const def = this.defs[npc.dialogueId || npc.id];
    if (!def) {
      G.ui?.toast(npc.name + ' não tem nada a dizer agora.', 'info');
      return;
    }
    const S = G.questCtx;
    const start = def.start(S, npc);
    if (!start) return;
    events.emit('talk', { npc: npc.id });
    this.open(def, start, npc);
  }

  // Abre uma árvore arbitrária (cenas, objetos falantes)
  startTree(treeId, nodeId, npc = null) {
    const def = this.defs[treeId];
    if (!def) return;
    this.open(def, nodeId || def.start(G.questCtx, npc), npc);
  }

  open(def, nodeId, npc) {
    this.active = { def, npc, node: null, history: [], after: null };
    G.setState('dialogue');
    if (npc) {
      npc.talking = true;
      npc.faceTarget = G.player;
      G.player.faceYaw(G.player.yawTo(npc.pos.x, npc.pos.z), 100, 1);
      this.frameCamera(npc);
    }
    G.ui.dialogue.show();
    this.goto(nodeId);
  }

  frameCamera(npc) {
    const p = G.player.pos, n = npc.pos;
    const dx = n.x - p.x, dz = n.z - p.z;
    const d = Math.hypot(dx, dz) || 1;
    const ux = dx / d, uz = dz / d;
    const rx = -uz, rz = ux; // perpendicular
    const scale = npc.scale || 1;
    const nh = n.y + 1.6 * scale;
    // sobre o ombro do jogador, olhando para o NPC
    const cam = new THREE.Vector3(p.x - ux * 1.5 + rx * 0.9, p.y + 1.75, p.z - uz * 1.5 + rz * 0.9);
    const look = new THREE.Vector3(n.x - rx * 0.15, n.y + 0.78 * scale, n.z - rz * 0.15);
    if (npc.big) { cam.set(p.x - ux * 5 + rx * 2.5, p.y + 3, p.z - uz * 5 + rz * 2.5); look.set(n.x, n.y + 3.5, n.z); }
    G.cameraRig.setCinematic(cam, look, 4);
  }

  goto(nodeId) {
    const A = this.active;
    if (!A) return;
    if (!nodeId) { this.end(); return; }
    const node = A.def.nodes[nodeId];
    if (!node) { console.warn('nó de diálogo inexistente', nodeId); this.end(); return; }
    A.node = node;
    A.nodeId = nodeId;
    const S = G.questCtx;
    if (node.effect) node.effect(S, A.npc);
    if (node.redirect) { const r = node.redirect(S, A.npc); if (r) return this.goto(r); }
    const sp = typeof node.speaker === 'function' ? node.speaker(S, A.npc) : node.speaker;
    const speaker = sp === 'player' ? G.player.app.name : sp === 'narrador' ? '' : sp ? fmt(sp) : A.npc ? A.npc.name : '';
    const text = fmt(typeof node.text === 'function' ? node.text(S, A.npc) : node.text);
    const choices = (node.choices || []).filter((c) => !c.cond || c.cond(S, A.npc)).map((c) => this.describeChoice(c));
    A.choices = choices;
    if (node.action) A.after = node.action;
    G.ui.dialogue.setNode({ speaker, text, choices, isPlayer: sp === 'player', narration: sp === 'narrador' });
    if (A.npc) A.npc.talkPulse = 1;
    G.audio?.play('dialogue');
  }

  describeChoice(c) {
    let label = fmt(c.text);
    let enabled = true;
    let tag = '';
    let reqText = '';
    const r = c.req;
    if (r) {
      if (r.attr) {
        const v = G.stats.attr(r.attr);
        tag = `[${ATTR_INFO[r.attr].name} ${r.min}]`;
        if (v < r.min) { enabled = false; reqText = `requer ${ATTR_INFO[r.attr].name} ${r.min} (você tem ${v})`; }
      }
      if (r.item) {
        tag = tag || `[${itemName(r.item)}]`;
        if (!G.inventory.has(r.item, r.n || 1)) { enabled = false; reqText = `requer ${itemName(r.item)}${(r.n || 1) > 1 ? ' ×' + r.n : ''}`; }
      }
      if (r.gold) {
        tag = tag || `[${r.gold} ouro]`;
        if (G.stats.gold < r.gold) { enabled = false; reqText = `requer ${r.gold} ouro`; }
      }
      if (r.school) {
        tag = tag || `[${r.schoolName || r.school}]`;
        if (!G.powers.hasSchool(r.school)) { enabled = false; reqText = 'requer o poder: ' + (r.schoolName || r.school); }
      }
      if (r.karma !== undefined) {
        tag = tag || (r.karma >= 0 ? '[Luz]' : '[Sombra]');
        if ((r.karma >= 0 && G.story.karma < r.karma) || (r.karma < 0 && G.story.karma > r.karma)) { enabled = false; reqText = r.karma >= 0 ? 'seu coração não é luminoso o bastante' : 'seu coração não é sombrio o bastante'; }
      }
    }
    if (c.tag) tag = c.tag;
    return { raw: c, label, enabled, tag, reqText, karma: c.karmaHint };
  }

  choose(i) {
    const A = this.active;
    if (!A || !A.choices || !A.choices[i]) return;
    const ch = A.choices[i];
    if (!ch.enabled) { G.audio?.play('denied'); return; }
    G.audio?.play('click');
    const c = ch.raw;
    const S = G.questCtx;
    if (c.effect) c.effect(S, A.npc);
    if (c.action) A.after = c.action;
    if (c.end || (!c.next && !c.nextFn)) { this.end(); return; }
    this.goto(c.nextFn ? c.nextFn(S, A.npc) : c.next);
  }

  // Continuar (sem escolhas)
  advance() {
    const A = this.active;
    if (!A) return;
    if (A.choices && A.choices.length) return;
    const n = A.node;
    if (n.end || !n.next) { this.end(); return; }
    this.goto(typeof n.next === 'function' ? n.next(G.questCtx, A.npc) : n.next);
  }

  end() {
    const A = this.active;
    if (!A) return;
    this.active = null;
    if (A.npc) { A.npc.talking = false; A.npc.faceTarget = null; }
    G.ui.dialogue.hide();
    G.cameraRig.release();
    if (G.state === 'dialogue') G.setState('play');
    const after = A.after;
    if (after) setTimeout(() => (typeof after === 'function' ? after(G.questCtx, A.npc) : G.ui.openAction(after, A.npc)), 50);
    events.emit('dialogueEnd', A.npc?.id);
  }

  isOpen() { return !!this.active; }
}
