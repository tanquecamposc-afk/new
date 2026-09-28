/**
 * Reusable boss attack patterns as coroutines. Every attack is telegraphed
 * (animation wind-up, ground decals, charge sounds) so it can be read & dodged.
 */
import * as THREE from 'three';
import type { Boss, Co } from './Boss';
import { GroundStrike, ShockRing, SweepBeam, Meteor, Tornado, FirePillar } from '../entities/Hazards';
import { Enemy, EnemyKind } from '../enemies/Enemy';
import { ProjKind } from '../combat/Projectiles';
import { Audio } from '../audio/AudioManager';
import { rand, wrapAngle } from '../core/math';

type Elem = 'fire' | 'ice' | 'electric' | 'shadow' | 'rock' | 'void';

const elemColor: Record<Elem, number> = { fire: 0xff6020, ice: 0x80d8ff, electric: 0x90a8ff, shadow: 0x9030ff, rock: 0xc09060, void: 0xb14dff };

/** Walk/fly to a point. */
export function* moveTo(b: Boss, p: THREE.Vector3, speed: number): Co {
  b.moveTarget = p.clone();
  b.moveSpeed = speed;
  yield () => !b.moveTarget;
}

/** Close distance to the player. */
export function* approach(b: Boss, stopDist: number, speed = b.def.speed, maxTime = 3): Co {
  let t = 0;
  while (b.distToPlayer() > stopDist && t < maxTime) {
    const dir = b.playerPos.clone().sub(b.pos).setY(0).normalize();
    b.moveTarget = b.pos.clone().addScaledVector(dir, 1.5);
    b.moveSpeed = speed;
    t += 0.1;
    yield 0.1;
  }
  b.moveTarget = null;
}

/** Heavy melee swing in front with a telegraph arc. */
export function melee(action = 'slash1', dmg = 30, range = 5, windup = 0.6): (b: Boss) => Co {
  return function* (b) {
    yield* approach(b, range * 0.8 + b.radius * 0.5);
    b.facePlayer = true;
    b.model.action?.('windup');
    const f = b.forward;
    b.session.fx.telegraphLine(b.pos.clone().addScaledVector(f, b.radius * 0.3), b.yaw, range + b.radius * 0.5, range * 0.9, windup, 0xff3020);
    Audio.play('charge', { pos: b.pos });
    yield windup;
    b.facePlayer = false;
    b.model.action?.(action);
    b.model.action?.('punch');
    yield 0.18;
    const s = b.session;
    const p = b.playerPos;
    const d = b.distToPlayer();
    const ang = Math.abs(wrapAngle(Math.atan2(p.x - b.pos.x, p.z - b.pos.z) - b.yaw));
    if (d < range + b.radius * 0.5 && ang < 1.0) s.player.damage(dmg * b.dmgMul, b.pos, 12);
    s.fx.slash(b.center.clone().addScaledVector(b.forward, b.radius * 0.6), b.yaw, range + 1, b.def.color, 0, 0.3);
    s.rig.shake(0.25);
    Audio.play('heavy', { pos: b.pos, pitch: 0.6 });
    yield 0.5;
    b.facePlayer = true;
  };
}

/** Combo of several quick melee swings. */
export function combo(n = 3, dmg = 20): (b: Boss) => Co {
  const acts = ['slash1', 'slash2', 'slash3', 'thrust'];
  return function* (b) {
    for (let i = 0; i < n; i++) yield* melee(acts[i % acts.length], dmg, 4.5, i === 0 ? 0.55 : 0.35)(b);
  };
}

