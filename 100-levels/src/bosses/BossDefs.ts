/**
 * All boss definitions: model, stats, phases and attack pools.
 */
import * as THREE from 'three';
import type { BossDef, Boss, Co } from './Boss';
import { humanoidBoss, mechBoss, orbBoss, birdBoss, serpentBoss } from './BossModels';
import * as A from './Attacks';
import { GroundStrike, ShockRing } from '../entities/Hazards';
import { Audio } from '../audio/AudioManager';
import { rand } from '../core/math';

/** Serpent: dive into the ground, hunt the player from below, erupt. */
function* burrow(b: Boss): Co {
  const s = b.session;
  b.invulnerable = true;
  b.facePlayer = false;
  Audio.play('rumble', { pos: b.pos });
  for (let t = 0; t < 1; t += 0.05) {
    b.data.air = true;
    b.pos.y = b.groundY - t * 5;
    s.particles.emit('debris', b.pos.clone().setY(b.groundY), { count: 2 });
    yield 0.05;
  }
  for (let i = 0; i < 3; i++) {
    const target = b.playerPos.clone().setY(b.groundY);
    s.add(new GroundStrike(target, 3, 0.9, 30 * b.dmgMul, 'rock'));
    b.pos.x = target.x;
    b.pos.z = target.z;
    yield 0.9;
    for (let t = 0; t < 1; t += 0.1) {
      b.pos.y = b.groundY - 5 + t * 8;
      yield 0.03;
    }
    s.particles.emit('debris', target, { count: 30, velSpread: 8 });
    yield 0.3;
    for (let t = 0; t < 1; t += 0.1) {
      b.pos.y = b.groundY + 3 - t * 8;
      yield 0.03;
    }
  }
  b.pos.y = b.groundY;
  b.data.air = false;
  b.invulnerable = false;
  b.facePlayer = true;
  yield* A.exhausted(2.5)(b);
}

/** Storm bird dive: rises, marks the player, dives, then lands exhausted. */
function* dive(b: Boss): Co {
  const s = b.session;
  b.data.air = true;
  for (let t = 0; t < 1; t += 0.05) {
    b.pos.y += 0.4;
    yield 0.03;
  }
  const target = b.playerPos.clone().setY(b.groundY);
  s.fx.telegraph(target, 3.5, 0.9, 0x80c0ff);
  Audio.play('whoosh', { pos: b.pos, pitch: 0.5 });
  yield 0.9;
  const start = b.pos.clone();
  for (let t = 0; t <= 1; t += 0.08) {
    b.pos.lerpVectors(start, target, t);
    yield 0.02;
  }
  s.explode(target, 3.5, 30 * b.dmgMul, 'enemy', 'electric');
  s.add(new ShockRing(target, 16, 10, 15 * b.dmgMul, 0x80c0ff));
  b.data.air = false;
  yield* A.exhausted(2.5)(b);
}

/** Lightning boss converges its orbs into a storm then crashes down. */
function* overload(b: Boss): Co {
  yield* A.strikes('electric', 10, 2.2, 0.9, 0.18, 24)(b);
  yield* A.exhausted(3)(b);
}

