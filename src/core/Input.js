// Gerenciador de entrada: teclado, mouse e pointer lock.
import { G } from './context.js';
import { events } from './Events.js';

class InputManager {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.mouse = { dx: 0, dy: 0, wheel: 0, buttons: new Set(), pressed: new Set(), released: new Set(), x: 0, y: 0 };
    this.locked = false;
    this.canvas = null;
    this.enabled = true;
    this.wantLock = false;
  }

  init(canvas) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      // Evita rolagem da página e atalhos que atrapalham o jogo.
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
      events.emit('key', e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
      this.released.add(e.code);
    });
    window.addEventListener('blur', () => {
      this.down.clear();
      this.mouse.buttons.clear();
    });
    canvas.addEventListener('mousedown', (e) => {
      if (G.state === 'play' && !this.locked && this.wantLock) this.lock();
      this.mouse.buttons.add(e.button);
      this.mouse.pressed.add(e.button);
    });
    window.addEventListener('mouseup', (e) => {
      this.mouse.buttons.delete(e.button);
      this.mouse.released.add(e.button);
    });
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (this.locked) {
        // Limita picos anômalos de movimento que alguns navegadores geram.
        const mx = Math.max(-200, Math.min(200, e.movementX || 0));
        const my = Math.max(-200, Math.min(200, e.movementY || 0));
        this.mouse.dx += mx;
        this.mouse.dy += my;
      }
    });
    canvas.addEventListener('wheel', (e) => {
      this.mouse.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => { if (G.state === 'play') e.preventDefault(); });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === canvas;
      if (was && !this.locked) events.emit('pointerunlock');
    });
  }

  lock() {
    if (!this.canvas || this.locked) return;
    try {
      const p = this.canvas.requestPointerLock?.();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* navegador sem suporte */ }
  }

  unlock() {
    if (document.pointerLockElement) document.exitPointerLock?.();
  }

  isDown(code) { return this.enabled && this.down.has(code); }
  wasPressed(code) { return this.enabled && this.pressed.has(code); }
  mouseDown(b) { return this.enabled && this.mouse.buttons.has(b); }
  mousePressed(b) { return this.enabled && this.mouse.pressed.has(b); }
  mouseReleased(b) { return this.mouse.released.has(b); }

  consumeMouse() {
    const d = { dx: this.mouse.dx, dy: this.mouse.dy, wheel: this.mouse.wheel };
    this.mouse.dx = 0; this.mouse.dy = 0; this.mouse.wheel = 0;
    return d;
  }

  // Chamado no fim de cada quadro.
  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.mouse.pressed.clear();
    this.mouse.released.clear();
  }

  // Simulação (testes automatizados / debug)
  simulateKey(code, isDown) {
    if (isDown) { if (!this.down.has(code)) this.pressed.add(code); this.down.add(code); }
    else { this.down.delete(code); this.released.add(code); }
  }
  simulateMouse(button, isDown) {
    if (isDown) { this.mouse.buttons.add(button); this.mouse.pressed.add(button); }
    else { this.mouse.buttons.delete(button); this.mouse.released.add(button); }
  }
}

export const input = new InputManager();
