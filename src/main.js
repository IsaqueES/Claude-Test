// Valdren: Ecos da Fenda — ponto de entrada.
import './styles.css';
import { G } from './core/context.js';
import { Game } from './core/Game.js';

const root = document.getElementById('ui-root');
const loading = document.createElement('div');
loading.className = 'loading-screen';
loading.innerHTML = `
  <div class="loading-title">Valdren</div>
  <div class="loading-sub">Ecos da Fenda</div>
  <div class="loading-bar"><div class="loading-fill"></div></div>
  <div class="loading-msg">Despertando o reino...</div>`;
root.appendChild(loading);
const msgEl = loading.querySelector('.loading-msg');
const fill = loading.querySelector('.loading-fill');
let step = 0;

function fail(e) {
  console.error(e);
  msgEl.textContent = 'Não foi possível iniciar o jogo: ' + (e?.message || e) + '. Seu navegador precisa suportar WebGL.';
  msgEl.style.color = '#ff8a7a';
}

(async () => {
  try {
    const game = new Game();
    await game.init((m) => { msgEl.textContent = m; step++; fill.style.width = Math.min(95, step * 18) + '%'; });
    fill.style.width = '100%';
    G.engine.start((dt) => game.update(dt));
    game.showTitle();
    setTimeout(() => { loading.classList.add('out'); setTimeout(() => loading.remove(), 900); }, 200);
    window.__ready = true;
  } catch (e) {
    fail(e);
  }
})();