/** Leap to the player and slam, releasing shock rings (jump over them). */
export function slam(dmg = 30, rings = 1, ringDmg = 20): (b: Boss) => Co {
  return function* (b) {
    const s = b.session;
    const target = b.playerPos.clone().setY(b.groundY);
    s.fx.telegraph(target, 4, 1.0, 0xff3020);
    b.model.action?.('slam');
    Audio.play('whoosh', { pos: b.pos });
    const start = b.pos.clone();
    const dur = 0.9;
    let t = 0;
    b.data.air = true;
    while (t < dur) {
      t += 0.03;
      const k = Math.min(1, t / dur);
      b.pos.x = start.x + (target.x - start.x) * k;
      b.pos.z = start.z + (target.z - start.z) * k;
      b.pos.y = b.groundY + b.hoverY * (1 - k) + Math.sin(k * Math.PI) * 7;
      yield 0.03;
    }
    b.data.air = false;
    b.pos.y = b.groundY;
    s.explode(target.clone().setY(b.groundY + 0.3), 4, dmg * b.dmgMul, 'enemy', 'fire');
    for (let i = 0; i < rings; i++) {
      s.add(new ShockRing(target.clone().setY(b.groundY + 0.05), b.arenaRadius * 1.2, 11, ringDmg * b.dmgMul, b.def.color));
      if (i < rings - 1) yield 0.45;
    }
    Audio.play('slam', { pos: b.pos });
    s.rig.shake(0.6);
    yield 0.8;
  };
}

/** Radial shockwaves from the boss. */
export function shockwaves(n = 3, gap = 0.7, dmg = 18): (b: Boss) => Co {
  return function* (b) {
    const s = b.session;
    b.model.action?.('roar');
    Audio.play('charge', { pos: b.pos });
    yield 0.6;
    for (let i = 0; i < n; i++) {
      b.model.action?.('slam');
      s.add(new ShockRing(b.pos.clone().setY(b.groundY + 0.05), b.arenaRadius * 1.3, 10 + i, dmg * b.dmgMul, b.def.color));
      s.rig.shake(0.25);
      Audio.play('slam', { pos: b.pos, vol: 0.7 });
      yield gap;
    }
    yield 0.4;
  };
}

/** Projectile fan aimed at the player. */
export function fan(kind: ProjKind, count = 7, spread = 1.2, speed = 16, dmg = 15, color = 0xff6020, element?: Elem, volleys = 1): (b: Boss) => Co {
  return function* (b) {
    const s = b.session;
    for (let v = 0; v < volleys; v++) {
      b.model.action?.('cast');
      b.model.action?.('punch');
      yield 0.35;
      const from = b.model.anchor?.('mouth') ?? b.center.clone();
      const base = Math.atan2(b.playerPos.x - from.x, b.playerPos.z - from.z) + (v % 2 ? spread / count / 2 : 0);
      const dy = (b.player.center.y - from.y) / Math.max(4, b.distToPlayer());
      for (let i = 0; i < count; i++) {
        const a = base + (count === 1 ? 0 : (i / (count - 1) - 0.5) * spread);
        const dir = new THREE.Vector3(Math.sin(a), dy, Math.cos(a)).normalize();
        s.projectiles.spawn({ kind, pos: from.clone(), vel: dir.multiplyScalar(speed), team: 'enemy', damage: dmg * b.dmgMul, color, element: element === 'rock' ? undefined : element === 'void' ? 'void' : element, radius: 0.35, life: 4, ghost: true });
      }
      Audio.play(element === 'ice' ? 'ice' : element === 'electric' ? 'zap' : 'fire', { pos: from });
      yield 0.45;
    }
    yield 0.4;
  };
}

/** Homing orbs. */
export function homing(n = 4, color = 0xa040ff, dmg = 15, element: Elem = 'shadow'): (b: Boss) => Co {
  return function* (b) {
    const s = b.session;
    b.model.action?.('cast');
    for (let i = 0; i < n; i++) {
      const from = b.center.clone().add(new THREE.Vector3(rand(-1, 1) * b.radius, b.halfHeight * 0.6, rand(-1, 1) * b.radius));
      const dir = new THREE.Vector3(rand(-1, 1), 1, rand(-1, 1)).normalize();
      s.projectiles.spawn({ kind: 'orb', pos: from, vel: dir.multiplyScalar(7), team: 'enemy', damage: dmg * b.dmgMul, color, homing: 1.4, target: () => s.player.center, life: 6, element: element === 'rock' ? undefined : element === 'void' ? 'void' : element, radius: 0.4 });
      Audio.play('magic', { pos: from, pitch: 0.6 });
      yield 0.25;
    }
    yield 0.8;
  };
}

