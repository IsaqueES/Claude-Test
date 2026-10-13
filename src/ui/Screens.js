// Telas: título, criação de personagem, introdução, morte, finais e créditos.
import { G } from '../core/context.js';
import { input } from '../core/Input.js';
import { h, clear } from './dom.js';
import { SKIN_TONES, HAIR_COLORS, CAPE_COLORS, OUTFIT_COLORS, HAIR_STYLES_M, HAIR_STYLES_F } from '../entities/Models.js';
import { ORIGINS, ATTR_INFO } from '../rpg/Stats.js';
import { settingsPanel, controlsTable } from './Menus.js';
import { fmt } from '../rpg/Story.js';

const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const HAIR_NAMES = { short: 'Curto', wild: 'Rebelde', bald: 'Raspado', ponytail: 'Rabo de cavalo', long: 'Longo', bun: 'Coque' };

export class Screens {
  constructor(root) {
    this.root = root;
    this.el = h('div', { class: 'screen hidden interactive' });
    root.appendChild(this.el);
    this.token = 0; // muda a cada troca de tela: sequências assíncronas antigas (intro, final) param sozinhas
  }

  hide() { this.token++; this.el.classList.add('hidden'); clear(this.el); this.el.className = 'screen hidden interactive'; }

  // ---------------- Título ----------------
  showTitle({ hasSave, onNew, onContinue }) {
    this.token++;
    clear(this.el);
    this.el.className = 'screen title-screen interactive';
    const menu = h('div', { class: 'title-menu' });
    const btn = (t, f, cls = '') => h('button', { class: 'btn title-btn ' + cls, onclick: () => { G.audio?.play('click'); f(); } }, t);
    if (hasSave) menu.appendChild(btn('Continuar', onContinue, 'primary'));
    menu.append(
      btn('Novo Jogo', onNew, hasSave ? '' : 'primary'),
      btn('Configurações', () => this.overlay('Configurações', settingsPanel())),
      btn('Controles', () => this.overlay('Controles', controlsTable())),
      btn('Créditos', () => this.overlay('Créditos', creditsBlock())),
    );
    this.el.append(
      h('div', { class: 'title-logo' },
        h('div', { class: 'title-kicker' }, 'Uma lenda do reino partido'),
        h('h1', { class: 'title-main' }, 'Valdren'),
        h('div', { class: 'title-sub' }, 'Ecos da Fenda'),
        h('div', { class: 'title-orn' })),
      menu,
      h('div', { class: 'title-foot' }, 'Clique para começar • Recomendado: mouse e teclado'),
    );
  }

  overlay(title, content) {
    const ov = h('div', { class: 'overlay interactive' }, h('div', { class: 'overlay-box' }, h('h2', {}, title), content, h('button', { class: 'btn', onclick: () => ov.remove() }, 'Fechar')));
    this.el.appendChild(ov);
  }

