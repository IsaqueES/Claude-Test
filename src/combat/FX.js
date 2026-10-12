// Efeitos visuais: partículas (aditivas e normais), anéis, luzes, marcadores no chão, raios e rastros.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { rand, clamp, lerp } from '../core/math.js';

const pVert = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uScale;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const pFrag = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uSoft;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.5 * uSoft, d) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

class ParticlePool {
  constructor(scene, capacity, blending, soft = 0.0) {
    this.cap = capacity;
    this.n = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 300 }, uSoft: { value: soft } },
      vertexShader: pVert, fragmentShader: pFrag,
      transparent: true, depthWrite: false, blending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    // estado CPU
    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.max = new Float32Array(capacity);
    this.s0 = new Float32Array(capacity); this.s1 = new Float32Array(capacity);
    this.c0 = new Float32Array(capacity * 3); this.c1 = new Float32Array(capacity * 3);
    this.a0 = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
  }

  spawn(x, y, z, vx, vy, vz, life, s0, s1, c0, c1, a0, grav, drag) {
    if (this.n >= this.cap) return;
    const i = this.n++;
    const i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.life[i] = life; this.max[i] = life;
    this.s0[i] = s0; this.s1[i] = s1;
    this.c0[i3] = c0.r; this.c0[i3 + 1] = c0.g; this.c0[i3 + 2] = c0.b;
    this.c1[i3] = c1.r; this.c1[i3 + 1] = c1.g; this.c1[i3 + 2] = c1.b;
    this.a0[i] = a0; this.grav[i] = grav; this.drag[i] = drag;
  }

  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // remove trocando com o último
        const last = --this.n;
        if (i !== last) this.copy(last, i);
        continue;
      }
      const i3 = i * 3;
      const dr = Math.exp(-this.drag[i] * dt);
      this.vel[i3] *= dr; this.vel[i3 + 1] = this.vel[i3 + 1] * dr - this.grav[i] * dt; this.vel[i3 + 2] *= dr;
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const t = 1 - this.life[i] / this.max[i];
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      this.col[i3] = this.c0[i3] + (this.c1[i3] - this.c0[i3]) * t;
      this.col[i3 + 1] = this.c0[i3 + 1] + (this.c1[i3 + 1] - this.c0[i3 + 1]) * t;
      this.col[i3 + 2] = this.c0[i3 + 2] + (this.c1[i3 + 2] - this.c0[i3 + 2]) * t;
      this.alpha[i] = this.a0[i] * (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85);
      i++;
    }
    const g = this.geo;
    g.setDrawRange(0, this.n);
    g.attributes.position.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
  }

  copy(from, to) {
    const f3 = from * 3, t3 = to * 3;
    for (let k = 0; k < 3; k++) {
      this.pos[t3 + k] = this.pos[f3 + k]; this.vel[t3 + k] = this.vel[f3 + k];
      this.c0[t3 + k] = this.c0[f3 + k]; this.c1[t3 + k] = this.c1[f3 + k]; this.col[t3 + k] = this.col[f3 + k];
    }
    this.life[to] = this.life[from]; this.max[to] = this.max[from];
    this.s0[to] = this.s0[from]; this.s1[to] = this.s1[from]; this.size[to] = this.size[from];
    this.a0[to] = this.a0[from]; this.alpha[to] = this.alpha[from];
    this.grav[to] = this.grav[from]; this.drag[to] = this.drag[from];
  }
}

const _c0 = new THREE.Color(), _c1 = new THREE.Color();

