// Motor: renderizador, cena, câmera, pós-processamento e laço principal.
import * as THREE from 'three';
import { G } from './context.js';
import { PostFX } from '../post/Post.js';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
    renderer.setClearColor(0x88a8c8);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(G.settings.fov, window.innerWidth / window.innerHeight, 0.1, 1400);
    this.camera.position.set(0, 20, 40);
    this.scene.add(this.camera);

    this.post = new PostFX(renderer, this.scene, this.camera);
    this.timer = new THREE.Timer();
    this.timer.connect(document);
    this.updaters = [];
    this.frame = 0;
    this.fps = 60;
    this._fpsAcc = 0; this._fpsN = 0;
    this.applyQuality();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  applyQuality() {
    const q = G.settings.quality;
    const dpr = window.devicePixelRatio || 1;
    this.pixelRatio = q === 'low' ? Math.min(dpr, 0.85) : q === 'medium' ? Math.min(dpr, 1.25) : Math.min(dpr, 2);
    this.renderer.shadowMap.enabled = q !== 'low';
    this.post.setBloom(q !== 'low');
    this.resize();
    // Força recompilação de materiais quando sombras mudam.
    this.scene.traverse((o) => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => (m.needsUpdate = true)); } });
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(this.pixelRatio || 1);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post.setSize(w, h, this.pixelRatio || 1);
  }

  start(updateFn) {
    this.updateFn = updateFn;
    const loop = (ts) => {
      requestAnimationFrame(loop);
      this.timer.update(ts);
      let dt = this.timer.getDelta();
      if (dt > 0.1) dt = 0.1; // evita saltos enormes (aba em segundo plano)
      this._fpsAcc += dt; this._fpsN++;
      if (this._fpsAcc > 0.5) { this.fps = this._fpsN / this._fpsAcc; this._fpsAcc = 0; this._fpsN = 0; }
      this.frame++;
      try {
        this.updateFn(dt);
      } catch (e) {
        console.error(e);
        if (!this._errShown) { this._errShown = true; G.ui?.toast?.('Erro: ' + e.message, 'error'); }
      }
      this.post.update(dt, G.time.now);
      this.post.render();
    };
    requestAnimationFrame(loop);
  }
}
