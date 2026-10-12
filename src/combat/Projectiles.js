// Projéteis: bolas de fogo, lanças d'água, flechas, orbes sombrios etc.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { isHostile } from '../entities/Entities.js';

const sharedGeo = {
  sphere: new THREE.IcosahedronGeometry(0.3, 1),
  arrow: (() => { const g = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4); g.rotateX(Math.PI / 2); return g; })(),
  lance: (() => { const g = new THREE.ConeGeometry(0.16, 1.1, 6); g.rotateX(Math.PI / 2); return g; })(),
  blade: (() => { const g = new THREE.TorusGeometry(0.55, 0.06, 4, 12, Math.PI); g.rotateX(Math.PI / 2); return g; })(),
  pie: (() => { const g = new THREE.CylinderGeometry(0.3, 0.25, 0.15, 10); return g; })(),
};

const matCache = {};
function glowMat(color, boost = 2) {
  const k = color + '_' + boost;
  if (!matCache[k]) matCache[k] = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(boost) });
  return matCache[k];
}

export class Projectiles {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
  }

  /**
   * o: { pos, dir, speed, team, element, damage (info), radius, life, visual:'sphere'|'arrow'|'lance'|'blade'|'pie', color,
   *      size, pierce, gravity, homing (entity), explode:{radius, info}, onHit(entity|null, pos), trail: element, source }
   */
  spawn(o) {
    const p = {
      pos: o.pos.clone(),
      vel: o.dir.clone().normalize().multiplyScalar(o.speed ?? 20),
      team: o.team || 'player',
      element: o.element || 'physical',
      damage: o.damage,
      radius: o.radius ?? 0.45,
      life: o.life ?? 2.5,
      pierce: o.pierce ?? 0,
      gravity: o.gravity ?? 0,
      homing: o.homing || null,
      homingRate: o.homingRate ?? 3,
      explode: o.explode || null,
      onHit: o.onHit || null,
      trail: o.trail ?? o.element,
      hit: new Set(),
      source: o.source,
      spin: o.spin || 0,
      t: 0,
    };
    const vis = o.visual || 'sphere';
    const mesh = new THREE.Mesh(sharedGeo[vis] || sharedGeo.sphere, o.material || glowMat(o.color ?? 0xffffff, vis === 'arrow' ? 1 : 2.2));
    mesh.scale.setScalar(o.size ?? 1);
    mesh.position.copy(p.pos);
    mesh.userData.keepMat = true;
    this.scene.add(mesh);
    p.mesh = mesh;
    this.list.push(p);
    return p;
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      p.life -= dt;
      if (p.homing && p.homing.alive) {
        const want = p.homing.center.clone().sub(p.pos).normalize().multiplyScalar(p.vel.length());
        p.vel.lerp(want, Math.min(1, p.homingRate * dt));
      }
      p.vel.y -= p.gravity * dt;
      const step = p.vel.clone().multiplyScalar(dt);
      const len = step.length();
      const nSub = Math.max(1, Math.ceil(len / 0.5));
      let done = false;
      for (let s = 0; s < nSub && !done; s++) {
        p.pos.addScaledVector(step, 1 / nSub);
        // entidades
        for (const e of G.entities.list) {
          if (!e.alive || e.removed || !e.targetable || p.hit.has(e)) continue;
          if (!isHostile(p.team, e.team)) continue;
          const c = e.center;
          const r = p.radius + Math.max(e.radius, e.height * 0.35);
          if (c.distanceToSquared(p.pos) < r * r) {
            p.hit.add(e);
            this.hitEntity(p, e);
            if (p.pierce-- <= 0) { done = true; break; }
          }
        }
        if (done) break;
        // mundo
        const g = G.world.terrain.heightAt(p.pos.x, p.pos.z);
        if (p.pos.y < g + 0.05 || G.world.collision.pointSolid(p.pos.x, p.pos.y, p.pos.z, (c) => c.solidToProjectiles && !(c.tag === 'barrier' && p.team === 'enemy'))) {
          this.impact(p, null);
          done = true;
        }
      }
      if (!done && p.life <= 0) { if (p.explode) this.impact(p, null); done = true; }
      if (done) { this.removeAt(i); continue; }
      // visual
      p.mesh.position.copy(p.pos);
      if (p.vel.lengthSq() > 0.01) p.mesh.lookAt(p.pos.x + p.vel.x, p.pos.y + p.vel.y, p.pos.z + p.vel.z);
      if (p.spin) p.mesh.rotateZ(p.spin * p.t);
      if (p.trail) G.fx.trail(p.trail, p.pos.x, p.pos.y, p.pos.z, 1);
    }
  }

  hitEntity(p, e) {
    if (p.damage) {
      const info = { ...p.damage, source: p.source, dir: { x: p.vel.x, z: p.vel.z } };
      G.combat.applyDamage(e, info);
    }
    if (p.onHit) p.onHit(e, p.pos);
    if (p.explode) this.impact(p, e);
    else G.fx.burst(p.element, p.pos.x, p.pos.y, p.pos.z, 0.5);
  }

  impact(p, directHit) {
    const pos = p.pos;
    if (p.explode) {
      const ex = p.explode;
      G.combat.areaDamage(pos.x, pos.y, pos.z, ex.radius, p.team, { ...ex.info, source: p.source, falloff: true }, (e) => e !== directHit);
      G.fx.burst(p.element, pos.x, pos.y, pos.z, ex.fxScale ?? 1.2);
      G.fx.flash(pos.x, pos.y + 0.5, pos.z, ex.light ?? 0xff8040, 40, 0.35, ex.radius * 4);
      G.fx.ring(pos.x, G.world.terrain.heightAt(pos.x, pos.z), pos.z, ex.ringColor ?? 0xffa050, ex.radius, 0.4);
      G.cameraRig.shake(Math.max(0, 0.35 - G.player.pos.distanceTo(pos) * 0.01));
      G.audio?.play(ex.sound || 'explosion', { pos });
      ex.onExplode?.(pos);
    } else {
      G.fx.burst(p.element, pos.x, pos.y, pos.z, 0.5);
      if (p.onHit && !directHit) p.onHit(null, pos);
    }
  }

  removeAt(i) {
    const p = this.list[i];
    p.mesh.parent?.remove(p.mesh);
    this.list.splice(i, 1);
  }

  clear() {
    for (let i = this.list.length - 1; i >= 0; i--) this.removeAt(i);
  }
}