/** Telegraphed strikes on/around the player's position. */
export function strikes(elem: Elem, n = 5, radius = 2.5, delay = 1, gap = 0.35, dmg = 25, lead = true): (b: Boss) => Co {
  return function* (b) {
    const s = b.session;
    b.model.action?.('cast');
    b.model.action?.('roar');
    for (let i = 0; i < n; i++) {
      const p = b.playerPos.clone().addScaledVector(lead ? b.player.vel : new THREE.Vector3(), 0.5);
      if (i > 0) p.add(new THREE.Vector3(rand(-3, 3), 0, rand(-3, 3)));
      p.y = b.groundY;
      s.add(new GroundStrike(p, radius, delay, dmg * b.dmgMul, elem));
      yield gap;
    }
    yield delay;
  };
}

/** Strikes that travel in a line from the boss to the player. */
export function lineStrikes(elem: Elem, n = 8, dmg = 22): (b: Boss) => Co {
  return function* (b) {
    const s = b.session;
    b.model.action?.('slam');
    yield 0.4;
    const dir = b.playerPos.clone().sub(b.pos).setY(0).normalize();
    for (let i = 1; i <= n; i++) {
      const p = b.pos.clone().addScaledVector(dir, i * 2.4).setY(b.groundY);
      s.add(new GroundStrike(p, 1.6, 0.5, dmg * b.dmgMul, elem));
      yield 0.08;
    }
    yield 0.8;
  };
}

/** Meteor / hail rain across the arena. */
export function rain(n = 10, kind: 'meteor' | 'rock' | 'ice' = 'meteor', dmg = 25): (b: Boss) => Co {
  return function* (b) {
    const s = b.session;
    b.model.action?.('roar');
    Audio.play('rumble');
    yield 0.5;
    for (let i = 0; i < n; i++) {
      const onPlayer = i % 3 === 0;
      const a = rand(0, Math.PI * 2), r = rand(0, b.arenaRadius * 0.9);
      const p = onPlayer ? b.playerPos.clone() : b.arenaCenter.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      p.y = b.groundY;
      s.add(new Meteor(p, 1.3, kind === 'meteor' ? 3 : 2.4, dmg * b.dmgMul, kind));
      yield 0.18;
    }
    yield 1.4;
  };
}

/** Sweeping laser / breath beam. */
export function sweep(color: number, arc = 2.2, dur = 2.2, dmg = 25, pitch = 0.12, beams = 1): (b: Boss) => Co {
  return function* (b) {
    const s = b.session;
    b.facePlayer = false;
    b.model.action?.('roar');
    const start = b.yawToPlayer() - arc / 2;
    for (let i = 0; i < beams; i++) {
      const off = (i / beams) * Math.PI * 2;
      s.add(new SweepBeam(() => b.model.anchor?.('eye') ?? b.center, start + off, arc, dur, 40, dmg * b.dmgMul, color, pitch, 0.7));
    }
    let t = 0;
    while (t < dur + 0.7) {
      t += 0.05;
      b.yaw = start + arc * Math.max(0, (t - 0.7) / dur);
      yield 0.05;
    }
    b.facePlayer = true;
    yield 0.4;
  };
}

/** Telegraphed charge across the arena. */
export function charge(dmg = 30, speed = 26, n = 1): (b: Boss) => Co {
  return function* (b) {
    const s = b.session;
    for (let k = 0; k < n; k++) {
      b.facePlayer = true;
      const yaw = b.yawToPlayer();
      s.fx.telegraphLine(b.pos, yaw, 30, b.radius * 2, 0.8, 0xff2020);
      b.model.action?.('roar');
      Audio.play('charge', { pos: b.pos });
      yield 0.8;
      b.facePlayer = false;
      b.yaw = yaw;
      const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      let t = 0;
      let hit = false;
      Audio.play('whoosh', { pos: b.pos });
      while (t < 1.2) {
        t += 0.03;
        b.pos.addScaledVector(dir, speed * 0.03);
        s.particles.emit('dust', b.pos, { count: 3, spread: b.radius });
        if (!hit && b.distToPlayer() < b.radius + 1) {
          hit = s.player.damage(dmg * b.dmgMul, b.pos, 18);
        }
        const off = b.pos.clone().sub(b.arenaCenter).setY(0);
        if (off.length() > b.arenaRadius - b.radius - 0.5) break;
        yield 0.03;
      }
      s.rig.shake(0.3);
      Audio.play('slam', { pos: b.pos, vol: 0.6 });
      yield 0.5;
    }
    b.facePlayer = true;
  };
}

