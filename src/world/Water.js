// Superfícies de água (lago e rio) com shader animado e névoa.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { WORLD, LOC } from './WorldMap.js';

const vert = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const frag = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform vec3 uSunDir, uSunColor, uDeep, uSky;
  varying vec3 vWorldPos;
  void main() {
    vec2 p = vWorldPos.xz;
    float t = uTime;
    float dx = cos(p.x * 0.45 + t * 1.3) * 0.12 + cos((p.x + p.y) * 0.9 - t * 1.7) * 0.07 + cos(p.x * 2.1 + t * 2.3) * 0.03;
    float dz = cos(p.y * 0.5 + t * 1.1) * 0.12 + cos((p.y - p.x) * 1.1 + t * 1.5) * 0.07 + cos(p.y * 2.4 - t * 2.0) * 0.03;
    vec3 N = normalize(vec3(dx, 1.0, dz));
    vec3 V = normalize(cameraPosition - vWorldPos);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 col = mix(uDeep, uSky, 0.25 + fres * 0.55);
    vec3 H = normalize(uSunDir + V);
    float spec = pow(max(dot(N, H), 0.0), 140.0);
    col += uSunColor * spec * 1.6;
    float sparkle = step(0.985, fract(sin(dot(floor(p * 3.0), vec2(12.9898, 78.233)) + floor(t * 4.0)) * 43758.5453));
    col += uSunColor * sparkle * 0.25 * max(uSunDir.y, 0.0);
    gl_FragColor = vec4(col, 0.8 + fres * 0.18);
    #include <fog_fragment>
  }
`;

export function createWater(scene, terrain) {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color(1, 1, 1) },
      uDeep: { value: new THREE.Color(0x1d4a5c) },
      uSky: { value: new THREE.Color(0x9cc4e0) },
    },
  ]);
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag, transparent: true, fog: true, depthWrite: false });

  const group = new THREE.Group();
  // Lago
  const lakeGeo = new THREE.CircleGeometry(LOC.lake.r + 22, 56);
  lakeGeo.rotateX(-Math.PI / 2);
  const lake = new THREE.Mesh(lakeGeo, mat);
  lake.position.set(LOC.lake.x, WORLD.waterLevel, LOC.lake.z);
  lake.renderOrder = 2;
  group.add(lake);

  // Rio (fita)
  const R = terrain.river;
  const pos = [];
  const idx = [];
  for (let i = 0; i < R.pts.length; i++) {
    const [x, z] = R.pts[i];
    const j0 = Math.max(0, i - 1), j1 = Math.min(R.pts.length - 1, i + 1);
    let tx = R.pts[j1][0] - R.pts[j0][0], tz = R.pts[j1][1] - R.pts[j0][1];
    const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    const nx = -tz, nz = tx;
    const w = R.w[i] + 2.2;
    const y = R.surface[i];
    pos.push(x + nx * w, y, z + nz * w, x - nx * w, y, z - nz * w);
    if (i > 0) {
      const a = (i - 1) * 2, b = a + 1, c = i * 2, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  rg.setIndex(idx);
  rg.computeVertexNormals();
  rg.computeBoundingSphere();
  const river = new THREE.Mesh(rg, mat);
  river.renderOrder = 2;
  group.add(river);
  scene.add(group);

  return {
    group,
    material: mat,
    update(dt) {
      uniforms.uTime.value = G.time.now;
      const sky = G.sky;
      if (sky) {
        uniforms.uSunDir.value.copy(sky._lightDir || sky.sunDir);
        uniforms.uSunColor.value.copy(sky.sun.color).multiplyScalar(Math.min(1, sky.sun.intensity / 2));
        uniforms.uSky.value.copy(sky.uniforms.uHorizon.value).lerp(sky.uniforms.uTop.value, 0.4);
        uniforms.uDeep.value.setHex(0x1d4a5c).multiplyScalar(0.35 + 0.65 * (1 - sky.night * 0.7));
      }
    },
  };
}
