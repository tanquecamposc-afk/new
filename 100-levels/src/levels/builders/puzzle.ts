/**
 * WORLD 2 — PUZZLE (levels 11-19): a futuristic temple of chambers. Each
 * chamber holds a puzzle whose solution opens the next gate.
 */
import * as THREE from 'three';
import type { Session, LevelLogic } from '../Session';
import { Builder } from '../Builder';
import { M, glowMat, mat } from '../../gfx/Materials';
import { buildRoom } from './combat';
import { Door, PushCrate, MovingPlatform } from '../../entities/Platforms';
import { Switch, PressurePlate, Trigger } from '../../entities/Pickups';
import { GlyphTablet, CodePanel, MemoryTiles, InvisiblePlatform, Mirror, LightBeam, Lamp } from '../../entities/Puzzle';
import { ForceZone, SpinBeam, Laser } from '../../entities/Hazards';
import { columns } from '../Decor';
import { Audio } from '../../audio/AudioManager';

export type PuzzleKind = 'lever' | 'lights' | 'crates' | 'code' | 'memory' | 'invisible' | 'gravity' | 'timed' | 'mirrors' | 'bridge';

const PLANS: Record<string, PuzzleKind[]> = {
  switches: ['lever', 'lights', 'bridge'],
  crates: ['crates', 'bridge', 'crates'],
  code: ['lever', 'code'],
  memory: ['memory', 'memory'],
  invisible: ['invisible', 'invisible'],
  gravity: ['gravity', 'gravity'],
  timed: ['timed', 'timed', 'timed'],
  mirrors: ['mirrors', 'mirrors'],
  mixed: ['crates', 'memory', 'mirrors', 'code', 'invisible'],
};

export interface PuzzleCtx {
  s: Session;
  b: Builder;
  c: THREE.Vector3;
  size: number;
  done: () => void;
  timeScale: number;
}

export const templeMats = () => ({
  wall: mat('templeWall', { tex: 'hex', color: 0x8a80a8, roughness: 0.4, metalness: 0.4, emissive: 0x8060ff, emissiveIntensity: 0.7, emissiveMap: true }),
  floor: mat('templeFloor', { tex: 'marble', color: 0x8a84a4, roughness: 0.5, metalness: 0.05 }),
});

