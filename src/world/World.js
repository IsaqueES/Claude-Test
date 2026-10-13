// Mundo: monta terreno, água, estruturas, vegetação e objetos dinâmicos.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { RNG, clamp } from '../core/math.js';
import { Terrain } from './Terrain.js';
import { Collision } from './Collision.js';
import { Batcher, Brush } from './Batcher.js';
import { buildStructures } from './Structures.js';
import { Vegetation } from './Vegetation.js';
import { createWater } from './Water.js';
import { regionAt } from './WorldMap.js';

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'world';
    scene.add(this.group);
    this.interactables = [];
    this.barriers = {};
    this.dynamic = [];
    this.glowTex = makeGlowTexture();
  }

  build(onProgress = () => {}) {
    onProgress('Moldando o relevo...');
    this.terrain = new Terrain();
    this.group.add(this.terrain.buildMesh());
    this.collision = new Collision(this.terrain);

    onProgress('Erguendo vilas e castelos...');
    this.materials = {
      std: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.88, metalness: 0 }),
      metal: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.35, metalness: 0.75 }),
      glow: new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.4, 1.4, 1.4) }),
      window: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.4, emissive: new THREE.Color(0xffa040), emissiveIntensity: 0 }),
      rift: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.25, metalness: 0.1, emissive: new THREE.Color(0x8a30ff), emissiveIntensity: 1.1 }),
      _opts: { glow: { castShadow: false }, window: { castShadow: false } },
    };
    this.batcher = new Batcher(100);
    this.brush = new Brush(this.batcher, this.collision);
    this.anchors = buildStructures(this.brush, this.terrain, this.collision);
    this.staticMeshes = this.batcher.build(this.group, this.materials);

    onProgress('Plantando florestas...');
    this.vegetation = new Vegetation(this.scene, this.terrain, this.collision);
    this.vegetation.build();

    onProgress('Enchendo rios e lagos...');
    this.water = createWater(this.scene, this.terrain);

    onProgress('Acendendo tochas...');
    this.buildDynamic();
  }

  buildDynamic() {
    const A = this.anchors;
    // ---- Moinho: pás giratórias ----
    if (A.windmillHub) {
      const hub = new THREE.Group();
      hub.position.set(A.windmillHub.x, A.windmillHub.y, A.windmillHub.z);
      hub.rotation.y = A.windmillYaw || 0;
      const sails = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0x8a6a44, flatShading: true, roughness: 0.9 });
      const cloth = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, flatShading: true, roughness: 1, side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) {
        const arm = new THREE.Group();
        arm.rotation.z = (i / 4) * Math.PI * 2;
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.25, 8, 0.2), mat);
        beam.position.y = 4;
        const sail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 6.5, 0.05), cloth);
        sail.position.set(0.9, 4.6, 0.05);
        beam.castShadow = sail.castShadow = true;
        arm.add(beam, sail);
        sails.add(arm);
      }
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.6, 8), mat);
      cap.rotation.x = Math.PI / 2;
      sails.add(cap);
      hub.add(sails);
      this.group.add(hub);
      this.sails = sails;
    }

    // ---- Tochas e lampiões: chamas instanciadas + halos ----
    const flames = [...A.torches.map((p) => ({ ...p, kind: 'torch' })), ...A.lamps.map((p) => ({ ...p, kind: 'lamp' }))];
    for (const c of A.campfires) flames.push({ ...c, kind: 'fire' });
    if (A.forge) flames.push({ ...A.forge, kind: 'forge' });
    this.flamePoints = flames;
    const flameGeo = new THREE.IcosahedronGeometry(0.18, 0);
    flameGeo.scale(1, 1.8, 1);
    const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.2, 0.35) });
    this.flameMesh = new THREE.InstancedMesh(flameGeo, flameMat, Math.max(1, flames.length));
    this.flameMesh.frustumCulled = false;
    this.group.add(this.flameMesh);
    // Halos (Points)
    const pos = new Float32Array(flames.length * 3);
    flames.forEach((f, i) => { pos[i * 3] = f.x; pos[i * 3 + 1] = f.y + 0.1; pos[i * 3 + 2] = f.z; });
    const hg = new THREE.BufferGeometry();
    hg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.halos = new THREE.Points(hg, new THREE.PointsMaterial({ size: 3.2, map: this.glowTex, color: 0xffa050, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    this.halos.frustumCulled = false;
    this.group.add(this.halos);
    // Luzes reutilizáveis para as chamas mais próximas
    this.torchLights = [];
    this.extraFlames = []; // chamas acesas durante o jogo: { x, y, z, intensity }
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xff9a40, 0, 16, 1.6);
      this.scene.add(l);
      this.torchLights.push(l);
    }

    // ---- Pedras flutuantes da Fenda ----
    const rng = new RNG(808);
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x3a2a48, flatShading: true, roughness: 0.8, emissive: 0x200830 });
    const N = 28;
    this.floatRocks = new THREE.InstancedMesh(rockGeo, rockMat, N);
    this.floatData = [];
    for (let i = 0; i < N; i++) {
      const x = rng.float(-110, 110), z = rng.float(-350, -255);
      this.floatData.push({ x, z, y: rng.float(8, 38), s: rng.float(1, 5), ph: rng.float(0, 6.28), sp: rng.float(0.3, 0.8), ry: rng.float(0, 6) });
    }
    this.floatRocks.castShadow = true;
    this.group.add(this.floatRocks);

    // ---- Núcleo do Coração (arena final) ----
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.6, 0), new THREE.MeshStandardMaterial({ color: 0xd0a0ff, emissive: 0xa050ff, emissiveIntensity: 1.6, flatShading: true, roughness: 0.2 }));
    core.position.set(A.anchors.arena.x, 12, A.anchors.arena.z);
    this.group.add(core);
    this.heartCore = core;

    // ---- Pedras-guia: brilho pulsante ----
    this.waystoneGlows = [];
    for (const w of A.waystones) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0x5ae0ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.position.set(w.x, w.y + 2.2, w.z);
      s.scale.set(3, 3, 3);
      this.group.add(s);
      this.waystoneGlows.push(s);
    }

    // ---- Barreiras mágicas ----
    this.createBarrier('castleS', A.anchors.castleGateS, 0, 9, 0xb050ff);
    this.createBarrier('castleN', A.anchors.castleGateN, 0, 9, 0xb050ff);
    this.createBarrier('crater', A.anchors.craterGate, A.anchors.craterGate.yaw, 8.4, 0xffa040);
  }

  createBarrier(name, p, yaw, width, color) {
    if (!p) return;
    const y = p.y !== undefined ? p.y : this.terrain.heightAt(p.x, p.z);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uFade: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uTime, uFade; uniform vec3 uColor; varying vec2 vUv;
        void main(){
          float hex = abs(sin(vUv.x * 40.0 + sin(vUv.y * 30.0 + uTime) * 2.0) * sin(vUv.y * 24.0 - uTime * 1.5));
          float edge = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
          float a = (0.18 + 0.5 * pow(hex, 6.0)) * edge * uFade;
          gl_FragColor = vec4(uColor * (1.4 + hex), a);
        }`,
      transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, 7.5), mat);
    mesh.position.set(p.x, y + 3.5, p.z);
    mesh.rotation.y = yaw;
    this.group.add(mesh);
    const col = this.collision.addBox(p.x, p.z, width / 2, 0.6, yaw, { y0: y - 1, y1: y + 8, tag: 'barrier' });
    this.barriers[name] = { mesh, col, active: true, fade: 1 };
  }

  setBarrier(name, active) {
    const b = this.barriers[name];
    if (!b) return;
    b.active = active;
    b.col.enabled = active;
    if (active) { b.mesh.visible = true; }
  }

  // ---------- Interativos ----------
  addInteractable(it) {
    // it: { id, pos:{x,y,z}, radius, prompt, onInteract, mesh?, enabled? }
    it.enabled = it.enabled ?? true;
    it.radius = it.radius ?? 2.4;
    if (it.pos.y === undefined) it.pos.y = this.terrain.heightAt(it.pos.x, it.pos.z);
    this.interactables.push(it);
    if (it.mesh) { it.mesh.position.set(it.pos.x, it.pos.y, it.pos.z); this.group.add(it.mesh); }
    return it;
  }

  removeInteractable(idOrIt) {
    const i = this.interactables.findIndex((x) => x === idOrIt || x.id === idOrIt);
    if (i >= 0) {
      const it = this.interactables[i];
      if (it.mesh) { it.mesh.parent?.remove(it.mesh); }
      this.interactables.splice(i, 1);
    }
  }

  getInteractable(id) { return this.interactables.find((x) => x.id === id); }

  nearestInteractable(pos, facingYaw) {
    let best = null, bd = Infinity;
    for (const it of this.interactables) {
      if (!it.enabled) continue;
      if (it.condition && !it.condition()) continue;
      const dx = it.pos.x - pos.x, dz = it.pos.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d > it.radius) continue;
      if (Math.abs(it.pos.y - pos.y) > 4) continue;
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }

  heightAt(x, z) { return this.terrain.heightAt(x, z); }
  groundAt(x, z, feetY) { return this.collision.groundHeight(x, z, feetY); }
  regionAt(x, z) { return regionAt(x, z); }

  update(dt, focus, camPos) {
    const t = G.time.now;
    const night = G.sky ? G.sky.night : 0;
    if (this.sails) this.sails.rotation.z -= dt * 0.6;
    this.materials.window.emissiveIntensity = night * 1.4;
    this.materials.rift.emissiveIntensity = 0.9 + Math.sin(t * 2) * 0.25;
    this.water.update(dt);
    this.vegetation.update(dt, camPos);

    // chamas
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    this.flamePoints.forEach((f, i) => {
      const fl = 0.8 + Math.sin(t * 13 + i * 3.1) * 0.12 + Math.sin(t * 23 + i) * 0.08;
      const sc = f.kind === 'fire' ? 3.2 : f.kind === 'forge' ? 2.2 : f.kind === 'lamp' ? 0.0 : 1.2;
      m.compose(p.set(f.x, f.y + (f.kind === 'fire' ? 0.3 : 0), f.z), q, s.set(sc * fl, sc * fl * (1 + Math.sin(t * 9 + i) * 0.1), sc * fl));
      this.flameMesh.setMatrixAt(i, m);
    });
    this.flameMesh.instanceMatrix.needsUpdate = true;
    this.halos.material.opacity = 0.25 + night * 0.45;

    // luzes nas chamas mais próximas do foco (conjunto fixo: o número de luzes nunca muda)
    if (focus) {
      const cands = [];
      for (const f of this.flamePoints) {
        const d = (f.x - focus.x) ** 2 + (f.z - focus.z) ** 2;
        if (d < 70 * 70) cands.push({ x: f.x, y: f.y + 0.4, z: f.z, d, base: (f.kind === 'fire' || f.kind === 'forge' ? 14 : 8) * (0.25 + night * 0.9) });
      }
      for (const f of this.extraFlames) {
        const d = (f.x - focus.x) ** 2 + (f.z - focus.z) ** 2;
        if (d < 70 * 70) cands.push({ x: f.x, y: f.y, z: f.z, d, base: f.intensity, steady: true });
      }
      cands.sort((a, b) => a.d - b.d);
      this.torchLights.forEach((l, i) => {
        const e = cands[i];
        if (!e) { l.intensity = 0; return; }
        l.position.set(e.x, e.y, e.z);
        const flick = e.steady ? 1 : 0.85 + Math.sin(t * 17 + i * 2) * 0.1 + Math.sin(t * 29 + i) * 0.05;
        l.intensity = e.base * flick;
      });
    }

    // fumaça das chaminés
    if (G.fx && this._smokeT === undefined) this._smokeT = 0;
    this._smokeT = (this._smokeT || 0) + dt;
    if (G.fx && this._smokeT > 0.35 && focus) {
      this._smokeT = 0;
      for (const c of this.anchors.chimneys) {
        if ((c.x - focus.x) ** 2 + (c.z - focus.z) ** 2 > 140 * 140) continue;
        G.fx.emit({ x: c.x, y: c.y, z: c.z, count: 1, color: 0x8a8580, color2: 0x5a5856, size: 2.2, sizeEnd: 5, life: 5, speed: 0.4, up: 1.4, spread: 0.3, alpha: 0.3, blend: 'normal', drag: 0.2 });
      }
    }

    // pedras flutuantes
    this.floatData.forEach((r, i) => {
      const y = this.terrain.heightAt(r.x, r.z) + r.y + Math.sin(t * r.sp + r.ph) * 1.5;
      q.setFromEuler(new THREE.Euler(t * 0.05 * r.sp, r.ry + t * 0.1 * r.sp, 0));
      m.compose(p.set(r.x, y, r.z), q, s.set(r.s, r.s * 0.7, r.s));
      this.floatRocks.setMatrixAt(i, m);
    });
    this.floatRocks.instanceMatrix.needsUpdate = true;

    // núcleo do Coração
    if (this.heartCore) {
      this.heartCore.rotation.y += dt * 0.8;
      this.heartCore.position.y = 12 + Math.sin(t * 1.3) * 0.6;
    }
    this.waystoneGlows.forEach((s2, i) => { const k = 2.6 + Math.sin(t * 2 + i) * 0.4; s2.scale.set(k, k, k); });

    // barreiras
    for (const k in this.barriers) {
      const b = this.barriers[k];
      b.mesh.material.uniforms.uTime.value = t;
      b.fade += ((b.active ? 1 : 0) - b.fade) * clamp(dt * 2, 0, 1);
      b.mesh.material.uniforms.uFade.value = b.fade;
      b.mesh.visible = b.fade > 0.02;
    }

    // interativos animados
    for (const it of this.interactables) if (it.update) it.update(dt, t);
  }
}
