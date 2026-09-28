/**
 * Combat resolution: melee arcs, lock-on, ranged attacks and weapon abilities.
 */
import * as THREE from 'three';
import type { Session } from '../levels/Session';
import type { Player } from '../player/Player';
import type { Damageable, Element } from '../entities/Entity';
import { WeaponDef } from './Weapons';
import { Audio } from '../audio/AudioManager';
import { itemById } from '../data/items';
import { rand, wrapAngle } from '../core/math';

const ATTACK_FX: Record<string, { color: number; preset: 'fire' | 'ice' | 'electric' }> = {
  fx_atk_fire: { color: 0xff6a1f, preset: 'fire' },
  fx_atk_ice: { color: 0x9be8ff, preset: 'ice' },
  fx_atk_volt: { color: 0xffe93d, preset: 'electric' },
};

function hitFx(s: Session, p: Player, point: THREE.Vector3, heavy: boolean) {
  const fx = p.equip.attack ? ATTACK_FX[p.equip.attack] : null;
  s.particles.emit('hit', point, { count: heavy ? 18 : 10 });
  s.particles.emit('sparks', point, { count: heavy ? 14 : 6 });
  if (fx) s.particles.emit(fx.preset, point, { count: 10 });
  if (p.weapon.element === 'fire') s.particles.emit('fire', point, { count: 12 });
  if (p.weapon.element === 'void') s.particles.emit('shadow', point, { count: 10, color: 0xa040ff });
  if (p.weapon.element === 'electric') s.particles.emit('electric', point, { count: 10 });
}