/** Build one puzzle inside a chamber centred at c. */
export function buildPuzzle(kind: PuzzleKind, x: PuzzleCtx) {
  const { s, b, c, size, done } = x;
  const half = size / 2;
  const P = (dx: number, dy: number, dz: number) => c.clone().add(new THREE.Vector3(dx, dy, dz));
  switch (kind) {
    case 'lever':
      b.add(new Switch(P(0, 0, 4), (on) => on && done(), false, 'Pull lever', Math.PI));
      break;
    case 'lights': {
      const lamps = [-4, 0, 4].map((dx) => b.add(new Lamp(P(dx, 0, half - 3))));
      const pattern = [[0, 1], [1], [1, 2]];
      let solved = false;
      [-5, 0, 5].forEach((dx, i) =>
        b.add(new Switch(P(dx, 0, -2), () => {
          if (solved) return;
          pattern[i].forEach((k) => lamps[k].toggle());
          if (lamps.every((l) => l.on)) {
            solved = true;
            done();
          }
        }, true, 'Toggle lever', Math.PI)),
      );
      s.toast('💡', 'LIGHTS', 'Light all three lamps. Each lever toggles different lamps.');
      break;
    }
    case 'crates': {
      const n = 2;
      let pressed = 0;
      let opened = false;
      for (let i = 0; i < n; i++) {
        b.add(new PressurePlate(P(-5 + i * 10, 0.02, 5), (p) => {
          pressed += p ? 1 : -1;
          if (pressed >= n && !opened) {
            opened = true;
            done();
          }
        }, true));
        b.add(new PushCrate(P(-4 + i * 7, 0, -3 + i * 2), mat('crate', { tex: 'metal', color: 0x9a90c0, roughness: 0.4, metalness: 0.6 })));
      }
      s.toast('📦', 'PRESSURE PLATES', 'Walk into the crates to push them onto the plates.');
      break;
    }
    case 'bridge': {
      // Lever starts a shuttle platform across the void; the gate lever waits on the far side
      let started = false;
      b.add(new Switch(P(-4, 0, -6), (on) => {
        if (!on || started) return;
        started = true;
        b.add(new MovingPlatform([P(0, -0.3, -3 + 1.9), P(0, -0.3, 6 - 1.9)], new THREE.Vector3(3.5, 0.6, 3.5), M.hex(0xb48cff), 2.6, false, 0, 1.2));
        s.toast('🌉', 'BRIDGE', 'A platform shuttles across the void.');
      }, false, 'Activate bridge', Math.PI));
      b.add(new Switch(P(4, 0, 8), (on) => on && done(), false, 'Unlock gate', Math.PI));
      break;
    }
    case 'code': {
      const code = [0, 1, 2, 3].map(() => Math.floor(Math.random() * 6));
      // make sure the options include all code glyphs
      const options = [0, 1, 2, 3, 4, 5];
      const spots: [number, number, number][] = [[-half + 0.7, 2, -half + 4], [half - 0.7, 2, -2], [-half + 0.7, 2, 4], [half - 0.7, 2, half - 4]];
      code.forEach((g, i) => {
        const sp = spots[i];
        b.add(new GlyphTablet(P(sp[0], sp[1], sp[2]), sp[0] < 0 ? Math.PI / 2 : -Math.PI / 2, ['Δ', 'Ω', 'Σ', 'Ψ', 'Φ', 'Λ'][g], i));
      });
      b.add(new CodePanel(P(0, 0, 3), Math.PI, code, options, done));
      s.toast('🔣', 'GLYPH LOCK', 'Find the 4 numbered glyph tablets and enter the code.');
      break;
    }
    case 'memory': {
      const tiles = b.add(new MemoryTiles(P(0, 0, 1), 3, x.timeScale < 1 ? [4, 5, 6] : [3, 4, 5], done));
      b.add(new Trigger(P(-half + 2, -1, -half + 2), P(half - 2, 3, half - 2), () => tiles.start()));
      s.toast('🧠', 'MEMORY', 'Watch the tiles light up, then step on them in the same order.');
      break;
    }
    case 'invisible': {
      // Chamber floor has a void; invisible stepping stones cross it
      const stones: [number, number][] = [[-2, -4], [1.5, -1], [-1, 2], [2.5, 4.5]];
      for (const [dx, dz] of stones) b.add(new InvisiblePlatform(P(dx, -0.3, dz), new THREE.Vector3(2.2, 0.6, 2.2)));
      b.coin(P(1.5, 1, -1).x, c.y + 1, P(1.5, 1, -1).z);
      b.add(new Switch(P(4, 0, 8), (on) => on && done(), false, 'Unlock gate', Math.PI));
      s.toast('👁', 'UNSEEN BRIDGE', 'Press Q to pulse and reveal hidden platforms.');
      break;
    }
    case 'gravity': {
      // Lift column carries the player up to a ledge with the exit lever
      const liftC = P(-5, 0, 0);
      b.add(new ForceZone(liftC.clone().add(new THREE.Vector3(-1.5, 0, -1.5)), liftC.clone().add(new THREE.Vector3(1.5, 11, 1.5)), new THREE.Vector3(0, 9, 0), 'lift'));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 8, 32), glowMat(0x80c0ff, 3));
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(liftC).setY(c.y + 0.1);
      b.deco(ring);
      // Low-gravity floating platforms
      b.add(new ForceZone(P(-half, 0, -half), P(half, 14, half), new THREE.Vector3(0, 0, 0), 'none', 0.45));
      b.plat(liftC.x + 3, c.y + 9, liftC.z, 3, 3, M.hex(0x80c0ff));
      b.plat(c.x + 1, c.y + 10.5, c.z + 3, 3, 3, M.hex(0x80c0ff));
      b.plat(c.x + 5, c.y + 12, c.z + 6, 4, 4, M.hex(0x80c0ff));
      b.add(new Switch(P(5, 12, 6), (on) => on && done(), false, 'Activate gravity gate', Math.PI));
      b.coins.addLine(P(-5, 2, 0), P(-5, 9, 0), 5);
      s.toast('🪐', 'WEIGHTLESS', 'Ride the lift. Gravity is weaker in this chamber.');
      break;
    }
    case 'timed': {
      const T = Math.round(9 * x.timeScale);
      const door = (x as PuzzleCtx & { door?: Door }).door;
      let running = false;
      let passed = false;
      const sw: Switch = b.add(new Switch(P(0, 0, -half + 3), (on) => {
        if (!on || running) return;
        running = true;
        door?.open();
        Audio.play('powerup');
        let left = T;
        const tick = () => {
          if (s.disposed || passed) return;
          left--;
          Audio.play('countdown', { vol: 0.5, pitch: left < 3 ? 1.5 : 1 });
          s.progress = `Gate closes in ${left}s`;
          if (left <= 0) {
            door?.close();
            s.progress = door?.isOpen ? '' : 'Too slow! Pull the lever again';
            running = false;
            sw.rearm();
            return;
          }
          s.after(1, tick);
        };
        s.after(1, tick);
      }, false, `Open gate (${T}s)`, 0));
      // Once through, the door stays open behind the player
      b.add(new Trigger(P(-3, -1, half + 1), P(3, 4, half + 5), () => {
        running = false;
        passed = true;
        door?.open();
        s.progress = '';
      }));
      // Obstacles between the lever and the gate
      b.add(new SpinBeam(P(0, 0, 0), half - 1, 1.6 / x.timeScale, 0.55, 20));
      b.add(new Laser(P(-half + 0.5, 1.35, 5), P(half - 0.5, 1.35, 5), { blink: [1.2, 1.2] }));
      break;
    }
    case 'mirrors': {
      // Emitter on the west wall, receptor above the gate
      const mirrors = [
        b.add(new Mirror(P(-4, 0, -4), 1)),
        b.add(new Mirror(P(4, 0, -4), 0)),
        b.add(new Mirror(P(4, 0, 4), 0)),
        b.add(new Mirror(P(-4, 0, 4), 1)),
        b.add(new Mirror(P(0, 0, 4), 1)),
      ];
      const beam = b.add(new LightBeam(P(-half + 1, 1.3, -4), new THREE.Vector3(1, 0, 0), mirrors, P(0, 1.3, half - 1.5), done));
      void beam;
      s.toast('🔆', 'PRISM', 'Rotate mirrors (E) to guide the light into the crystal.');
      break;
    }
  }
}

