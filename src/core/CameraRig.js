// Câmera em terceira pessoa: órbita com mouse, colisão, trava de alvo, tremor e modos cinematográficos.
import * as THREE from 'three';
import { G } from './context.js';
import { input } from './Input.js';
import { clamp, damp, dampAngle, lerp } from './math.js';

const _dir = new THREE.Vector3();
const _p = new THREE.Vector3();
const _q = new THREE.Vector3();

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;            // 0 = olhando para o norte (-Z)
    this.pitch = -0.2;
    this.dist = 6.0;
    this.curDist = 6.0;
    this.shoulder = 0.55;
    this.pivot = new THREE.Vector3();
    this.trauma = 0;
    this.mode = 'follow';     // follow | cinematic | orbit
    this.cine = null;
    this.fovKick = 0;
    this.lookAtCur = new THREE.Vector3();
  }

  forward(out = new THREE.Vector3()) {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }
  flatForward(out = new THREE.Vector3()) { return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  flatRight(out = new THREE.Vector3()) { return out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); }

  shake(amount) { this.trauma = Math.min(1, this.trauma + amount); }

  // Define yaw para olhar na direção do personagem (atrás dele)
  snapBehind(entityYaw) {
    // entityYaw: rotação do modelo (frente = +Z local). Direção do mundo = (sin, cos).
    this.yaw = Math.atan2(-Math.sin(entityYaw), -Math.cos(entityYaw));
  }

  // Ponto de mira (centro da tela)
  getAim(maxDist = 60, filter) {
    const origin = this.camera.position.clone();
    const dir = this.camera.getWorldDirection(new THREE.Vector3());
    let t = maxDist;
    let hitEntity = null;
    const er = G.entities.raycast(origin, dir, maxDist, filter);
    if (er) { t = er.t; hitEntity = er.e; }
    const tt = G.world.terrain.raycast(origin, dir, t);
    if (tt >= 0 && tt < t) { t = tt; hitEntity = null; }
    const ct = G.world.collision.raycast(origin, dir, t, (c) => c.solidToProjectiles && !c.platform);
    if (ct < t) { t = ct; hitEntity = null; }
    return { point: origin.addScaledVector(dir, t), entity: hitEntity, dist: t, dir };
  }

  // Cinemática: posiciona a câmera olhando um alvo (usado em diálogos/cenas)
  setCinematic(pos, look, speed = 3) {
    this.mode = 'cinematic';
    this.cine = { pos: pos.clone(), look: look.clone(), speed };
  }
  release() { this.mode = 'follow'; this.cine = null; }

  update(dt, player) {
    const cam = this.camera;
    if (this.mode === 'cinematic' && this.cine) {
      const k = 1 - Math.exp(-this.cine.speed * dt);
      cam.position.lerp(this.cine.pos, k);
      this.lookAtCur.lerp(this.cine.look, k);
      cam.lookAt(this.lookAtCur);
      this.applyShake(dt);
      return;
    }
    if (this.mode === 'orbit') {
      // órbita lenta (tela de título / criação)
      this.yaw += dt * (this.orbitSpeed ?? 0.08);
      const c = this.orbitCenter || player.pos;
      const d = this.orbitDist ?? 4;
      cam.position.set(c.x + Math.sin(this.yaw) * d, c.y + (this.orbitHeight ?? 1.6), c.z + Math.cos(this.yaw) * d);
      this.lookAtCur.set(c.x, c.y + (this.orbitLookY ?? 1.2), c.z);
      cam.lookAt(this.lookAtCur);
      return;
    }

    // Entrada do mouse
    const m = input.consumeMouse();
    if (G.state === 'play') {
      const sens = 0.0022 * G.settings.sensitivity;
      this.yaw -= m.dx * sens;
      this.pitch -= m.dy * sens * (G.settings.invertY ? -1 : 1);
      if (m.wheel) this.dist = clamp(this.dist + m.wheel * 0.8, 2.5, 13);
      // teclas de seta como alternativa
      if (input.isDown('ArrowLeft')) this.yaw += dt * 2.2;
      if (input.isDown('ArrowRight')) this.yaw -= dt * 2.2;
      if (input.isDown('ArrowUp')) this.pitch += dt * 1.4;
      if (input.isDown('ArrowDown')) this.pitch -= dt * 1.4;
    }
    this.pitch = clamp(this.pitch, -1.15, 0.6);

    // Trava de alvo
    const lock = player.lockTarget;
    if (lock && lock.alive) {
      const c = lock.center;
      const dx = c.x - player.pos.x, dz = c.z - player.pos.z;
      const want = Math.atan2(-dx, -dz);
      this.yaw = dampAngle(this.yaw, want, 7, dt);
      const hd = Math.hypot(dx, dz);
      const wantPitch = clamp(-Math.atan2(2.2 - (c.y - player.pos.y - 1), hd + this.dist) , -0.7, 0.1);
      this.pitch = damp(this.pitch, wantPitch, 4, dt);
    }

    // Pivô suave
    const target = _p.set(player.pos.x, player.pos.y + 1.55, player.pos.z);
    if (this.pivot.lengthSq() === 0) this.pivot.copy(target);
    this.pivot.x = damp(this.pivot.x, target.x, 18, dt);
    this.pivot.z = damp(this.pivot.z, target.z, 18, dt);
    this.pivot.y = damp(this.pivot.y, target.y, 10, dt);

    const f = this.forward(_dir);
    const right = this.flatRight(_q);
    // distância desejada e colisão
    let want = this.dist;
    const origin = this.pivot.clone().addScaledVector(right, this.shoulder * 0.7);
    const back = f.clone().negate();
    const hit = G.world.collision.raycast(origin, back, want + 0.3, (c) => c.camera !== false && !c.platform);
    if (hit < want + 0.3) want = Math.max(1.2, hit - 0.35);
    // terreno entre pivô e câmera
    const tt = G.world.terrain.raycast(origin, back, want);
    if (tt >= 0) want = Math.max(1.0, tt - 0.4);
    this.curDist = want < this.curDist ? want : damp(this.curDist, want, 4, dt);

    const pos = origin.addScaledVector(back, this.curDist);
    const gh = G.world.terrain.heightAt(pos.x, pos.z) + 0.45;
    if (pos.y < gh) pos.y = gh;
    cam.position.copy(pos);
    // olha um pouco à frente do pivô (ombro)
    this.lookAtCur.copy(this.pivot).addScaledVector(right, this.shoulder).addScaledVector(f, 4);
    cam.lookAt(this.lookAtCur);
    // FOV dinâmico (corrida)
    const wantFov = G.settings.fov + this.fovKick;
    cam.fov = damp(cam.fov, wantFov, 5, dt);
    cam.updateProjectionMatrix();
    this.applyShake(dt);
  }

  applyShake(dt) {
    if (this.trauma > 0) {
      const s = this.trauma * this.trauma;
      const t = G.time.now * 40;
      this.camera.position.x += (Math.sin(t * 1.1) + Math.sin(t * 2.3)) * 0.12 * s;
      this.camera.position.y += (Math.sin(t * 1.7) + Math.sin(t * 3.1)) * 0.1 * s;
      this.camera.rotation.z += Math.sin(t * 0.9) * 0.02 * s;
      this.trauma = Math.max(0, this.trauma - dt * 1.6);
    }
  }
}
