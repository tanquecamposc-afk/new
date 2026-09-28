/**
 * WORLD 1 — PARKOUR (levels 1-9). Neon city rooftops at dusk.
 */
import * as THREE from 'three';
import type { Session, LevelLogic } from '../Session';
import { Builder } from '../Builder';
import { Course, SegKind, voidGlow } from './parkourKit';
import { cityBackdrop } from '../Decor';
import { M, glowMat, mat, cachedGeo } from '../../gfx/Materials';
import { BreakableWall } from '../../entities/Pickups';
import { LaunchPad } from '../../entities/Platforms';

const PLANS: Record<string, { segs: [SegKind, number][]; diff: number }> = {
  basics: { segs: [['steps', 3], ['gaps', 3], ['gaps', 4]], diff: 0.05 },
  moving: { segs: [['gaps', 2], ['moving', 2], ['gaps', 2], ['moving', 3]], diff: 0.2 },
  lasers: { segs: [['gaps', 2], ['lasers', 3], ['moving', 1], ['lasers', 4]], diff: 0.3 },
  vanish: { segs: [['vanish', 2], ['moving', 2], ['vanish', 3], ['gaps', 2]], diff: 0.35 },
  speed: { segs: [['speed', 2], ['gaps', 3], ['speed', 2], ['vanish', 1]], diff: 0.4 },
  tower: { segs: [['gaps', 2], ['tower', 2], ['wind', 2], ['gaps', 2]], diff: 0.45 },
  crushers: { segs: [['crushers', 3], ['gaps', 2], ['spikes', 3], ['crushers', 4]], diff: 0.55 },
  spinners: { segs: [['spinners', 2], ['moving', 2], ['spinners', 2], ['wind', 1]], diff: 0.6 },
  gauntlet: { segs: [['gaps', 3], ['lasers', 3], ['vanish', 2], ['spinners', 1], ['crushers', 3], ['speed', 1], ['moving', 2], ['wind', 2]], diff: 0.75 },
};

export interface ParkourOpts {
  diffBoost?: number;
  turns?: boolean;
  onPad?: (c: THREE.Vector3, b: Builder) => void;
  theme?: string;
  music?: string;
  plan?: [SegKind, number][];
  retro?: boolean;
}

export function buildParkour(s: Session, variant: string, opts: ParkourOpts = {}): LevelLogic {
  const b = new Builder(s, s.meta.num * 101 + 7);
  const plan = opts.plan ? { segs: opts.plan, diff: PLANS[variant]?.diff ?? 0.5 } : PLANS[variant] ?? PLANS.basics;
  const diff = Math.min(1, plan.diff + (opts.diffBoost ?? 0) + (s.diff.id === 'normal' ? 0 : s.diff.id === 'hard' ? 0.1 : 0.2));
  const retroMat = opts.retro ? mat('retroBrick', { tex: 'brick', color: 0xc86a30, roughness: 1, flatShading: true }) : null;
  const course = new Course(b, new THREE.Vector3(0, 20, 0), diff, retroMat ?? M.concrete(), opts.retro ? 0xffe066 : 0x34d4ff);
  course.hints = s.meta.num <= 3;
  if (opts.onPad) course.onPad = (c) => opts.onPad!(c, b);

  // Start rooftop
  course.plat(0, 0, 0, 12, 12);
  b.box(new THREE.Vector3(0, 20 - 6, 0), new THREE.Vector3(10, 10, 10), M.darkConcrete(), { collide: false });
  course.advance(6);
  if (s.meta.num === 1) {
    course.hint('WASD to move · Mouse to look · SPACE to jump', -3);
  }
  const midSecret = Math.floor(plan.segs.length / 2);
  plan.segs.forEach(([k, n], i) => {
    if (i > 0) course.pad(6, 7, i % 2 === 0);
    if (s.meta.num === 1 && i === 1) course.hint('Hold SHIFT to sprint · Q = Air Dash in mid-air', 0);
    if (s.meta.num <= 3 && k === 'lasers') course.hint('Jump over low lasers · Crouch (CTRL) under high ones', 0);
    course.seg(k, n);
    if (i === midSecret) placeSecret(s, b, course);
    // occasional 90° turns keep routes interesting
    if ((opts.turns ?? true) && i % 2 === 1 && i < plan.segs.length - 1) {
      course.pad(7, 7);
      course.advance(-3.5);
      course.turn(b.rng.chance(0.5) ? 1 : -1);
      course.advance(3.5);
    }
  });

  // Finish rooftop
  course.advance(3);
  course.plat(0, 0, 6, 12, 12);
  const goal = course.P(0, 0, 7);
  b.goal(goal);
  b.light(goal.clone().setY(goal.y + 3), 0x40ffb0, 25, 16);

  if (!opts.retro) decorateCity(b, course.pos, s);
  else {
    // Classic mode: blue sky, green hills, blocky clouds
    for (let i = 0; i < 30; i++) {
      const p = course.pos.clone().multiplyScalar(0.5).add(new THREE.Vector3(b.rng.range(-120, 120), b.rng.range(30, 60), b.rng.range(-80, 160)));
      b.box(p, new THREE.Vector3(b.rng.range(6, 14), 3, b.rng.range(4, 8)), mat('cloud', { color: 0xffffff, roughness: 1, flatShading: true }), { collide: false, shadow: false });
    }
    for (let i = 0; i < 20; i++) {
      const p = course.pos.clone().multiplyScalar(0.5).add(new THREE.Vector3(b.rng.range(-150, 150), -10, b.rng.range(-60, 200)));
      b.mesh(cachedGeo('hill', () => new THREE.SphereGeometry(1, 8, 6)), mat('hillM', { color: 0x40c040, roughness: 1, flatShading: true }), p, undefined, new THREE.Vector3(b.rng.range(15, 30), b.rng.range(15, 30), b.rng.range(15, 30)), false);
    }
  }
  b.finalize();
  return {
    spawn: new THREE.Vector3(0, 20.05, -3),
    spawnYaw: 0,
    theme: opts.theme ?? 'city',
    music: opts.music ?? 'parkour',
    ambient: ['wind', 'city'],
    objective: 'Reach the exit portal',
    abilityMode: 'airdash',
    combat: false,
    killY: 0,
  };
}