export function buildPuzzleWorld(s: Session, variant: string): LevelLogic {
  const plan = PLANS[variant] ?? PLANS.switches;
  const b = new Builder(s, s.meta.num * 71 + 5);
  const { wall, floor } = templeMats();
  const size = 20;
  // Start
  b.plat(0, 0, -6, 8, 10, floor);
  b.box(new THREE.Vector3(4.5, 3, -6), new THREE.Vector3(1, 6, 10), wall);
  b.box(new THREE.Vector3(-4.5, 3, -6), new THREE.Vector3(1, 6, 10), wall);
  b.box(new THREE.Vector3(0, 3, -11.5), new THREE.Vector3(10, 6, 1), wall);
  let z = -1;
  const timeScale = s.diff.timeLimit;
  plan.forEach((kind, i) => {
    const c = new THREE.Vector3(0, 0, z + size / 2 + 1);
    const pit = kind === 'invisible' || kind === 'bridge';
    let doors: { north: Door | null; south: Door | null };
    if (pit) doors = pitRoom(b, c, size, wall, floor, kind === 'bridge' ? [-3, 6] : [-6, 7]);
    else doors = buildRoom(b, c, size, wall, floor, { north: true, south: true }, false);
    doors.south?.open();
    const north = doors.north!;
    const ctx: PuzzleCtx & { door?: Door } = { s, b, c, size, done: () => north.open(), timeScale, door: north };
    const cp = c.clone().add(new THREE.Vector3(0, 0.1, -size / 2 + 2));
    b.add(new Trigger(cp.clone().add(new THREE.Vector3(-3, -1, -1.5)), cp.clone().add(new THREE.Vector3(3, 3, 1.5)), () => s.setCheckpoint(cp, 0)));
    buildPuzzle(kind, ctx);
    // Decorative glowing columns in corners
    columns(b, [new THREE.Vector3(c.x - size / 2 + 1.5, 0, c.z - size / 2 + 1.5), new THREE.Vector3(c.x + size / 2 - 1.5, 0, c.z - size / 2 + 1.5)], 5.5, M.darkMarble(), 0.5, 0xb48cff);
    if (b.lights < 5) b.light(c.clone().setY(5.5), 0xb48cff, 7, 20);
    // Corridor
    const nz = c.z + size / 2 + 1;
    b.plat(0, 0, nz + 3, 5, 6, floor);
    b.box(new THREE.Vector3(3, 3, nz + 3), new THREE.Vector3(1, 6, 6), wall);
    b.box(new THREE.Vector3(-3, 3, nz + 3), new THREE.Vector3(1, 6, 6), wall);
    if (i === 0) b.coins.addLine(new THREE.Vector3(0, 1, nz + 1), new THREE.Vector3(0, 1, nz + 5), 3);
    if (i === Math.floor(plan.length / 2)) placeTempleSecret(s, b, c, size);
    z = nz + 6 - 1;
  });
  b.plat(0, 0, z + 5, 10, 10, floor);
  b.goal(new THREE.Vector3(0, 0, z + 6), false, 0xb48cff);
  b.finalize();
  return {
    spawn: new THREE.Vector3(0, 0.05, -8),
    spawnYaw: 0,
    theme: 'temple',
    music: 'puzzle',
    ambient: ['hum', 'wind'],
    objective: 'Solve each chamber to open the way',
    abilityMode: 'pulse',
    combat: true,
    killY: -15,
  };
}

