// Céu procedural, ciclo dia/noite, luzes globais, névoa e o rasgo da Fenda no horizonte norte.
import * as THREE from 'three';
import { G, DAY_LENGTH_SECONDS } from '../core/context.js';
import { lerp, clamp, smoothstep } from '../core/math.js';

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
    gl_Position.z = gl_Position.w; // sempre no fundo
  }
`;

const skyFrag = /* glsl */ `
  uniform vec3 uTop, uHorizon, uBottom, uSunDir, uSunColor, uMoonDir, uCloudColor, uRiftTint;
  uniform float uTime, uNight, uRift, uCloudCover;
  varying vec3 vDir;

  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55));
    col = mix(col, uBottom, smoothstep(0.0, -0.25, h));

    // Tingimento violeta em direção à Fenda (norte = -Z)
    float north = smoothstep(0.2, 1.0, -d.z) * (1.0 - smoothstep(0.0, 0.6, h));
    col = mix(col, uRiftTint, north * 0.35 * (0.4 + uRift));
    col = mix(col, uRiftTint * 0.8, uRift * 0.45);

    // Estrelas
    if (uNight > 0.01 && h > 0.0) {
      vec3 p = floor(d * 380.0);
      float s = hash(p);
      float tw = 0.6 + 0.4 * sin(uTime * 3.0 + s * 50.0);
      col += vec3(0.9, 0.92, 1.0) * step(0.9975, s) * uNight * tw * smoothstep(0.0, 0.25, h);
    }

    // Sol
    float sd = max(dot(d, uSunDir), 0.0);
    col += uSunColor * (pow(sd, 1400.0) * 8.0 + pow(sd, 18.0) * 0.28 + pow(sd, 3.0) * 0.06);
    // Lua
    float md = dot(d, uMoonDir);
    col = mix(col, vec3(0.92, 0.94, 1.0), smoothstep(0.99955, 0.9997, md) * uNight);
    col += vec3(0.4, 0.45, 0.6) * pow(max(md, 0.0), 60.0) * 0.25 * uNight;

    // Nuvens
    if (h > 0.0) {
      vec2 uv = d.xz / (h + 0.12) * 1.4 + vec2(uTime * 0.008, uTime * 0.003);
      float c = fbm(uv);
      c = smoothstep(1.0 - uCloudCover, 1.05 - uCloudCover * 0.5, c);
      float lit = 0.75 + 0.25 * pow(sd, 4.0);
      col = mix(col, uCloudColor * lit, c * smoothstep(0.0, 0.18, h) * 0.85);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

// Rasgo da Fenda (billboard cilíndrico)
const tearFrag = /* glsl */ `
  uniform float uTime, uIntensity;
  varying vec2 vUv;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  float noise(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }
  void main() {
    float y = vUv.y;
    float off = (noise(y * 9.0 + 3.0) - 0.5) * 0.18 + (noise(y * 27.0 + uTime * 0.4) - 0.5) * 0.06 + (noise(y * 61.0) - 0.5) * 0.02;
    float width = 0.012 + 0.05 * sin(y * 3.14159) * (0.8 + 0.2 * sin(uTime * 2.0 + y * 10.0));
    float dx = abs(vUv.x - 0.5 - off);
    float core = smoothstep(width, 0.0, dx);
    float glow = exp(-dx * 9.0) * 0.55 + exp(-dx * 30.0) * 0.6;
    float vfade = smoothstep(0.0, 0.18, y) * smoothstep(1.0, 0.75, y);
    vec3 col = vec3(0.5, 0.16, 0.95) * glow + vec3(0.85, 0.6, 1.0) * core * 0.9;
    float flick = 0.85 + 0.15 * sin(uTime * 7.0 + y * 20.0);
    gl_FragColor = vec4(col * vfade * flick * uIntensity, 1.0);
  }
`;

const beamFrag = /* glsl */ `
  uniform float uTime, uIntensity;
  varying vec2 vUv;
  void main() {
    float edge = sin(vUv.x * 3.14159);
    float a = pow(edge, 2.0) * pow(1.0 - vUv.y, 1.5) * 0.45;
    a *= 0.75 + 0.25 * sin(vUv.y * 30.0 - uTime * 6.0);
    vec3 col = mix(vec3(0.42, 0.1, 0.8), vec3(0.8, 0.5, 1.0), pow(edge, 8.0));
    gl_FragColor = vec4(col * a * uIntensity, 1.0);
  }
`;

const simpleVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

// Quadros-chave do dia: hora -> parâmetros
const KEYS = [
  { h: 0, top: 0x060a1c, hor: 0x1a2240, sun: 0x000000, fog: 0x141a30, hemiS: 0x31406e, hemiG: 0x14121a, hemiI: 0.55, dirI: 0.0, cloud: 0x1c2238, exp: 1.0 },
  { h: 4.8, top: 0x0a1028, hor: 0x2a2a48, sun: 0x000000, fog: 0x1c2038, hemiS: 0x34406a, hemiG: 0x16141c, hemiI: 0.55, dirI: 0.0, cloud: 0x262840, exp: 1.0 },
  { h: 6.2, top: 0x3a5a8c, hor: 0xf0a070, sun: 0xffb070, fog: 0xc89880, hemiS: 0x9ab0d0, hemiG: 0x5a4434, hemiI: 0.75, dirI: 1.4, cloud: 0xf4b8a0, exp: 1.05 },
  { h: 8.5, top: 0x4f86c6, hor: 0xbcd4e8, sun: 0xfff0d8, fog: 0xb8cce0, hemiS: 0xbcd8f4, hemiG: 0x6a5a40, hemiI: 0.72, dirI: 2.2, cloud: 0xffffff, exp: 1.05 },
  { h: 12, top: 0x3f7cc4, hor: 0xb4d0ea, sun: 0xffffff, fog: 0xb0c8e0, hemiS: 0xc4dcf6, hemiG: 0x6e5e44, hemiI: 0.75, dirI: 2.4, cloud: 0xffffff, exp: 1.0 },
  { h: 16, top: 0x4878b8, hor: 0xc8d4e0, sun: 0xfff2d6, fog: 0xbcc8d8, hemiS: 0xc0d4ec, hemiG: 0x6a5a40, hemiI: 0.72, dirI: 2.2, cloud: 0xfff6ee, exp: 1.0 },
  { h: 18.3, top: 0x3a4c84, hor: 0xf09060, sun: 0xff9050, fog: 0xc88a70, hemiS: 0x9a9ec4, hemiG: 0x5a3c2c, hemiI: 0.75, dirI: 1.5, cloud: 0xf8a080, exp: 1.08 },
  { h: 19.6, top: 0x1a2048, hor: 0x5a3c58, sun: 0x803040, fog: 0x3a3048, hemiS: 0x4a4a78, hemiG: 0x221a22, hemiI: 0.6, dirI: 0.25, cloud: 0x6a4a60, exp: 1.0 },
  { h: 21, top: 0x080c22, hor: 0x1c2244, sun: 0x000000, fog: 0x161c34, hemiS: 0x32406e, hemiG: 0x14121a, hemiI: 0.55, dirI: 0.0, cloud: 0x1c2238, exp: 1.0 },
  { h: 24, top: 0x060a1c, hor: 0x1a2240, sun: 0x000000, fog: 0x141a30, hemiS: 0x31406e, hemiG: 0x14121a, hemiI: 0.55, dirI: 0.0, cloud: 0x1c2238, exp: 1.0 },
];

const _ca = new THREE.Color(), _cb = new THREE.Color();
function lerpHex(a, b, t, out) { _ca.setHex(a); _cb.setHex(b); return out.copy(_ca).lerp(_cb, t); }

export class Sky {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.uniforms = {
      uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uBottom: { value: new THREE.Color(0x2a2a30) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: new THREE.Color() }, uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
      uCloudColor: { value: new THREE.Color() }, uRiftTint: { value: new THREE.Color(0x6a2a9a) },
      uTime: { value: 0 }, uNight: { value: 0 }, uRift: { value: 0 }, uCloudCover: { value: 0.45 },
    };
    const skyMat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    // Luzes
    this.hemi = new THREE.HemisphereLight(0xbcd8f4, 0x6a5a40, 0.9);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55; sc.near = 1; sc.far = 320;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.6;
    scene.add(this.sun);
    scene.add(this.sun.target);

    scene.fog = new THREE.Fog(0xb0c8e0, 80, 480);

    // Rasgo da Fenda
    this.tearUniforms = { uTime: { value: 0 }, uIntensity: { value: 1 } };
    const tearMat = new THREE.ShaderMaterial({ uniforms: this.tearUniforms, vertexShader: simpleVert, fragmentShader: tearFrag, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.tear = new THREE.Mesh(new THREE.PlaneGeometry(130, 260), tearMat);
    this.tear.position.set(0, 120, -335);
    this.tear.renderOrder = -5;
    scene.add(this.tear);
    const beamMat = new THREE.ShaderMaterial({ uniforms: this.tearUniforms, vertexShader: simpleVert, fragmentShader: beamFrag, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const beamGeo = new THREE.CylinderGeometry(5, 12, 140, 16, 1, true);
    beamGeo.translate(0, 70, 0);
    // Inverte UV v para que a base seja brilhante
    const uv = beamGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    this.beam = new THREE.Mesh(beamGeo, beamMat);
    this.beam.position.set(0, 2, -305);
    scene.add(this.beam);

    this.sunDir = new THREE.Vector3();
    this.night = 0;
    this.riftAmount = 0;
    this.fogBase = { near: 80, far: 480 };
  }

  setViewDistance(far) { this.fogBase.far = far; this.fogBase.near = Math.min(60, far * 0.2); }

  update(dt, focus) {
    const t = G.time;
    if (G.state === 'play' || G.state === 'title') {
      t.hours += (24 / DAY_LENGTH_SECONDS) * dt * t.timeScale;
      if (t.hours >= 24) { t.hours -= 24; t.day++; }
    }
    const hours = t.hours;
    // Interpolação de quadros-chave
    let k0 = KEYS[0], k1 = KEYS[1];
    for (let i = 0; i < KEYS.length - 1; i++) {
      if (hours >= KEYS[i].h && hours <= KEYS[i + 1].h) { k0 = KEYS[i]; k1 = KEYS[i + 1]; break; }
    }
    const f = smoothstep(0, 1, (hours - k0.h) / (k1.h - k0.h));
    const u = this.uniforms;
    lerpHex(k0.top, k1.top, f, u.uTop.value);
    lerpHex(k0.hor, k1.hor, f, u.uHorizon.value);
    lerpHex(k0.sun, k1.sun, f, u.uSunColor.value);
    lerpHex(k0.cloud, k1.cloud, f, u.uCloudColor.value);
    u.uBottom.value.copy(u.uHorizon.value).multiplyScalar(0.35);
    lerpHex(k0.hemiS, k1.hemiS, f, this.hemi.color);
    lerpHex(k0.hemiG, k1.hemiG, f, this.hemi.groundColor);
    this.hemi.intensity = lerp(k0.hemiI, k1.hemiI, f);

    // Direção do sol: nasce a leste (+X) às 6h, põe-se a oeste às 18h
    const a = ((hours - 6) / 12) * Math.PI;
    this.sunDir.set(Math.cos(a), Math.sin(a), 0.45).normalize();
    u.uSunDir.value.copy(this.sunDir);
    u.uMoonDir.value.set(-this.sunDir.x, -this.sunDir.y, 0.3).normalize();
    const day = smoothstep(-0.08, 0.12, this.sunDir.y);
    this.night = 1 - smoothstep(-0.2, 0.05, this.sunDir.y);
    u.uNight.value = this.night;
    u.uTime.value = G.time.now;

    // Luz direcional: sol de dia, lua à noite
    const dirI = lerp(k0.dirI, k1.dirI, f);
    if (day > 0.02) {
      this.sun.color.copy(u.uSunColor.value).lerp(new THREE.Color(1, 1, 1), 0.3);
      this.sun.intensity = dirI;
      this._lightDir = this.sunDir;
    } else {
      this.sun.color.setHex(0x8ea4d8);
      this.sun.intensity = 0.45;
      this._lightDir = u.uMoonDir.value;
    }

    // Proximidade da Fenda
    const fx = focus ? focus.x : 0, fz = focus ? focus.z : 0;
    const dRift = Math.hypot(fx - 0, fz + 300);
    this.riftAmount = clamp(1 - (dRift - 60) / 140, 0, 1);
    u.uRift.value = this.riftAmount;
    if (this.riftAmount > 0) {
      const ra = this.riftAmount;
      this.hemi.color.lerp(new THREE.Color(0x8a5ac0), ra * 0.6);
      this.hemi.groundColor.lerp(new THREE.Color(0x301040), ra * 0.6);
      this.sun.color.lerp(new THREE.Color(0xc080ff), ra * 0.5);
    }

    // Névoa
    const fog = this.scene.fog;
    lerpHex(k0.fog, k1.fog, f, fog.color);
    if (this.riftAmount > 0) fog.color.lerp(new THREE.Color(0x3a1850), this.riftAmount * 0.75);
    const night = this.night;
    fog.near = this.fogBase.near * (1 - night * 0.4);
    fog.far = this.fogBase.far * (1 - night * 0.35) * (1 - this.riftAmount * 0.35);
    G.engine.renderer.toneMappingExposure = lerp(k0.exp, k1.exp, f) + night * 0.15;

    // Sombra segue o foco (com encaixe em texels para evitar tremulação)
    if (focus) {
      const ld = this._lightDir;
      const cam = this.sun.shadow.camera;
      const texel = (cam.right - cam.left) / this.sun.shadow.mapSize.x;
      const tx = Math.round(focus.x / texel) * texel, tz = Math.round(focus.z / texel) * texel;
      this.sun.target.position.set(tx, focus.y, tz);
      this.sun.position.set(tx + ld.x * 150, focus.y + Math.max(0.15, ld.y) * 150, tz + ld.z * 150);
      this.sun.target.updateMatrixWorld();
    }

    // Domo acompanha a câmera
    this.dome.position.copy(this.camera.position);
    // Rasgo sempre de frente para a câmera
    this.tearUniforms.uTime.value = G.time.now;
    this.tear.lookAt(this.camera.position.x, this.tear.position.y, this.camera.position.z);
    this.tearUniforms.uIntensity.value = G.story?.flags?.riftSealed ? 0 : 1;
    this.beam.visible = this.tear.visible = !(G.story?.flags?.riftSealed);
  }

  isNight() { return this.night > 0.5; }
}