  // ---------------- Criação de personagem ----------------
  showCreation(onChange, onDone) {
    this.token++;
    clear(this.el);
    this.el.className = 'screen create-screen interactive';
    const app = { name: 'Aren', gender: 'm', skin: 1, hairColor: 1, hairStyle: 'short', cape: 0, outfit: 0, origin: 'ferreiro', beard: false };
    const panel = h('div', { class: 'create-panel' });
    const render = () => {
      clear(panel);
      panel.appendChild(h('h1', {}, 'Quem é você?'));
      const nameIn = h('input', { class: 'name-input', maxlength: 16, value: app.name });
      nameIn.addEventListener('input', () => { app.name = nameIn.value.trim() || (app.gender === 'f' ? 'Aria' : 'Aren'); });
      nameIn.addEventListener('keydown', (e) => e.stopPropagation());
      panel.appendChild(h('div', { class: 'c-row' }, h('label', {}, 'Nome'), nameIn));
      const seg = (opts, cur, set) => h('div', { class: 'seg' }, opts.map(([v, t]) => h('button', { class: 'seg-btn' + (cur === v ? ' on' : ''), onclick: () => { set(v); onChange(app); render(); } }, t)));
      panel.appendChild(h('div', { class: 'c-row' }, h('label', {}, 'Corpo'), seg([['m', 'Masculino'], ['f', 'Feminino']], app.gender, (v) => {
        const wasDefault = app.name === 'Aren' || app.name === 'Aria';
        app.gender = v;
        if (wasDefault) app.name = v === 'f' ? 'Aria' : 'Aren';
        app.hairStyle = v === 'f' ? 'long' : 'short';
      })));
      const sw = (list, cur, set) => h('div', { class: 'swatches' }, list.map((c, i) => h('button', { class: 'swatch' + (cur === i ? ' on' : ''), style: { background: hex(c) }, onclick: () => { set(i); onChange(app); render(); } })));
      panel.appendChild(h('div', { class: 'c-row' }, h('label', {}, 'Pele'), sw(SKIN_TONES, app.skin, (i) => (app.skin = i))));
      panel.appendChild(h('div', { class: 'c-row' }, h('label', {}, 'Cabelo'), sw(HAIR_COLORS, app.hairColor, (i) => (app.hairColor = i))));
      const styles = app.gender === 'f' ? HAIR_STYLES_F : HAIR_STYLES_M;
      panel.appendChild(h('div', { class: 'c-row' }, h('label', {}, 'Penteado'), seg(styles.map((s) => [s, HAIR_NAMES[s]]), app.hairStyle, (v) => (app.hairStyle = v))));
      if (app.gender === 'm') panel.appendChild(h('div', { class: 'c-row' }, h('label', {}, 'Barba'), seg([[false, 'Não'], [true, 'Sim']], app.beard, (v) => (app.beard = v))));
      panel.appendChild(h('div', { class: 'c-row' }, h('label', {}, 'Capa e escudo'), sw(CAPE_COLORS, app.cape, (i) => (app.cape = i))));
      panel.appendChild(h('div', { class: 'c-row' }, h('label', {}, 'Túnica'), sw(OUTFIT_COLORS, app.outfit, (i) => (app.outfit = i))));
      panel.appendChild(h('h2', {}, 'Origem'));
      const og = h('div', { class: 'origins' });
      for (const k in ORIGINS) {
        const o = ORIGINS[k];
        const bonus = Object.entries(o.bonus).map(([a, v]) => `+${v} ${ATTR_INFO[a].name}`).join(', ');
        og.appendChild(h('button', { class: 'origin' + (app.origin === k ? ' on' : ''), onclick: () => { app.origin = k; render(); } },
          h('div', { class: 'o-name' }, o.name), h('div', { class: 'o-desc' }, o.desc), h('div', { class: 'o-bonus' }, bonus + ` • ${o.gold} ouro`)));
      }
      panel.appendChild(og);
    };
    render();
    const startBtn = h('button', { class: 'btn primary big create-start', onclick: () => { G.audio?.play('click'); onDone(app); } }, 'Começar a Jornada ▸');
    this.el.append(panel, startBtn, h('div', { class: 'create-hint' }, 'Arraste para girar a visualização'));
    onChange(app);
  }

  // ---------------- Introdução ----------------
  async showIntro(pages, onDone) {
    const tok = ++this.token;
    const live = () => this.token === tok;
    clear(this.el);
    this.el.className = 'screen intro-screen interactive';
    const text = h('div', { class: 'intro-text' });
    let skipped = false;
    const skip = h('button', { class: 'btn skip', onclick: () => { skipped = true; finish(); } }, 'Pular ▸▸');
    this.el.append(h('div', { class: 'intro-embers' }), text, skip);
    let done = false;
    const finish = () => { if (done || !live()) return; done = true; onDone(); };
    for (const pg of pages) {
      if (skipped || !live()) return;
      clear(text);
      const p = h('p', { class: 'intro-p' + (pg.voice ? ' voice' : '') }, fmt(pg.text));
      text.appendChild(p);
      void p.offsetWidth;
      p.classList.add('in');
      await waitOrClick(this.el, pg.time || Math.max(4.5, pg.text.length * 0.055), () => skipped || !live());
      if (skipped || !live()) return;
      p.classList.remove('in');
      p.classList.add('out');
      await wait(0.8);
    }
    finish();
  }

