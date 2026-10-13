// Teste de fumaça: abre docs/index.html num Chromium headless, começa um jogo novo, luta,
// usa poderes, abre os menus e salva. Falha se aparecer qualquer erro de JavaScript.
//
//   npm test                      (gera docs/index.html e roda o teste)
//   CHROME_PATH=/caminho/chrome npm test   (usa outro Chromium em vez do do Playwright)
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const url = pathToFileURL(path.join(root, 'docs', 'index.html')).href;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  // WebGL por software, para funcionar em máquinas sem GPU (CI)
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.stack || e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const step = (name) => console.log('•', name);
try {
  step('carregando o jogo');
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 180_000 });

  step('novo jogo');
  await page.evaluate(async () => {
    const G = window.__G;
    G.game.newGame({ name: 'Teste', gender: 'f', skin: 1, hairColor: 1, hairStyle: 'long', cape: 0, outfit: 0, origin: 'erudito', beard: false });
    G.screens.hide();
    await G.game.beginPlay(true);
  });
  await page.waitForFunction(() => window.__G.state === 'play', null, { timeout: 30_000 });

  step('combate e poderes');
  await page.evaluate(async () => {
    const G = window.__G, dbg = window.__dbg;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    dbg.god();
    dbg.allSchools();
    dbg.spawn('wolf', 2);
    dbg.spawn('doodle', 1);
    await sleep(1500);
    const powers = ['bola_fogo', 'lanca_agua', 'lanca_solar', 'espinhos_pedra', 'lamina_vento', 'telecinese', 'bigorna', 'passo_sombrio'];
    for (const id of powers) {
      G.powers.ranks[id] = 1;
      G.powers.slots[0] = id;
      G.powers.cds[id] = 0;
      G.player.mana = G.player.d.maxMana;
      G.powers.cast(0);
      await sleep(500);
    }
    for (const e of G.entities.list) if (e.alive && e.team === 'enemy') G.combat.kill(e, {});
    await sleep(1500);
  });

  step('menus e salvamento');
  await page.evaluate(async () => {
    const G = window.__G;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (const tab of ['char', 'inv', 'powers', 'journal', 'map', 'codex']) { G.ui.menus.open(tab); await sleep(250); G.ui.menus.close(); }
    if (!G.save.save('manual')) throw new Error('falha ao salvar');
  });
} catch (e) {
  errors.push('teste interrompido: ' + (e.stack || e.message));
}
await browser.close();

if (errors.length) {
  console.error(`\n${errors.length} erro(s):\n` + errors.join('\n\n'));
  process.exit(1);
}
console.log('\nOK: nenhum erro encontrado.');