export const Combat = {
  /** Closest enemy in front of the player within range, for soft lock-on. */
  findLockTarget(s: Session, pos: THREE.Vector3, range: number): Damageable | null {
    let best: Damageable | null = null;
    let bestScore = Infinity;
    const f = s.player.facing;
    const camF = s.rig.forward();
    for (const d of s.damageables) {
      if (!d.alive || d.rangedOnly || d.team !== 'enemy') continue;
      const dx = d.center.x - pos.x, dz = d.center.z - pos.z;
      const dist = Math.hypot(dx, dz) - d.radius;
      if (dist > range) continue;
      if (Math.abs(d.center.y - (pos.y + 1)) > d.halfHeight + 2) continue;
      const nd = new THREE.Vector3(dx, 0, dz).normalize();
      const facingScore = 1 - Math.max(nd.dot(f), nd.dot(camF));
      const score = dist + facingScore * 3 - (d.priority ?? 0);
      if (score < bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  },

  /** Resolve a melee swing arc in front of the player. */
  melee(s: Session, p: Player, w: WeaponDef, mult: number, heavy: boolean, arcOverride?: number, rangeOverride?: number) {
    const range = rangeOverride ?? w.range * (heavy ? 1.15 : 1);
    const arc = arcOverride ?? w.arc;
    const origin = p.pos.clone().setY(p.pos.y + 1);
    const fwd = p.facing;
    let hits = 0;
    for (const d of s.damageables) {
      if (!d.alive || d.rangedOnly) continue;
      const dx = d.center.x - origin.x, dz = d.center.z - origin.z;
      const dist = Math.hypot(dx, dz) - d.radius;
      if (dist > range) continue;
      if (Math.abs(d.center.y - origin.y) > d.halfHeight + 1.4) continue;
      const ang = Math.abs(wrapAngle(Math.atan2(dx, dz) - Math.atan2(fwd.x, fwd.z)));
      if (ang > arc / 2 && dist > 0.6) continue;
      const dir = new THREE.Vector3(dx, 0, dz).normalize();
      const point = d.center.clone().addScaledVector(dir, -d.radius * 0.8);
      d.takeDamage({ amount: w.damage * mult * rand(0.9, 1.1), dir, knockback: w.knockback * (heavy ? 1.8 : 1), source: 'player', heavy, element: w.element, point });
      hitFx(s, p, point, heavy);
      hits++;
    }
    // Slash visual
    const slashColor = p.equip.attack ? ATTACK_FX[p.equip.attack]?.color ?? w.color : w.color;
    s.fx.slash(origin.clone().addScaledVector(fwd, 0.4), p.yaw, range * 0.9, slashColor, heavy ? -0.9 : rand(-0.4, 0.4), heavy ? 0.3 : 0.2);
    if (hits) {
      s.engine.hitStop(heavy ? 0.08 : 0.04);
      s.rig.shake(heavy ? 0.35 : 0.14);
      Audio.play('hit', { pitch: heavy ? 0.7 : 1 });
      p.energy = Math.min(100, p.energy + hits * (heavy ? 10 : 6));
      s.combo(hits);
    }
    return hits;
  },

  /** Area damage around a point (abilities, explosions). */
  area(s: Session, center: THREE.Vector3, radius: number, damage: number, knock: number, element?: Element, heavy = true) {
    let hits = 0;
    for (const d of s.damageables) {
      if (!d.alive || d.rangedOnly) continue;
      const dist = Math.hypot(d.center.x - center.x, d.center.z - center.z) - d.radius;
      if (dist > radius || Math.abs(d.center.y - center.y) > d.halfHeight + 2.5) continue;
      const dir = new THREE.Vector3(d.center.x - center.x, 0, d.center.z - center.z).normalize();
      d.takeDamage({ amount: damage, dir, knockback: knock, source: 'player', heavy, element });
      hits++;
    }
    if (hits) s.combo(hits);
    return hits;
  },

  /** Direction from the player towards what the crosshair points at. */
  aimDirection(s: Session, from: THREE.Vector3): THREE.Vector3 {
    const cam = s.camera;
    const dir = s.rig.aimDir();
    // Find what the camera ray hits, then aim from the weapon towards it
    const hit = s.physics.raycast(cam.position, dir, 200);
    let targetPoint = cam.position.clone().addScaledVector(dir, hit ? hit.dist : 120);
    // Check damageables along the camera ray (so enemies are hit even if level geometry behind)
    let best = hit ? hit.dist : 120;
    for (const d of s.damageables) {
      if (!d.alive) continue;
      const oc = d.center.clone().sub(cam.position);
      const t = oc.dot(dir);
      if (t < 0 || t > best) continue;
      const perp = oc.clone().addScaledVector(dir, -t).length();
      if (perp < d.radius + 0.2) {
        best = t;
        targetPoint = cam.position.clone().addScaledVector(dir, t);
      }
    }
    return targetPoint.sub(from).normalize();
  },

  fireArrow(s: Session, p: Player, power: number, spreadYaw = 0) {
    const from = p.headPos.addScaledVector(p.facing, 0.5);
    from.y -= 0.2;
    const dir = Combat.aimDirection(s, from);
    if (spreadYaw) dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), spreadYaw);
    const speed = 30 + power * 40;
    s.projectiles.spawn({
      kind: 'arrow', pos: from, vel: dir.multiplyScalar(speed), team: 'player',
      damage: p.weapon.damage * (0.6 + power * 1.2), gravity: -9, radius: 0.18, color: 0xffe0a0, knockback: 3 + power * 4, trail: power > 0.8 ? 'magic' : undefined,
    });
    s.registerShot();
    Audio.play('arrow');
  },

  castBolt(s: Session, p: Player, charged: boolean) {
    const tip = p.getWeaponTip(new THREE.Vector3());
    const dir = Combat.aimDirection(s, tip);
    const target = charged ? null : Combat.findLockTarget(s, p.pos, 20);
    s.projectiles.spawn({
      kind: charged ? 'orb' : 'bolt', pos: tip, vel: dir.multiplyScalar(charged ? 20 : 32), team: 'player',
      damage: p.weapon.damage * (charged ? 2 : 1), radius: charged ? 0.4 : 0.25, color: 0x7ab0ff, element: 'electric',
      homing: target ? 3 : 0, target: target ? () => (target.alive ? target.center : null) : undefined,
      explode: charged ? { radius: 3.5, damage: p.weapon.damage * 1.5 } : undefined, trail: 'electric',
    });
    s.registerShot();
    s.fx.flash(tip, 0x7ab0ff, 12, 0.15);
    Audio.play('zap');
  },

  throwStone(s: Session, p: Player) {
    const from = p.headPos.addScaledVector(p.facing, 0.4);
    const dir = s.rig.aimDir().clone();
    dir.y = Math.max(dir.y, -0.1) + 0.35;
    dir.normalize();
    s.projectiles.spawn({
      kind: 'stone', pos: from, vel: dir.multiplyScalar(16), team: 'player', damage: 0, gravity: -20, radius: 0.1,
      onImpact: (pos) => {
        Audio.play('break', { pos, vol: 0.6 });
        s.particles.emit('dust', pos, { count: 8 });
        s.fx.shockwave(pos, 6, 0xffe066, 0.8);
        s.emitNoise(pos, 14, true);
      },
    });
    Audio.play('whoosh');
  },

  ability(s: Session, p: Player) {
    const w = p.weapon;
    s.rig.zoomOffset = -1.2;
    s.after(0.7, () => (s.rig.zoomOffset = 0));
    switch (w.ability.id) {
      case 'whirlwind':
        p.anim.play('spin', 1, () => {
          Combat.area(s, p.pos.clone().setY(p.pos.y + 1), 3.3, w.damage * 0.9, 6, w.element);
          s.fx.shockwave(p.pos, 3.4, w.color, 0.3);
          Audio.play('swing');
        });
        s.particles.emit('magic', p.center, { count: 30, color: w.color });
        break;
      case 'iaido': {
        const f = p.facing;
        const start = p.pos.clone();
        p.impulse(new THREE.Vector3(f.x * 26, 1.5, f.z * 26));
        p.anim.play('thrust', 1.2);
        p.invuln = 0.5;
        s.after(0.2, () => {
          // Damage everything along the dash path
          const end = p.pos.clone();
          for (const d of s.damageables) {
            if (!d.alive || d.rangedOnly) continue;
            const seg = new THREE.Line3(start.clone().setY(d.center.y), end.clone().setY(d.center.y));
            const cp = seg.closestPointToPoint(d.center, true, new THREE.Vector3());
            if (cp.distanceTo(d.center) < d.radius + 1.4) {
              d.takeDamage({ amount: w.damage * 3, dir: f.clone(), knockback: 6, source: 'player', heavy: true });
              s.particles.emit('hit', d.center, { count: 20 });
            }
          }
          s.fx.slash(end.clone().setY(end.y + 1), p.yaw, 3, 0xff4d6d, 0, 0.35);
          s.rig.shake(0.3);
          Audio.play('heavy');
        });
        s.particles.line('magic', start.clone().setY(start.y + 1), start.clone().addScaledVector(f, 5).setY(start.y + 1), 20, { color: 0xff4d6d });
        Audio.play('whoosh');
        break;
      }
      case 'earthsplitter':
        p.anim.play('slam', 1, () => {
          const c = p.pos.clone().addScaledVector(p.facing, 1);
          Combat.area(s, c.clone().setY(c.y + 1), 6, w.damage * 1.6, 12, w.element);
          s.fx.shockwave(c, 7, 0xffa050, 0.6);
          s.fx.shockwave(c, 4, 0xffffff, 0.4);
          s.particles.emit('debris', c, { count: 40, velSpread: 8 });
          s.particles.emit('dust', c, { count: 30, velSpread: 6 });
          s.rig.shake(0.6);
          s.engine.hitStop(0.1);
          Audio.play('slam');
        });
        break;
      case 'flurry':
        p.anim.play('flurry', 1, () => {
          Combat.melee(s, p, w, 1.1, false, 2.2, 2.6);
        });
        break;
      case 'volley':
        for (let i = -2; i <= 2; i++) Combat.fireArrow(s, p, 0.8, i * 0.09);
        p.anim.play('bowRelease', 1.2);
        break;
      case 'chain': {
        // Chain lightning between up to 6 enemies
        let from = p.getWeaponTip(new THREE.Vector3());
        const hit = new Set<Damageable>();
        let cur: Damageable | null = Combat.findLockTarget(s, p.pos, 16);
        p.anim.play('cast', 1.4);
        for (let i = 0; i < 6 && cur; i++) {
          hit.add(cur);
          s.particles.line('electric', from, cur.center, 18, { velSpread: 1.5 });
          cur.takeDamage({ amount: w.damage * 1.8, dir: cur.center.clone().sub(from).setY(0).normalize(), knockback: 3, source: 'player', element: 'electric' });
          s.fx.flash(cur.center, 0x80a0ff, 20, 0.2);
          from = cur.center.clone();
          let next: Damageable | null = null;
          let nd = 9;
          for (const d of s.damageables) {
            if (!d.alive || hit.has(d) || d.rangedOnly) continue;
            const dd = d.center.distanceTo(from);
            if (dd < nd) {
              nd = dd;
              next = d;
            }
          }
          cur = next;
        }
        Audio.play('thunder', { vol: 0.6 });
        s.rig.shake(0.25);
        break;
      }
      case 'inferno':
        p.anim.play('spin', 1.2, (i) => {
          if (i === 0) {
            Combat.area(s, p.center, 5, w.damage * 2, 8, 'fire');
            for (let k = 0; k < 16; k++) {
              const a = (k / 16) * Math.PI * 2;
              s.particles.emit('fire', p.pos.clone().add(new THREE.Vector3(Math.cos(a) * 3, 0.3, Math.sin(a) * 3)), { count: 8, up: 4 });
            }
            s.fx.shockwave(p.pos, 5, 0xff6a1f, 0.5);
            s.fx.flash(p.center, 0xff6020, 40, 0.5);
            Audio.play('fire');
          }
        });
        break;
      case 'rift': {
        const c = p.pos.clone().addScaledVector(p.facing, 4).setY(p.pos.y + 1);
        let n = 0;
        const tick = () => {
          n++;
          if (s.disposed || n > 10) return;
          s.after(0.15, tick);
          s.particles.emit('shadow', c, { count: 20, color: 0xa040ff, velSpread: 3 });
          for (const d of s.damageables) {
            if (!d.alive || d.rangedOnly) continue;
            const dd = d.center.distanceTo(c);
            if (dd < 6) d.takeDamage({ amount: w.damage * 0.35, dir: c.clone().sub(d.center).setY(0).normalize(), knockback: 2.5, source: 'player', element: 'void' });
          }
          if (n === 10) {
            Combat.area(s, c, 5, w.damage * 1.5, 10, 'void');
            s.fx.shockwave(c, 5, 0xb14dff, 0.5);
            Audio.play('explosion', { vol: 0.5 });
          }
        };
        s.after(0.15, tick);
        p.anim.play('cast', 1.2);
        Audio.play('magic', { pitch: 0.5 });
        break;
      }
    }
    Audio.play('powerup', { vol: 0.5 });
  },
};

/** Look up an attack effect colour for UI. */
export const attackFxColor = (id: string | null) => (id ? itemById(id)?.color : undefined);