/** Chamber with a void pit across its middle (z range relative to centre). */
export function pitRoom(b: Builder, c: THREE.Vector3, size: number, wall: THREE.Material, floor: THREE.Material, pit: [number, number]) {
  const half = size / 2;
  const southLen = pit[0] + half, northLen = half - pit[1];
  b.plat(c.x, c.y, c.z - half + southLen / 2, size, southLen, floor);
  b.plat(c.x, c.y, c.z + half - northLen / 2, size, northLen, floor);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(size, pit[1] - pit[0]), new THREE.MeshBasicMaterial({ color: 0x6040ff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(c.x, c.y - 12, c.z + (pit[0] + pit[1]) / 2);
  b.deco(glow);
  // Walls (reuse the square room builder without its floor): build walls manually
  const h = 6;
  b.box(new THREE.Vector3(c.x + half + 0.5, c.y + h / 2 - 8, c.z), new THREE.Vector3(1, h + 16, size + 2), wall, { tile: 3 });
  b.box(new THREE.Vector3(c.x - half - 0.5, c.y + h / 2 - 8, c.z), new THREE.Vector3(1, h + 16, size + 2), wall, { tile: 3 });
  const doorW = 4, seg = half - doorW / 2;
  let north: Door | null = null, south: Door | null = null;
  for (const side of [1, -1]) {
    const zz = c.z + side * (half + 0.5);
    b.box(new THREE.Vector3(c.x - doorW / 2 - seg / 2, c.y + h / 2, zz), new THREE.Vector3(seg, h, 1), wall, { tile: 3 });
    b.box(new THREE.Vector3(c.x + doorW / 2 + seg / 2, c.y + h / 2, zz), new THREE.Vector3(seg, h, 1), wall, { tile: 3 });
    b.box(new THREE.Vector3(c.x, c.y + h - 0.6, zz), new THREE.Vector3(doorW, 1.2, 1), wall, { tile: 3 });
    const d = b.add(new Door(new THREE.Vector3(c.x, c.y + (h - 1.2) / 2, zz), new THREE.Vector3(doorW, h - 1.2, 0.5), M.darkMetal(), 0xb48cff));
    if (side === 1) north = d;
    else south = d;
  }
  return { north, south };
}

function placeTempleSecret(s: Session, b: Builder, c: THREE.Vector3, size: number) {
  // Hidden alcove high on a wall, reached by invisible steps (use the pulse!)
  const base = new THREE.Vector3(c.x + size / 2 - 2, 0, c.z - size / 2 + 3);
  for (let i = 0; i < 3; i++) b.add(new InvisiblePlatform(base.clone().add(new THREE.Vector3(0, 1.4 + i * 1.5, i * 2.2)), new THREE.Vector3(1.8, 0.4, 1.8)));
  const top = base.clone().add(new THREE.Vector3(0, 5.6, 6.6));
  b.plat(top.x, top.y, top.z, 2.2, 2.2, M.hex(0xffe066));
  if (s.meta.hasSecret) b.secret(top.clone().setY(top.y + 1.2));
  else b.chest('common', top.clone());
}