/** Pillars of fire / shadow in a ring or around the player. */
export function pillars(n = 8, mode: 'ring' | 'player' | 'cross' = 'ring', color: 'fire' | 'shadow' = 'fire', dmg = 20): (b: Boss) => Co {
  return function* (b) {
    const s = b.session;
    b.model.action?.('slam');
    yield 0.3;
    for (let i = 0; i < n; i++) {
      let p: THREE.Vector3;
      if (mode === 'ring') {
        const a = (i / n) * Math.PI * 2;
        const r = b.distToPlayer();
        p = b.pos.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      } else if (mode === 'cross') {
        const a = (Math.floor(i / (n / 4)) * Math.PI) / 2 + s.clock * 0;
        const r = (i % (n / 4) + 1) * 3;
        p = b.pos.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      } else p = b.playerPos.clone().add(new THREE.Vector3(rand(-2, 2), 0, rand(-2, 2)));
      p.y = b.groundY;
      s.add(new FirePillar(p, 0.9, 1.4, 1.5, dmg * b.dmgMul, color));
      if (mode === 'player') yield 0.3;
    }
    yield 1.6;
  };
}

export function tornadoes(n = 2, life = 9): (b: Boss) => Co {
  return function* (b) {
    const s = b.session;
    b.model.action?.('roar');
    Audio.play('whoosh', { pos: b.pos, pitch: 0.5 });
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      s.add(new Tornado(b.arenaCenter.clone().add(new THREE.Vector3(Math.cos(a) * 10, 0, Math.sin(a) * 10)).setY(b.groundY), life, 3.2, b.arenaRadius - 2));
      yield 0.4;
    }
    yield 1;
  };
}

export function summon(kind: EnemyKind, n = 2): (b: Boss) => Co {
  return function* (b) {
    const s = b.session;
    b.model.action?.('roar');
    Audio.play('roar', { pos: b.pos, pitch: 1.3, vol: 0.5 });
    const alive = s.damageables.filter((d) => d instanceof Enemy && d.alive).length;
    const count = Math.max(0, Math.min(n, 5 - alive));
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const p = b.pos.clone().add(new THREE.Vector3(Math.cos(a) * (b.radius + 3), 0, Math.sin(a) * (b.radius + 3))).setY(b.groundY + 0.1);
      s.particles.emit('magic', p.clone().setY(p.y + 1), { count: 30, color: b.def.color });
      s.fx.shockwave(p, 2, b.def.color, 0.4);
      const e = new Enemy(kind, p, 0, 0.7);
      e.aware = true;
      s.add(e);
      yield 0.3;
    }
    yield 0.8;
  };
}

/** Vanish and reappear near the player. */
export function teleport(behind = true): (b: Boss) => Co {
  return function* (b) {
    const s = b.session;
    s.particles.emit('shadow', b.center, { count: 50, color: b.def.color, velSpread: 3 });
    Audio.play('magic', { pos: b.pos, pitch: 0.4 });
    b.model.root.visible = false;
    b.invulnerable = true;
    yield 0.7;
    const f = b.player.facing;
    const p = b.playerPos.clone().addScaledVector(f, behind ? -(b.radius + 3) : b.radius + 5);
    const off = p.clone().sub(b.arenaCenter).setY(0);
    if (off.length() > b.arenaRadius - b.radius - 1) off.setLength(b.arenaRadius - b.radius - 1);
    b.pos.set(b.arenaCenter.x + off.x, b.pos.y, b.arenaCenter.z + off.z);
    b.model.root.visible = true;
    b.invulnerable = false;
    s.particles.emit('shadow', b.center, { count: 50, color: b.def.color, velSpread: 3 });
    yield 0.25;
  };
}

/** Exposed window: the boss drops down / kneels and takes bonus damage. */
export function exhausted(dur = 3): (b: Boss) => Co {
  return function* (b) {
    b.vulnerable = true;
    b.model.action?.('hit');
    b.session.toast('💥', 'OPENING', 'The boss is vulnerable — attack now!');
    Audio.play('powerup', { pos: b.pos });
    yield dur;
    b.vulnerable = false;
  };
}

export function sequence(...fns: ((b: Boss) => Co)[]): (b: Boss) => Co {
  return function* (b) {
    for (const f of fns) yield* f(b);
  };
}

export { elemColor };