export const BOSSES: Record<string, BossDef> = {
  guardian: {
    id: 'guardian', name: 'GUARDIAN', subtitle: 'Facility Sentinel Mk-X', hp: 900, phases: 3, radius: 2.2, height: 6.5, speed: 3.5,
    color: 0x34d4ff, model: (s) => mechBoss(s, 1.4, 0x8090a0, 0x34d4ff), preferredDist: 6, arenaRadius: 22,
    attacks: [
      [A.melee('punch', 28, 5, 0.8), A.sweep(0xff3030, 2.4, 2.4, 22, 0.1)],
      [A.melee('punch', 30, 5, 0.6), A.slam(30, 1), A.sweep(0xff3030, 3, 2.2, 24, 0.1), A.rain(8, 'rock', 22)],
      [A.slam(34, 2), A.shockwaves(3, 0.6), A.strikes('electric', 8, 2.5, 0.9, 0.25), A.sweep(0xff3030, 3.4, 2, 26, 0.1, 2)],
    ],
    rest: [1.6, 1.2, 0.8],
  },
  warrior: {
    id: 'warrior', name: 'THE WARRIOR', subtitle: 'Champion of the Arena', hp: 1300, phases: 3, radius: 1.3, height: 4, speed: 5.5,
    color: 0xff8030, model: (s) => humanoidBoss(s, 'enemy_warrior', 2.2, { weapon: 'wpn_axe' }), preferredDist: 3,
    attacks: [
      [A.combo(3, 20), A.charge(28, 24)],
      [A.combo(3, 22), A.slam(30, 1), A.charge(28, 26, 2), A.summon('grunt', 2)],
      [A.combo(4, 24), A.slam(32, 2), A.pillars(10, 'ring'), A.charge(30, 30, 3)],
    ],
    rest: [1.1, 0.9, 0.6],
    onPhase: (b, p) => {
      if (p === 2) {
        b.enraged = true;
        b.speedMul = 1.25;
        b.session.toast('🔥', 'ENRAGED', 'The Warrior burns with fury!');
      }
    },
    tick: (b) => {
      if (b.enraged && Math.random() < 0.4) b.session.particles.emit('fire', b.center, { count: 1, spread: 1, up: 3 });
    },
  },
  fire: {
    id: 'fire', name: 'INFERNO', subtitle: 'Titan of Living Magma', hp: 1500, phases: 3, radius: 1.8, height: 5.6, speed: 4,
    color: 0xff5010, model: (s) => humanoidBoss(s, 'boss_fire', 2.9, { aura: 'fire', auraColor: 0xffa040 }), preferredDist: 7,
    attacks: [
      [A.fan('orb', 7, 1.2, 15, 16, 0xff6020, 'fire'), A.pillars(6, 'player'), A.melee('slash3', 28, 5)],
      [A.fan('orb', 9, 1.5, 17, 16, 0xff6020, 'fire', 2), A.rain(10, 'meteor'), A.pillars(10, 'ring'), A.slam(30, 1)],
      [A.rain(16, 'meteor', 26), A.pillars(12, 'cross'), A.fan('orb', 11, 2, 19, 18, 0xff4010, 'fire', 3), A.slam(32, 2)],
    ],
    rest: [1.3, 1, 0.7],
  },
  ice: {
    id: 'ice', name: 'GLACIUS', subtitle: 'The Frozen Colossus', hp: 1600, phases: 3, radius: 1.9, height: 5.8, speed: 3.5,
    color: 0x80e0ff, model: (s) => humanoidBoss(s, 'boss_ice', 3, { aura: 'ice', auraColor: 0xe0ffff }), preferredDist: 7,
    attacks: [
      [A.lineStrikes('ice', 9, 22), A.fan('spike', 7, 1, 20, 14, 0xc0f0ff, 'ice'), A.melee('slash1', 28, 5)],
      [A.lineStrikes('ice', 12, 24), A.rain(12, 'ice', 22), A.shockwaves(2, 0.8), A.fan('spike', 9, 1.4, 22, 14, 0xc0f0ff, 'ice', 2)],
      [A.rain(18, 'ice', 24), A.sequence(A.lineStrikes('ice', 12, 24), A.lineStrikes('ice', 12, 24)), A.slam(32, 3), A.tornadoes(2, 8)],
    ],
    rest: [1.3, 1, 0.7],
  },
  lightning: {
    id: 'lightning', name: 'VOLTARA', subtitle: 'Three Orbs of Pure Current', hp: 1500, phases: 3, radius: 2.2, height: 4, speed: 6, hover: 3.5,
    color: 0x90a8ff, model: (s) => orbBoss(s, 0x90a8ff, 1.1, 3, 0xffffff), preferredDist: 9,
    attacks: [
      [A.strikes('electric', 6, 2.4, 1, 0.3), A.fan('bolt', 5, 0.8, 24, 14, 0xa0c0ff, 'electric', 2), overload],
      [A.strikes('electric', 9, 2.4, 0.9, 0.22), A.sweep(0x90a8ff, 3, 2.4, 22, 0.2, 3), A.homing(4, 0x90a8ff, 14, 'electric'), overload],
      [A.strikes('electric', 14, 2.6, 0.8, 0.14), A.sweep(0x90a8ff, 4, 2, 24, 0.2, 3), A.fan('bolt', 12, 6.2, 22, 14, 0xa0c0ff, 'electric', 3), overload],
    ],
    rest: [1.2, 0.9, 0.6],
  },
  shadow: {
    id: 'shadow', name: 'UMBRA', subtitle: 'It Lives Between Shadows', hp: 1500, phases: 3, radius: 1.3, height: 4.4, speed: 6,
    color: 0x9030ff, model: (s) => humanoidBoss(s, 'boss_shadow', 2.4, { weapon: 'wpn_void', aura: 'shadow', auraColor: 0x6020a0 }), preferredDist: 4,
    attacks: [
      [A.sequence(A.teleport(), A.melee('slash1', 26, 4.5, 0.5)), A.homing(4, 0xa040ff, 14), A.strikes('shadow', 5, 2.5, 1, 0.35)],
      [A.sequence(A.teleport(), A.combo(3, 22)), A.summon('clone', 3), A.homing(6, 0xa040ff, 14), A.pillars(8, 'ring', 'shadow')],
      [A.sequence(A.teleport(), A.combo(4, 24), A.teleport()), A.summon('clone', 4), A.strikes('void', 12, 2.5, 0.8, 0.15), A.pillars(12, 'cross', 'shadow')],
    ],
    rest: [1.1, 0.9, 0.6],
    onPhase: (b, p) => {
      b.session.post.darkness = 0.25 + p * 0.2;
    },
  },
  storm: {
    id: 'storm', name: 'TEMPEST', subtitle: 'Winged Fury of the Storm', hp: 1600, phases: 3, radius: 2.4, height: 4, speed: 7, hover: 5,
    color: 0x80c0ff, model: (s) => birdBoss(s, 0x5a6a80, 1.5), preferredDist: 10,
    attacks: [
      [A.fan('feather', 9, 1.4, 20, 14, 0xc0e0ff), dive, A.tornadoes(1, 8)],
      [A.fan('feather', 11, 1.8, 22, 14, 0xc0e0ff, undefined, 2), dive, A.tornadoes(2, 9), A.strikes('electric', 6, 2.4, 1, 0.3)],
      [A.tornadoes(3, 10), A.sequence(dive, dive), A.fan('feather', 15, 3, 24, 15, 0xc0e0ff, undefined, 3), A.strikes('electric', 10, 2.4, 0.9, 0.2)],
    ],
    rest: [1.3, 1, 0.7],
  },
  earth: {
    id: 'earth', name: 'GAIA', subtitle: 'The Mountain Walks', hp: 2000, phases: 3, radius: 2.2, height: 7, speed: 3,
    color: 0x80ff60, model: (s) => humanoidBoss(s, 'boss_earth', 3.6, { aura: 'dust' }), preferredDist: 7,
    attacks: [
      [A.fan('rock', 3, 0.5, 16, 24, 0x806040, 'rock'), A.lineStrikes('rock', 10, 24), A.melee('slash3', 32, 6, 0.9)],
      [A.shockwaves(3, 0.7, 20), A.rain(10, 'rock', 26), A.lineStrikes('rock', 12, 26), A.slam(34, 2)],
      [A.shockwaves(4, 0.55, 22), A.rain(16, 'rock', 26), A.sequence(A.lineStrikes('rock', 12, 26), A.lineStrikes('rock', 12, 26)), A.slam(36, 3), A.summon('brute', 1)],
    ],
    rest: [1.5, 1.1, 0.8],
  },
  serpent: {
    id: 'serpent', name: 'NAGA', subtitle: 'It Swims Through Stone', hp: 1800, phases: 3, radius: 1.6, height: 2.6, speed: 7,
    color: 0x40ff90, model: (s) => serpentBoss(s, 0x2a8a50, 16, 1.4), preferredDist: 8,
    attacks: [
      [burrow, A.fan('orb', 5, 0.8, 14, 14, 0x60ff40), A.charge(26, 22)],
      [burrow, A.fan('orb', 9, 1.6, 16, 14, 0x60ff40, undefined, 2), A.charge(28, 26, 2), A.homing(4, 0x60ff40, 12)],
      [burrow, A.charge(30, 30, 3), A.fan('orb', 13, 3, 18, 15, 0x60ff40, undefined, 3), A.strikes('rock', 8, 2.5, 0.8, 0.2)],
    ],
    rest: [1.2, 0.9, 0.6],
  },
  ancient: {
    id: 'ancient', name: 'ELDER', subtitle: 'Older Than the Levels Themselves', hp: 2100, phases: 3, radius: 1.8, height: 6, speed: 3.5,
    color: 0xffd040, model: (s) => humanoidBoss(s, 'boss_ancient', 3.1, { halo: 0xffe080, aura: 'magic', auraColor: 0xffe080, weapon: 'wpn_staff' }), preferredDist: 8,
    attacks: [
      [A.sweep(0xffd040, 2.6, 2.4, 22, 0.12), A.homing(5, 0xffd040, 14, 'electric'), A.shockwaves(2, 0.8)],
      [A.sweep(0xffd040, 3, 2.2, 24, 0.12, 2), A.rain(10, 'meteor', 24), A.summon('knight', 2), A.strikes('electric', 8, 2.5, 0.9, 0.25)],
      [A.sweep(0xffd040, 4, 2.4, 26, 0.12, 4), A.rain(16, 'meteor', 26), A.shockwaves(4, 0.55), A.summon('knight', 3)],
    ],
    rest: [1.4, 1.1, 0.7],
  },
  demon: {
    id: 'demon', name: 'BAAL', subtitle: 'Champion of Hell', hp: 2300, phases: 3, radius: 1.8, height: 6, speed: 5,
    color: 0xff3010, model: (s) => humanoidBoss(s, 'boss_demon', 3, { wings: 0x3a0808, weapon: 'wpn_flame', aura: 'embers' }), preferredDist: 4,
    attacks: [
      [A.combo(3, 26), A.pillars(8, 'player'), A.charge(30, 26)],
      [A.combo(3, 28), A.pillars(12, 'ring'), A.summon('exploder', 3), A.fan('orb', 9, 1.6, 17, 16, 0xff3010, 'fire', 2)],
      [A.combo(4, 30), A.pillars(16, 'cross'), A.charge(32, 30, 3), A.rain(14, 'meteor', 28), A.slam(34, 2)],
    ],
    rest: [1.1, 0.8, 0.55],
    onPhase: (b, p) => {
      if (p === 2) {
        b.enraged = true;
        b.speedMul = 1.2;
      }
    },
  },
  destroyer: {
    id: 'destroyer', name: 'THE DESTROYER', subtitle: 'The Machine That Ends Worlds', hp: 3000, phases: 4, radius: 2.8, height: 8.5, speed: 3,
    color: 0xff2040, model: (s) => mechBoss(s, 1.9, 0x3a3a48, 0xff2040), preferredDist: 8, arenaRadius: 26,
    attacks: [
      [A.sweep(0xff2040, 2.6, 2.4, 24, 0.1), A.rain(10, 'meteor', 24), A.melee('punch', 34, 6, 0.8)],
      [A.sweep(0xff2040, 3, 2.2, 26, 0.1, 2), A.slam(34, 2), A.rain(14, 'meteor', 26), A.summon('grunt', 3)],
      [A.shockwaves(4, 0.55, 22), A.charge(34, 26, 2), A.strikes('electric', 12, 2.6, 0.8, 0.15), A.sweep(0xff2040, 4, 2.2, 28, 0.1, 3)],
      [A.rain(22, 'meteor', 28), A.sweep(0xff2040, 6.28, 3, 28, 0.1, 4), A.slam(36, 3), A.sequence(A.charge(34, 30, 2), A.shockwaves(3, 0.5, 24))],
    ],
    rest: [1.4, 1.1, 0.8, 0.5],
    onPhase: (b, p) => {
      if (p === 3) {
        b.enraged = true;
        b.session.toast('☢️', 'CORE OVERLOAD', 'The Destroyer is going critical!');
      }
    },
  },
  master: {
    id: 'master', name: 'THE MASTER', subtitle: 'Solve its puzzles to break the shield', hp: 750, phases: 3, radius: 2.2, height: 4, speed: 3, hover: 4,
    color: 0xb48cff, model: (s) => orbBoss(s, 0xb48cff, 1.3, 4, 0xffe066), preferredDist: 12, shielded: true, arenaRadius: 22,
    attacks: [
      [A.homing(3, 0xb48cff, 12), A.strikes('void', 4, 2.4, 1.1, 0.4, 18)],
      [A.homing(4, 0xb48cff, 14), A.strikes('void', 6, 2.4, 1, 0.3, 20), A.sweep(0xb48cff, 2.4, 2.6, 18, 0.2)],
      [A.homing(5, 0xb48cff, 14), A.strikes('void', 8, 2.4, 0.9, 0.25, 20), A.sweep(0xb48cff, 3.2, 2.4, 20, 0.2, 2)],
    ],
    rest: [3, 2.4, 1.8],
  },
  skyduel: {
    id: 'skyduel', name: 'SKY WARDEN', subtitle: 'Keeper of the Floating Isles', hp: 1700, phases: 3, radius: 2.2, height: 4, speed: 6, hover: 4,
    color: 0x40e0ff, model: (s) => orbBoss(s, 0x40e0ff, 1.2, 5, 0x3dffa2), preferredDist: 10, arenaRadius: 26,
    attacks: [
      [A.fan('bolt', 7, 1.2, 18, 15, 0x40e0ff, 'electric', 2), A.strikes('electric', 5, 2.4, 1, 0.3), A.sweep(0x40e0ff, 2.6, 2.2, 22, 0.25)],
      [A.homing(5, 0x40e0ff, 14, 'electric'), A.rain(10, 'meteor', 22), A.sweep(0x40e0ff, 3.2, 2.2, 24, 0.25, 2), overload],
      [A.strikes('electric', 12, 2.4, 0.8, 0.15), A.rain(14, 'meteor', 24), A.fan('bolt', 13, 3, 20, 15, 0x40e0ff, 'electric', 3), overload],
    ],
    rest: [1.2, 1, 0.7],
  },
};

/** Default arena spawn height helper. */
export const bossSpawn = (center: THREE.Vector3, dist = 14) => center.clone().add(new THREE.Vector3(0, 0, dist));
export const randomAngle = () => rand(0, Math.PI * 2);