  // ---------------- Morte ----------------
  showDeath({ onRetry, onLoad }) {
    this.token++;
    clear(this.el);
    this.el.className = 'screen death-screen interactive';
    this.el.append(
      h('h1', { class: 'death-title' }, 'Você Caiu'),
      h('p', { class: 'death-sub' }, fmt('Mas a marca em sua mão ainda pulsa. O Aether não deixará {o|a} Portador{|a} partir tão cedo...')),
      h('div', { class: 'death-btns' },
        h('button', { class: 'btn primary', onclick: onRetry }, 'Levantar-se (perde 10% do ouro)'),
        h('button', { class: 'btn', onclick: onLoad }, 'Carregar último save')),
    );
  }

  // ---------------- Final ----------------
  async showEnding(ending, slides, onDone) {
    const tok = ++this.token;
    const live = () => this.token === tok;
    clear(this.el);
    this.el.className = 'screen ending-screen interactive ' + (ending.style || '');
    const box = h('div', { class: 'ending-box' });
    this.el.appendChild(box);
    const skipAll = { v: false };
    const skip = h('button', { class: 'btn skip', onclick: () => { skipAll.v = true; } }, 'Avançar ▸');
    this.el.appendChild(skip);
    // título
    box.append(h('div', { class: 'ending-kicker' }, 'Final ' + ending.index + ' de 6'), h('h1', { class: 'ending-title' }, ending.title));
    await waitOrClick(this.el, 3.5, () => skipAll.v || !live());
    for (const s of slides) {
      if (!live()) return;
      clear(box);
      const p = h('div', { class: 'ending-slide' }, s.head ? h('h2', {}, fmt(s.head)) : null, ...fmt(s.text).split('\n\n').map((t) => h('p', {}, t)));
      box.appendChild(p);
      void p.offsetWidth;
      p.classList.add('in');
      skipAll.v = false;
      await waitOrClick(this.el, Math.max(5, s.text.length * 0.05), () => skipAll.v || !live());
    }
    if (!live()) return;
    // créditos
    clear(box);
    skip.remove();
    const roll = h('div', { class: 'credits-roll' }, creditsBlock(true));
    box.appendChild(roll);
    box.appendChild(h('button', { class: 'btn primary', style: { marginTop: '24px' }, onclick: onDone }, 'Voltar ao título'));
  }
}

function creditsBlock(full = false) {
  return h('div', { class: 'credits' },
    h('h3', {}, 'Valdren: Ecos da Fenda'),
    h('p', {}, 'Um RPG de ação em terceira pessoa feito inteiramente com código: mundo, personagens, efeitos, música e sons gerados proceduralmente.'),
    h('p', {}, 'Motor: Three.js • Construção: Vite'),
    h('p', {}, 'Fontes: Cinzel, Cinzel Decorative, EB Garamond, Bangers (SIL Open Font License)'),
    full ? h('p', { class: 'thanks' }, 'Obrigado por jogar. Existem seis finais — suas escolhas moldaram este.') : null,
  );
}

const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
function waitOrClick(el, s, skipped) {
  return new Promise((res) => {
    let done = false;
    const end = () => { if (done) return; done = true; el.removeEventListener('click', end); clearInterval(iv); clearTimeout(to); res(); };
    const to = setTimeout(end, s * 1000);
    const iv = setInterval(() => { if (skipped()) end(); }, 100);
    setTimeout(() => el.addEventListener('click', end), 400);
  });
}