// Predefinições de cores por elemento
export const ELEMENT_FX = {
  physical: { c: 0xfff0d0, c2: 0xb08a50 },
  fire: { c: 0xffc040, c2: 0xd02010 },
  water: { c: 0x9ae0ff, c2: 0x2a6ad0 },
  light: { c: 0xfff8c0, c2: 0xffc040 },
  earth: { c: 0xc8a070, c2: 0x5a4028 },
  wind: { c: 0xe0fff0, c2: 0x80d0c0 },
  lightning: { c: 0xe0f0ff, c2: 0x6080ff },
  psychic: { c: 0xff90ff, c2: 0x8040ff },
  toon: { c: 0xffe040, c2: 0xff4080 },
  shadow: { c: 0xa060ff, c2: 0x200030 },
  rift: { c: 0xd080ff, c2: 0x5010a0 },
  heal: { c: 0xa0ffb0, c2: 0x30c060 },
  ink: { c: 0x222222, c2: 0x000000 },
};

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.add = new ParticlePool(scene, 4000, THREE.AdditiveBlending, 0.0);
    this.norm = new ParticlePool(scene, 2000, THREE.NormalBlending, 0.3);
    this.items = [];
    this.lights = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 18, 1.8);
      scene.add(l);
      this.lights.push({ light: l, t: 0, dur: 1, peak: 0 });
    }
    this.ringGeo = new THREE.RingGeometry(0.85, 1, 48, 1);
    this.ringGeo.rotateX(-Math.PI / 2);
  }

  setScale(h) {
    // escala dos pontos depende da altura da tela
    this.add.mat.uniforms.uScale.value = h * 0.5;
    this.norm.mat.uniforms.uScale.value = h * 0.5;
  }

  /**
   * Emite partículas.
   * o: { x,y,z, count, color, color2, size, sizeEnd, life, lifeVar, speed, spread (0..1 esfera), dir:{x,y,z}, up,
   *      gravity, drag, alpha, blend:'add'|'normal', radius (área de spawn), ring (spawn em anel) }
   */
  emit(o) {
    const pool = o.blend === 'normal' ? this.norm : this.add;
    const n = o.count ?? 10;
    _c0.set(o.color ?? 0xffffff);
    _c1.set(o.color2 ?? o.color ?? 0xffffff);
    const speed = o.speed ?? 2;
    const spread = o.spread ?? 1;
    const life = o.life ?? 0.8;
    for (let i = 0; i < n; i++) {
      let x = o.x, y = o.y, z = o.z;
      if (o.radius) {
        const a = Math.random() * Math.PI * 2, r = o.ring ? o.radius : Math.sqrt(Math.random()) * o.radius;
        x += Math.cos(a) * r; z += Math.sin(a) * r;
        if (o.radiusY) y += (Math.random() - 0.5) * o.radiusY;
      }
      // direção aleatória
      let dx = Math.random() * 2 - 1, dy = Math.random() * 2 - 1, dz = Math.random() * 2 - 1;
      const l = Math.hypot(dx, dy, dz) || 1;
      dx /= l; dy /= l; dz /= l;
      if (o.dir) {
        dx = o.dir.x * (1 - spread) + dx * spread;
        dy = o.dir.y * (1 - spread) + dy * spread;
        dz = o.dir.z * (1 - spread) + dz * spread;
      }
      if (o.outward && o.radius) { // empurra para fora a partir do centro
        const ox = x - o.x, oz = z - o.z, ol = Math.hypot(ox, oz) || 1;
        dx = ox / ol; dz = oz / ol; dy = o.outwardY ?? 0.2;
      }
      const sp = speed * (0.5 + Math.random() * 0.8);
      const lf = life * (1 - (o.lifeVar ?? 0.3) + Math.random() * (o.lifeVar ?? 0.3) * 2);
      pool.spawn(x, y, z, dx * sp, dy * sp + (o.up ?? 0), dz * sp, lf,
        o.size ?? 0.5, o.sizeEnd ?? (o.size ?? 0.5) * 0.3, _c0, _c1, o.alpha ?? 1, o.gravity ?? 0, o.drag ?? 1.5);
    }
  }

  // Explosões/impactos por elemento
  burst(element, x, y, z, scale = 1) {
    const e = ELEMENT_FX[element] || ELEMENT_FX.physical;
    switch (element) {
      case 'fire':
        this.emit({ x, y, z, count: 40 * scale, color: 0xffe080, color2: 0xff3010, size: 1.0 * scale, sizeEnd: 0.2, life: 0.6, speed: 6 * scale, up: 1, drag: 3 });
        this.emit({ x, y, z, count: 14 * scale, color: 0x5a4a40, color2: 0x2a2420, size: 1.2 * scale, sizeEnd: 2.8 * scale, life: 1.3, speed: 2, up: 2, blend: 'normal', alpha: 0.5, drag: 2 });
        this.emit({ x, y, z, count: 20, color: 0xffd060, color2: 0xff6020, size: 0.18, sizeEnd: 0.05, life: 1.2, speed: 8 * scale, gravity: 9, drag: 0.8 });
        break;
      case 'water':
        this.emit({ x, y, z, count: 36 * scale, color: 0xd0f4ff, color2: 0x3a8ae0, size: 0.45, sizeEnd: 0.15, life: 0.7, speed: 6 * scale, up: 3, gravity: 14, drag: 0.8, blend: 'normal', alpha: 0.85 });
        this.emit({ x, y, z, count: 10, color: 0xffffff, color2: 0x9ad0ff, size: 1.2 * scale, sizeEnd: 2.5 * scale, life: 0.5, speed: 1, alpha: 0.4 });
        break;
      case 'light':
        this.emit({ x, y, z, count: 30 * scale, color: 0xffffff, color2: 0xffc040, size: 0.6, sizeEnd: 0.1, life: 0.7, speed: 7 * scale, drag: 3 });
        this.emit({ x, y, z, count: 4, color: 0xffffe0, color2: 0xffd060, size: 4 * scale, sizeEnd: 0.5, life: 0.3, speed: 0 });
        break;
      case 'earth':
        this.emit({ x, y, z, count: 26 * scale, color: 0x9a7a50, color2: 0x5a4028, size: 0.4, sizeEnd: 0.3, life: 0.9, speed: 7 * scale, up: 4, gravity: 18, drag: 0.5, blend: 'normal' });
        this.emit({ x, y, z, count: 12 * scale, color: 0xb8a080, color2: 0x8a7a60, size: 1.4 * scale, sizeEnd: 3.4 * scale, life: 1.2, speed: 2.5, blend: 'normal', alpha: 0.45, drag: 2 });
        break;
      case 'wind':
        this.emit({ x, y, z, count: 26 * scale, color: 0xf0fff8, color2: 0x80e0c0, size: 0.35, sizeEnd: 0.05, life: 0.6, speed: 9 * scale, drag: 2.5, alpha: 0.8 });
        break;
      case 'lightning':
        this.emit({ x, y, z, count: 30 * scale, color: 0xffffff, color2: 0x6080ff, size: 0.3, sizeEnd: 0.05, life: 0.4, speed: 10 * scale, drag: 3 });
        this.emit({ x, y, z, count: 3, color: 0xe0f0ff, color2: 0x8090ff, size: 5 * scale, sizeEnd: 1, life: 0.2, speed: 0 });
        break;
      case 'psychic':
        this.emit({ x, y, z, count: 30 * scale, color: 0xffb0ff, color2: 0x8040ff, size: 0.5, sizeEnd: 0.1, life: 0.8, speed: 5 * scale, drag: 2.5 });
        this.emit({ x, y, z, count: 3, color: 0xff80ff, color2: 0x6020c0, size: 3 * scale, sizeEnd: 6 * scale, life: 0.4, speed: 0, alpha: 0.5 });
        break;
      case 'toon':
        this.emit({ x, y, z, count: 22 * scale, color: 0xffe040, color2: 0xff60a0, size: 0.7, sizeEnd: 0.3, life: 0.8, speed: 6 * scale, up: 3, gravity: 9, drag: 1 });
        this.emit({ x, y, z, count: 10 * scale, color: 0x60c0ff, color2: 0xffffff, size: 0.5, sizeEnd: 0.2, life: 0.9, speed: 5 * scale, up: 4, gravity: 8, drag: 1 });
        this.emit({ x, y, z, count: 10 * scale, color: 0xf0f0f0, color2: 0xd0d0d0, size: 1.4 * scale, sizeEnd: 2.4 * scale, life: 0.6, speed: 2, blend: 'normal', alpha: 0.8 });
        break;
      case 'shadow':
        this.emit({ x, y, z, count: 28 * scale, color: 0x40104a, color2: 0x050008, size: 1.0, sizeEnd: 1.8, life: 0.9, speed: 3.5 * scale, up: 1, blend: 'normal', alpha: 0.75, drag: 2 });
        this.emit({ x, y, z, count: 16 * scale, color: 0xc080ff, color2: 0x6020a0, size: 0.35, sizeEnd: 0.05, life: 0.7, speed: 5 * scale, drag: 2 });
        break;
      case 'heal':
        this.emit({ x, y, z, count: 26 * scale, color: 0xc0ffd0, color2: 0x40d080, size: 0.4, sizeEnd: 0.05, life: 1.2, speed: 1.5, up: 2.5, radius: 0.8, drag: 1 });
        break;
      case 'rift':
        this.emit({ x, y, z, count: 30 * scale, color: 0xe0a0ff, color2: 0x5010a0, size: 0.6, sizeEnd: 0.1, life: 0.9, speed: 6 * scale, drag: 2 });
        this.emit({ x, y, z, count: 10 * scale, color: 0x2a0a3a, color2: 0x0a0010, size: 1.4, sizeEnd: 2.6, life: 1.0, speed: 2, blend: 'normal', alpha: 0.6 });
        break;
      case 'ink':
        this.emit({ x, y, z, count: 24 * scale, color: 0x1a1a1a, color2: 0x000000, size: 0.5, sizeEnd: 0.3, life: 0.8, speed: 5 * scale, up: 3, gravity: 14, blend: 'normal', alpha: 0.95, drag: 0.8 });
        break;
      default:
        this.emit({ x, y, z, count: 14 * scale, color: e.c, color2: e.c2, size: 0.3, sizeEnd: 0.05, life: 0.4, speed: 6 * scale, drag: 3 });
        this.emit({ x, y, z, count: 2, color: 0xffffff, color2: e.c, size: 1.6 * scale, sizeEnd: 0.4, life: 0.15, speed: 0 });
    }
  }

  // Rastro contínuo (chamado por quadro)
  trail(element, x, y, z, intensity = 1) {
    switch (element) {
      case 'fire': this.emit({ x, y, z, count: 3 * intensity, color: 0xffe080, color2: 0xff3010, size: 0.7, sizeEnd: 0.1, life: 0.35, speed: 0.6, up: 0.5 }); break;
      case 'water': this.emit({ x, y, z, count: 2 * intensity, color: 0xd0f4ff, color2: 0x3a8ae0, size: 0.35, sizeEnd: 0.1, life: 0.4, speed: 0.8, gravity: 6, blend: 'normal', alpha: 0.8 }); break;
      case 'light': this.emit({ x, y, z, count: 2 * intensity, color: 0xffffff, color2: 0xffc040, size: 0.45, sizeEnd: 0.05, life: 0.35, speed: 0.4 }); break;
      case 'earth': this.emit({ x, y, z, count: 1 * intensity, color: 0x9a7a50, color2: 0x5a4028, size: 0.3, sizeEnd: 0.2, life: 0.5, speed: 0.6, gravity: 8, blend: 'normal' }); break;
      case 'wind': this.emit({ x, y, z, count: 2 * intensity, color: 0xe0fff0, color2: 0x80e0c0, size: 0.3, sizeEnd: 0.05, life: 0.3, speed: 1, alpha: 0.7 }); break;
      case 'psychic': this.emit({ x, y, z, count: 2 * intensity, color: 0xffb0ff, color2: 0x8040ff, size: 0.4, sizeEnd: 0.05, life: 0.4, speed: 0.5 }); break;
      case 'toon': this.emit({ x, y, z, count: 1 * intensity, color: 0xffe040, color2: 0xff60a0, size: 0.4, sizeEnd: 0.1, life: 0.5, speed: 0.6 }); break;
      case 'shadow': this.emit({ x, y, z, count: 2 * intensity, color: 0x40104a, color2: 0x050008, size: 0.7, sizeEnd: 1.1, life: 0.5, speed: 0.4, blend: 'normal', alpha: 0.7 }); break;
      case 'rift': this.emit({ x, y, z, count: 2 * intensity, color: 0xe0a0ff, color2: 0x5010a0, size: 0.5, sizeEnd: 0.05, life: 0.4, speed: 0.5 }); break;
      default: this.emit({ x, y, z, count: 1 * intensity, color: 0xffffff, color2: 0x8888ff, size: 0.3, sizeEnd: 0.05, life: 0.3, speed: 0.5 });
    }
  }

  // Luz pontual breve
  flash(x, y, z, color = 0xffaa50, intensity = 30, dur = 0.3, distance = 18) {
    let slot = this.lights.find((l) => l.t <= 0) || this.lights.reduce((a, b) => (a.t < b.t ? a : b));
    slot.light.position.set(x, y, z);
    slot.light.color.set(color);
    slot.light.distance = distance;
    slot.peak = intensity; slot.t = dur; slot.dur = dur;
  }

  // Anel de choque no chão
  ring(x, y, z, color = 0xffffff, radius = 5, dur = 0.5, opacity = 0.8) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(this.ringGeo, mat);
    m.position.set(x, y + 0.15, z);
    this.scene.add(m);
    this.addItem({ obj: m, t: 0, dur, update: (it, k) => { const r = 0.2 + radius * Math.sqrt(k); m.scale.set(r, 1, r); mat.opacity = opacity * (1 - k); } });
  }

  // Objeto genérico com tempo de vida e função de atualização update(it, k, dt)
  addItem(it) {
    it.t = it.t || 0;
    this.items.push(it);
    return it;
  }

  addMesh(mesh, dur, update, onEnd) {
    this.scene.add(mesh);
    return this.addItem({ obj: mesh, t: 0, dur, update, onEnd });
  }

  // Marcador de área no chão (aviso de ataque). shape: 'circle' | 'cone' | 'rect'
  telegraph(o) {
    const { x, z } = o;
    const terrain = G.world.terrain;
    const color = new THREE.Color(o.color ?? 0xff3020);
    let geo;
    if (o.shape === 'rect') {
      const len = o.length, w = o.width;
      const segL = Math.max(2, Math.ceil(len / 2)), segW = 2;
      geo = new THREE.PlaneGeometry(w, len, segW, segL);
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, 0, len / 2);
    } else if (o.shape === 'cone') {
      geo = new THREE.CircleGeometry(o.radius, 24, -o.angle / 2 + Math.PI / 2, o.angle);
      geo.rotateX(-Math.PI / 2);
    } else {
      geo = new THREE.CircleGeometry(o.radius, 36);
      geo.rotateX(-Math.PI / 2);
    }
    // gira e conforma ao terreno
    const yaw = o.yaw || 0;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const pos = geo.attributes.position;
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i), lz = pos.getZ(i);
      const wx = x + lx * cos + lz * sin, wz = z - lx * sin + lz * cos;
      const gy = o.flatY !== undefined ? o.flatY : G.world.collision.groundHeight(wx, wz, (o.y ?? terrain.heightAt(wx, wz)) + 1);
      pos.setXYZ(i, wx, gy + 0.12, wz);
      // uv radial: distância normalizada
      const d = o.shape === 'rect' ? lz / o.length : Math.hypot(lx, lz) / o.radius;
      uvs[i * 2] = d; uvs[i * 2 + 1] = 0;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.computeBoundingSphere();
    const mat = new THREE.ShaderMaterial({
      uniforms: { uFill: { value: 0 }, uColor: { value: color }, uAlpha: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uFill, uAlpha; uniform vec3 uColor; varying vec2 vUv;
        void main(){
          float d = vUv.x;
          float edge = smoothstep(0.9, 0.98, d) * (1.0 - smoothstep(0.98, 1.0, d));
          float fill = step(d, uFill) * 0.35;
          float base = 0.12;
          float a = (edge * 0.9 + fill + base) * uAlpha;
          gl_FragColor = vec4(uColor * 1.4, a);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 3;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    const dur = o.dur ?? 1;
    return this.addItem({
      obj: mesh, t: 0, dur: dur + 0.15,
      update: (it, k) => {
        const kk = clamp(it.t / dur, 0, 1);
        mat.uniforms.uFill.value = kk;
        mat.uniforms.uAlpha.value = it.t > dur ? 1 - (it.t - dur) / 0.15 : 0.6 + 0.4 * Math.sin(it.t * 20) * 0.5 + 0.2;
        if (!it.fired && it.t >= dur) { it.fired = true; o.onDone && o.onDone(); }
      },
      cancel() { this.t = this.dur; this.fired = true; },
    });
  }

  // Feixe entre dois pontos
  beam(from, to, color = 0xffffff, width = 0.3, dur = 0.25, opts = {}) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(width, width, 1, 8, 1, true);
    geo.translate(0, 0.5, 0);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(opts.boost ?? 2), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(from);
    m.lookAt(to);
    m.scale.set(1, 1, len);
    const core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    core.scale.set(0.35, 0.35, 1);
    m.add(core);
    this.addMesh(m, dur, (it, k) => { const w = 1 - k; m.scale.x = m.scale.y = w; mat.opacity = 0.9 * w; core.material.opacity = 0.9 * w; }, () => { geo.dispose(); });
    return m;
  }

  // Relâmpago em zigue-zague
  lightning(from, to, color = 0xb0c8ff, dur = 0.22, width = 0.12) {
    const pts = [from.clone()];
    const segs = 8;
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    for (let i = 1; i < segs; i++) {
      const p = from.clone().addScaledVector(dir, i / segs);
      p.x += (Math.random() - 0.5) * len * 0.12; p.y += (Math.random() - 0.5) * len * 0.08; p.z += (Math.random() - 0.5) * len * 0.12;
      pts.push(p);
    }
    pts.push(to.clone());
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.5), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const l = a.distanceTo(b);
      const s = new THREE.Mesh(new THREE.BoxGeometry(width, width, l), mat);
      s.position.copy(a).add(b).multiplyScalar(0.5);
      s.lookAt(b);
      group.add(s);
    }
    this.addMesh(group, dur, (it, k) => { mat.opacity = 1 - k; }, () => group.traverse((o) => o.geometry && o.geometry.dispose()));
    this.flash(to.x, to.y + 1, to.z, 0xa0b8ff, 60, 0.18, 30);
  }

  update(dt) {
    this.add.update(dt);
    this.norm.update(dt);
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      const k = clamp(it.t / it.dur, 0, 1);
      if (it.update) it.update(it, k, dt);
      if (it.t >= it.dur) {
        if (it.onEnd) it.onEnd(it);
        if (it.obj) {
          it.obj.parent?.remove(it.obj);
          it.obj.traverse?.((o) => { if (o.material && !o.userData.keepMat) { if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose()); else o.material.dispose(); } });
        }
        this.items.splice(i, 1);
      }
    }
    for (const s of this.lights) {
      if (s.t > 0) {
        s.t -= dt;
        s.light.intensity = s.peak * Math.max(0, s.t / s.dur);
      } else s.light.intensity = 0;
    }
  }

  clear() {
    for (const it of this.items) it.obj?.parent?.remove(it.obj);
    this.items.length = 0;
    this.add.n = 0; this.norm.n = 0;
  }
}

