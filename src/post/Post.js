// Pós-processamento: bloom, filtro final (vinheta, dano, mundo toon, distorção psíquica, fade).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.2 },
    uDamage: { value: 0 },
    uToon: { value: 0 },
    uPsychic: { value: 0 },
    uShadow: { value: 0 },
    uRift: { value: 0 },
    uFade: { value: 0 },
    uFadeColor: { value: new THREE.Color(0, 0, 0) },
    uLowHp: { value: 0 },
    uSaturation: { value: 1.12 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uDamage, uToon, uPsychic, uShadow, uRift, uFade, uLowHp, uSaturation;
    uniform vec2 uResolution;
    uniform vec3 uFadeColor;
    varying vec2 vUv;

    float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r = length(c);

      // Distorção psíquica: ondas radiais + aberração cromática.
      if (uPsychic > 0.001) {
        float w = sin(r * 40.0 - uTime * 8.0) * 0.004 * uPsychic;
        uv += normalize(c + 1e-5) * w;
      }
      // Distorção da Fenda (sutil, ondulante).
      if (uRift > 0.001) {
        uv.x += sin(uv.y * 18.0 + uTime * 1.3) * 0.0018 * uRift;
        uv.y += cos(uv.x * 14.0 + uTime * 1.1) * 0.0015 * uRift;
      }

      vec3 col;
      float ab = 0.0025 * uPsychic + 0.0012 * uDamage + 0.0008 * uRift;
      if (ab > 0.0001) {
        col.r = texture2D(tDiffuse, uv + c * ab).r;
        col.g = texture2D(tDiffuse, uv).g;
        col.b = texture2D(tDiffuse, uv - c * ab).b;
      } else {
        col = texture2D(tDiffuse, uv).rgb;
      }

      // Mundo Toon: posterização + contornos por Sobel na luminância.
      if (uToon > 0.001) {
        vec2 px = 1.0 / uResolution;
        float tl = luma(texture2D(tDiffuse, uv + px * vec2(-1.0, 1.0)).rgb);
        float t  = luma(texture2D(tDiffuse, uv + px * vec2(0.0, 1.0)).rgb);
        float tr = luma(texture2D(tDiffuse, uv + px * vec2(1.0, 1.0)).rgb);
        float l  = luma(texture2D(tDiffuse, uv + px * vec2(-1.0, 0.0)).rgb);
        float rr = luma(texture2D(tDiffuse, uv + px * vec2(1.0, 0.0)).rgb);
        float bl = luma(texture2D(tDiffuse, uv + px * vec2(-1.0, -1.0)).rgb);
        float b  = luma(texture2D(tDiffuse, uv + px * vec2(0.0, -1.0)).rgb);
        float br = luma(texture2D(tDiffuse, uv + px * vec2(1.0, -1.0)).rgb);
        float gx = -tl - 2.0 * l - bl + tr + 2.0 * rr + br;
        float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
        float edge = smoothstep(0.12, 0.32, sqrt(gx * gx + gy * gy));
        vec3 poster = floor(col * 5.0 + 0.5) / 5.0;
        poster = mix(vec3(luma(poster)), poster, 1.45);
        vec3 toon = mix(poster, vec3(0.03, 0.02, 0.05), edge);
        col = mix(col, toon, uToon);
      }

      // Saturação
      float L = luma(col);
      col = mix(vec3(L), col, uSaturation - 0.6 * uShadow);
      // Sombra: tons frios e escuros
      col = mix(col, col * vec3(0.7, 0.6, 0.95), uShadow * 0.6);

      // Vinheta
      float vig = smoothstep(0.85, 0.2, r * (1.0 + uVignette));
      col *= mix(1.0, vig, 0.85);

      // Dano / vida baixa: bordas vermelhas pulsantes
      float edgeMask = smoothstep(0.25, 0.75, r);
      float pulse = 0.5 + 0.5 * sin(uTime * 5.0);
      col = mix(col, vec3(0.6, 0.02, 0.02), edgeMask * (uDamage * 0.7 + uLowHp * 0.35 * pulse));

      // Fade
      col = mix(col, uFadeColor, uFade);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class PostFX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    const size = renderer.getSize(new THREE.Vector2());
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.42, 0.45, 0.9);
    this.composer.addPass(this.bloom);
    this.output = new OutputPass();
    this.composer.addPass(this.output);
    this.final = new ShaderPass(FinalShader);
    this.composer.addPass(this.final);
    this.u = this.final.uniforms;
    // Valores-alvo animados suavemente.
    this.target = { toon: 0, psychic: 0, shadow: 0, rift: 0 };
    this.damage = 0;
  }

  setSize(w, h, pr) {
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.u.uResolution.value.set(w * pr, h * pr);
  }

  setBloom(enabled) { this.bloom.enabled = enabled; }

  flashDamage(amount = 1) { this.damage = Math.min(1, this.damage + amount); }

  update(dt, time) {
    const u = this.u;
    u.uTime.value = time;
    this.damage = Math.max(0, this.damage - dt * 2.2);
    u.uDamage.value = this.damage;
    const k = 1 - Math.exp(-dt * 4);
    u.uToon.value += (this.target.toon - u.uToon.value) * k;
    u.uPsychic.value += (this.target.psychic - u.uPsychic.value) * k;
    u.uShadow.value += (this.target.shadow - u.uShadow.value) * k;
    u.uRift.value += (this.target.rift - u.uRift.value) * k;
  }

  render() { this.composer.render(); }
}