/** Off-route secret: a breakable wall or a hidden launch pad leading to a relic (and sometimes a chest). */
function placeSecret(s: Session, b: Builder, c: Course) {
  const side = b.rng.chance(0.5) ? 1 : -1;
  const base = c.P(side * 7, 0, -2);
  if (s.meta.hasSecret) {
    // Hidden platform to the side, reached by a jump pad behind a cracked wall
    b.plat(base.x, base.y, base.z, 3, 3, M.metal());
    b.add(new BreakableWall(base.clone().setY(base.y + 1.2), new THREE.Vector3(3, 2.4, 0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0), M.brick()));
    b.add(new LaunchPad(base.clone().setY(base.y + 0.06), new THREE.Vector3(), 0, 17, 0xffe066, 1.8));
    const high = base.clone().setY(base.y + 9);
    b.plat(high.x, high.y, high.z, 3.4, 3.4, M.metal());
    b.secret(high.clone().setY(high.y + 1.2));
    b.chest('rare', high.clone().add(new THREE.Vector3(1, 0, 0)));
  } else if (b.rng.chance(0.6)) {
    b.plat(base.x, base.y - 3, base.z, 3, 3, M.metal());
    b.chest('common', base.clone().setY(base.y - 3));
    b.coins.addLine(base.clone().setY(base.y - 2), base.clone().setY(base.y - 2).addScaledVector(c.f, 1), 2);
  }
}

function decorateCity(b: Builder, end: THREE.Vector3, s: Session) {
  const mid = end.clone().multiplyScalar(0.5);
  cityBackdrop(b, mid.clone().setY(0), 90, 260, 90);
  voidGlow(b, mid.clone().setY(-5), 600, 0x3050ff);
  // Neon billboards
  for (let i = 0; i < 6; i++) {
    const a = b.rng.range(0, Math.PI * 2);
    const p = mid.clone().add(new THREE.Vector3(Math.cos(a) * 70, b.rng.range(15, 35), Math.sin(a) * 70));
    const colors = [0xff2d9a, 0x34d4ff, 0xffd23d, 0x3dffa2];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), glowMat(colors[i % 4], 1.6));
    m.position.copy(p);
    m.lookAt(mid.clone().setY(p.y));
    b.deco(m);
  }
  void s;
}