// Rastro de espada (fita entre base e ponta)
export class SwordTrail {
  constructor(scene, color = 0xffffff, n = 14) {
    this.n = n;
    this.pts = [];
    const geo = new THREE.BufferGeometry();
    this.posArr = new Float32Array(n * 2 * 3);
    this.alphaArr = new Float32Array(n * 2);
    geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphaArr, 1).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) } },
      vertexShader: `attribute float aAlpha; varying float vA; void main(){ vA = aAlpha; gl_Position = projectionMatrix * viewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ gl_FragColor = vec4(uColor * 1.6, vA * 0.55); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    scene.add(this.mesh);
    this.active = false;
  }
  setColor(c) { this.mat.uniforms.uColor.value.set(c); }
  push(base, tip) {
    this.pts.unshift([base.clone(), tip.clone()]);
    if (this.pts.length > this.n) this.pts.pop();
  }
  update(dt, active) {
    if (!active) { if (this.pts.length) this.pts.pop(); if (this.pts.length) this.pts.pop(); }
    const n = this.n;
    for (let i = 0; i < n; i++) {
      const p = this.pts[Math.min(i, this.pts.length - 1)];
      if (!p) { this.alphaArr[i * 2] = this.alphaArr[i * 2 + 1] = 0; continue; }
      this.posArr.set([p[0].x, p[0].y, p[0].z], i * 6);
      this.posArr.set([p[1].x, p[1].y, p[1].z], i * 6 + 3);
      const a = i < this.pts.length ? 1 - i / n : 0;
      this.alphaArr[i * 2] = 0; this.alphaArr[i * 2 + 1] = a;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.aAlpha.needsUpdate = true;
    this.mesh.visible = this.pts.length > 1;
  }
}
