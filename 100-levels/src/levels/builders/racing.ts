/**
 * WORLD 4 — RACING (levels 31-40). Neon highway circuits with checkpoints,
 * laps, AI rivals, boost pads, ramps & jumps, obstacles, traffic and
 * elimination races. Also reused by Chaos III (falling city).
 */
import * as THREE from 'three';
import type { Session, LevelLogic } from '../Session';
import { Builder } from '../Builder';
import { Track } from '../../racing/Track';
import { Car, CarInput } from '../../racing/Vehicle';
import { Input } from '../../core/Input';
import { Audio } from '../../audio/AudioManager';
import { cachedGeo, glowMat, M } from '../../gfx/Materials';
import { cityBackdrop } from '../Decor';
import { useGame } from '../../store/gameStore';
import { clamp, RNG, wrapAngle, rand } from '../../core/math';
import { Meteor } from '../../entities/Hazards';
import { getTextTexture } from '../../gfx/Textures';

interface RaceCfg {
  laps: number;
  rivals: number;
  lobes: number;
  amp: number;
  radius: number;
  width: number;
  obstacles: number;
  ramps: number;
  boostPads: number;
  traffic: number;
  elimination?: boolean;
  trial?: boolean;
  meteors?: boolean;
  hills: number;
}

const CFG: Record<string, RaceCfg> = {
  trial: { laps: 1, rivals: 0, lobes: 2, amp: 0.25, radius: 110, width: 16, obstacles: 0, ramps: 0, boostPads: 2, traffic: 0, trial: true, hills: 3 },
  rivals: { laps: 2, rivals: 3, lobes: 3, amp: 0.22, radius: 100, width: 15, obstacles: 0, ramps: 0, boostPads: 2, traffic: 0, hills: 4 },
  obstacles: { laps: 2, rivals: 3, lobes: 3, amp: 0.3, radius: 105, width: 16, obstacles: 22, ramps: 0, boostPads: 2, traffic: 0, hills: 3 },
  ramps: { laps: 2, rivals: 3, lobes: 2, amp: 0.3, radius: 115, width: 16, obstacles: 4, ramps: 3, boostPads: 3, traffic: 0, hills: 5 },
  drift: { laps: 2, rivals: 3, lobes: 5, amp: 0.34, radius: 95, width: 14, obstacles: 0, ramps: 0, boostPads: 2, traffic: 0, hills: 2 },
  boost: { laps: 2, rivals: 4, lobes: 3, amp: 0.25, radius: 120, width: 16, obstacles: 6, ramps: 1, boostPads: 10, traffic: 0, hills: 4 },
  elimination: { laps: 3, rivals: 4, lobes: 4, amp: 0.28, radius: 100, width: 15, obstacles: 6, ramps: 1, boostPads: 3, traffic: 0, elimination: true, hills: 4 },
  traffic: { laps: 2, rivals: 3, lobes: 3, amp: 0.25, radius: 115, width: 18, obstacles: 0, ramps: 0, boostPads: 2, traffic: 12, hills: 3 },
  grandprix: { laps: 3, rivals: 5, lobes: 4, amp: 0.3, radius: 125, width: 16, obstacles: 10, ramps: 2, boostPads: 4, traffic: 4, hills: 5 },
  ultimate: { laps: 3, rivals: 7, lobes: 5, amp: 0.32, radius: 135, width: 17, obstacles: 12, ramps: 3, boostPads: 5, traffic: 0, hills: 6 },
  chaos: { laps: 2, rivals: 5, lobes: 4, amp: 0.3, radius: 115, width: 17, obstacles: 18, ramps: 2, boostPads: 4, traffic: 4, meteors: true, hills: 4 },
};

const RIVAL_COLORS = [0xff2d55, 0xffd23d, 0x3dffa2, 0xb48cff, 0xff8a3d, 0xffffff, 0x3da5ff, 0x40ff40];
const RIVAL_NAMES = ['VIPER', 'NOVA', 'GHOST', 'BLITZ', 'RAVEN', 'ZERO', 'COMET', 'JINX'];

interface AICar {
  car: Car;
  lane: number;
  skill: number;
  name: string;
  traffic: boolean;
  laneT: number;
}

export function buildRacing(s: Session, variant: string): LevelLogic {
  const cfg = CFG[variant] ?? CFG.rivals;
  const b = new Builder(s, s.meta.num * 97 + 13);
  const rng = new RNG(s.meta.num * 131 + 7);
  // Track shape: perturbed closed loop with hills
  const pts: THREE.Vector3[] = [];
  const N = 24;
  const phase = rng.range(0, 6);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = cfg.radius * (1 + cfg.amp * Math.sin(cfg.lobes * a + phase) + 0.08 * Math.sin(a * 7 + phase * 2) + rng.range(-0.04, 0.04));
    const y = 4 + Math.sin(a * cfg.hills + phase) * 4 + (rng.next() - 0.5) * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r * 0.85));
  }
  const ramps = Array.from({ length: cfg.ramps }, (_, i) => ({ at: 0.18 + (i / Math.max(1, cfg.ramps)) * 0.7, len: 16, height: 3.2 }));
  const track = new Track({ points: pts, width: cfg.width, samples: 700, ramps });
  const M_ = track.samples.length;
  const boostPads = Array.from({ length: cfg.boostPads }, (_, i) => ({ at: 0.08 + (i / cfg.boostPads) * 0.9 + 0.03, lateral: rng.range(-cfg.width / 4, cfg.width / 4) }));
  track.build(b, { barrierColor: 0xff2d9a, lampColor: 0xfff0c0, boostPads });
  cityBackdrop(b, new THREE.Vector3(0, -5, 0), cfg.radius * 1.6, cfg.radius * 3.2, 120, 0xffe0f0);
  // Ground plane far below with glow grid
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ color: 0x0a0a14, roughness: 0.3, metalness: 0.6 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -6;
  b.deco(ground);

  // Start/finish arch + checkpoints
  const CP = 8;
  const cpIdx = Array.from({ length: CP }, (_, i) => Math.floor((i / CP) * M_));
  const arches: THREE.Mesh[] = [];
  cpIdx.forEach((i, k) => {
    const smp = track.sample(i);
    const yaw = Math.atan2(smp.t.x, smp.t.z);
    const arch = new THREE.Mesh(cachedGeo('arch' + cfg.width, () => new THREE.TorusGeometry(cfg.width / 2 + 1, 0.25, 8, 32, Math.PI)), glowMat(k === 0 ? 0xffd23d : 0x34d4ff, 1.6));
    arch.position.copy(smp.p);
    arch.rotation.y = yaw + Math.PI / 2;
    b.deco(arch, false);
    arches.push(arch);
    if (k === 0) {
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(cfg.width, 2), new THREE.MeshBasicMaterial({ map: getTextTexture('START · FINISH', '#ffffff', '#101018', 512, '900 60px Orbitron, Arial Black'), side: THREE.DoubleSide, toneMapped: false }));
      banner.position.copy(smp.p).setY(smp.p.y + cfg.width / 2 + 1.5);
      banner.rotation.y = yaw;
      b.deco(banner);
    }
  });

  // Obstacles on track (barrels / barriers)
  const obstacles: { p: THREE.Vector3; r: number; mesh: THREE.Object3D; hit: number }[] = [];
  for (let i = 0; i < cfg.obstacles; i++) {
    const idx = Math.floor(rng.range(0.1, 0.95) * M_);
    const lat = rng.range(-cfg.width / 2 + 2, cfg.width / 2 - 2);
    const p = track.at(idx, lat);
    const m = new THREE.Mesh(cachedGeo('barrel', () => new THREE.CylinderGeometry(0.7, 0.7, 1.6, 12)), rng.chance(0.5) ? M.metal() : glowMat(0xff6020, 1.2));
    m.position.copy(p).setY(p.y + 0.8);
    m.castShadow = true;
    s.scene.add(m);
    obstacles.push({ p, r: 0.9, mesh: m, hit: 0 });
  }

  // Cars
  const player = new Car(0x2a6fdb, track, 0x34d4ff);
  s.scene.add(player.root);
  player.maxSpeed = 54;
  const ai: AICar[] = [];
  const grid = cfg.rivals + 1;
  for (let i = 0; i < cfg.rivals; i++) {
    const car = new Car(RIVAL_COLORS[i % 8], track, RIVAL_COLORS[(i + 3) % 8]);
    s.scene.add(car.root);
    const skill = (0.88 + (i / Math.max(1, cfg.rivals)) * 0.14) * s.diff.rivalSpeed * (variant === 'ultimate' ? 1.03 : 1);
    car.maxSpeed = 54 * skill;
    ai.push({ car, lane: ((i % 3) - 1) * cfg.width * 0.25, skill, name: RIVAL_NAMES[i % 8], traffic: false, laneT: rand(0, 5) });
  }
  for (let i = 0; i < cfg.traffic; i++) {
    const car = new Car(0x404850, track, 0xffa040);
    s.scene.add(car.root);
    car.maxSpeed = rand(16, 24);
    const t: AICar = { car, lane: (rng.chance(0.5) ? 1 : -1) * cfg.width * 0.25, skill: 1, name: 'traffic', traffic: true, laneT: 0 };
    car.place(Math.floor(((i + 0.5) / cfg.traffic) * M_), t.lane);
    ai.push(t);
  }
  // Grid positions behind the start line (player at the back = must overtake)
  const racers = ai.filter((a) => !a.traffic);
  const slotOf = (k: number) => ({ idx: (M_ - 4 - Math.floor(k / 2) * 5) % M_, lat: (k % 2 ? 1 : -1) * cfg.width * 0.22 });
  racers.forEach((a, k) => {
    const sl = slotOf(k);
    a.car.place(sl.idx, sl.lat);
    a.car.lap = -1;
  });
  const ps = slotOf(racers.length);
  player.place(ps.idx, ps.lat);
  player.lap = -1;
  [player, ...racers.map((r) => r.car)].forEach((c) => (c.lastIdx = c.idx));

  // Hidden safe pad for the (invisible) on-foot player
  b.plat(0, -200, 0, 6, 6, M.darkMetal());

  const playerAI: AICar = { car: player, lane: 0, skill: 1, name: 'you', traffic: false, laneT: 0 };
  let countdown = 3.6;
  let lastCount = 4;
  let finished = false;
  const totalRacers = grid;
  let eliminatedCount = 0;
  const laps = cfg.laps;
  player.onCrash = (imp) => {
    Audio.play('crash', { vol: Math.min(1, imp / 25) });
    s.rig.shake(Math.min(0.5, imp / 50));
    s.particles.emit('sparks', player.pos.clone().setY(player.pos.y + 0.6), { count: 20 });
    s.damageTaken += 1;
  };
  let place = 1;

  const countLap = (c: Car) => {
    // Crossing the start line forward
    if (c.lastIdx > M_ * 0.85 && c.idx < M_ * 0.15) {
      if (c.checkpoint >= CP - 1 || c.lap < 0) {
        c.lap++;
        c.checkpoint = 0;
        return true;
      }
    } else if (c.lastIdx < M_ * 0.15 && c.idx > M_ * 0.85) {
      // Driving backwards over the line
    } else {
      const nextCp = cpIdx[c.checkpoint + 1];
      if (nextCp !== undefined && c.lastIdx < nextCp && c.idx >= nextCp && c.idx - c.lastIdx < 40) c.checkpoint++;
    }
    return false;
  };

  const rankings = () =>
    [player, ...racers.map((r) => r.car)]
      .filter((c) => !c.eliminated)
      .sort((a, b2) => (b2.finished ? 1e9 - b2.finishTime : b2.lap * track.length + track.sample(b2.idx).s) - (a.finished ? 1e9 - a.finishTime : a.lap * track.length + track.sample(a.idx).s));

  const inputFor = (a: AICar, dt: number): CarInput => {
    const c = a.car;
    const look = Math.floor(8 + c.speed * 0.35);
    // Avoid obstacles & traffic by switching lane
    a.laneT -= dt;
    for (const o of obstacles) {
      const oi = track.nearest(o.p, c.idx);
      const ahead = (oi - c.idx + M_) % M_;
      if (ahead > 0 && ahead < 25) {
        const olat = o.p.clone().sub(track.sample(oi).p).dot(track.sample(oi).r);
        if (Math.abs(olat - a.lane) < 2.5) a.lane = olat > 0 ? olat - 4 : olat + 4;
      }
    }
    if (a.laneT <= 0 && !a.traffic) {
      a.laneT = rand(2, 5);
      a.lane = clamp(a.lane + rand(-3, 3), -cfg.width / 2 + 2.5, cfg.width / 2 - 2.5);
    }
    a.lane = clamp(a.lane, -cfg.width / 2 + 2, cfg.width / 2 - 2);
    const target = track.at(c.idx + look, a.lane);
    const want = Math.atan2(target.x - c.pos.x, target.z - c.pos.z);
    const diff = wrapAngle(want - c.yaw);
    let curv = 0;
    for (let k = 5; k < 50; k += 5) curv = Math.max(curv, track.sample(c.idx + k).curv);
    let speedCap = c.maxSpeed * clamp(1.15 - curv * 2.2, 0.45, 1);
    if (!a.traffic) {
      // Rubber band: rivals behind the player speed up slightly and vice versa
      const gap = (player.lap * track.length + track.sample(player.idx).s) - (c.lap * track.length + track.sample(c.idx).s);
      speedCap *= clamp(1 + gap / 900, 0.9, 1.12);
    }
    return { throttle: c.speed < speedCap ? 1 : -0.3, steer: clamp(-diff * 2.5, -1, 1), drift: Math.abs(diff) > 0.35 && c.speed > 30 && !a.traffic, boost: !a.traffic && c.boost > 50 && curv < 0.15 && Math.random() < 0.02 };
  };

  const carCollisions = () => {
    const all = [player, ...ai.map((a) => a.car)];
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const A = all[i], B = all[j];
        if (A.eliminated || B.eliminated) continue;
        const d = new THREE.Vector3(B.pos.x - A.pos.x, 0, B.pos.z - A.pos.z);
        const l = d.length();
        if (l < 2.3 && l > 0.01) {
          d.divideScalar(l);
          const push = (2.3 - l) / 2;
          A.pos.addScaledVector(d, -push);
          B.pos.addScaledVector(d, push);
          const rel = A.speed - B.speed;
          A.speed -= rel * 0.25;
          B.speed += rel * 0.25;
          if (A === player || B === player) {
            Audio.play('crash', { vol: 0.5, throttle: 0.2 });
            s.rig.shake(0.15);
            s.particles.emit('sparks', A.pos.clone().lerp(B.pos, 0.5).setY(A.pos.y + 0.7), { count: 10 });
          }
        }
      }
    for (const o of obstacles) {
      for (const c of all) {
        const d = Math.hypot(c.pos.x - o.p.x, c.pos.z - o.p.z);
        if (d < o.r + 1.1 && !c.airborne) {
          const dir = new THREE.Vector3(c.pos.x - o.p.x, 0, c.pos.z - o.p.z).normalize();
          c.pos.addScaledVector(dir, o.r + 1.1 - d);
          c.speed *= 0.55;
          if (c === player) {
            Audio.play('crash');
            s.rig.shake(0.3);
            s.particles.emit('debris', o.p.clone().setY(o.p.y + 1), { count: 16 });
            s.damageTaken += 1;
          }
        }
      }
    }
  };

  const finishRace = () => {
    if (finished) return;
    finished = true;
    player.finished = true;
    player.finishTime = s.time;
    place = rankings().indexOf(player) + 1;
    Audio.setEngine(-1);
    const passPlace = cfg.trial ? 1 : cfg.elimination ? totalRacers - eliminatedCount : Math.min(3, totalRacers);
    if (place <= passPlace) {
      useGame.getState().showBanner({ title: place === 1 ? '🏆 1ST PLACE!' : `FINISHED ${ordinal(place)}`, subtitle: `Time ${s.time.toFixed(2)}s`, color: '#ffd23d', big: true }, 3000);
      s.win();
    } else s.fail(`Finished ${ordinal(place)} — top ${passPlace} required`);
  };

  const logic: LevelLogic = {
    spawn: new THREE.Vector3(0, -199.9, 0),
    spawnYaw: 0,
    theme: 'highway',
    music: 'racing',
    ambient: ['city', 'wind'],
    objective: cfg.trial ? 'Hit every checkpoint before time runs out' : cfg.elimination ? 'Survive: last place is eliminated every lap' : `Finish in the top 3 (${laps} laps)`,
    abilityMode: 'none',
    combat: false,
    killY: -400,
    timeLimit: cfg.trial ? s.meta.parTime * 1.6 : undefined,
    hidePlayer: true,
    cameraMode: 'vehicle',
    cameraTarget: () => player.pos.clone().setY(player.pos.y + 1.4),
    intro: () => {
      const f = player.forward;
      const look = player.pos.clone().setY(player.pos.y + 1);
      return [
        { from: player.pos.clone().addScaledVector(f, 12).add(new THREE.Vector3(6, 3, 0)), to: player.pos.clone().addScaledVector(f, 4).add(new THREE.Vector3(3, 1.2, 0)), lookFrom: look, lookTo: look, duration: 2.2, fov: 50 },
        { from: player.pos.clone().addScaledVector(f, 4).add(new THREE.Vector3(3, 1.2, 0)), to: player.pos.clone().addScaledVector(f, -7).setY(player.pos.y + 3), lookFrom: look, lookTo: look.clone().addScaledVector(f, 10), duration: 1, fov: 62 },
      ];
    },
    update: (dt) => {
      s.player.controlEnabled = false;
      const playing = s.state === 'playing';
      // Countdown before the start
      if (playing && countdown > 0) {
        countdown -= dt;
        const n = Math.ceil(countdown - 0.6);
        if (n !== lastCount && n >= 1 && n <= 3) {
          lastCount = n;
          Audio.play('countdown');
          useGame.getState().showBanner({ title: String(n), subtitle: 'GET READY', color: '#ffd23d', big: true }, 800);
        }
        if (countdown <= 0.6 && lastCount !== 0) {
          lastCount = 0;
          Audio.play('go');
          useGame.getState().showBanner({ title: 'GO!', subtitle: '', color: '#3dffa2', big: true }, 900);
        }
      }
      const racing = playing && countdown <= 0.6 && !finished;
      // Player input
      const pin: CarInput = racing
        ? {
            throttle: (Input.isDown('forward') ? 1 : 0) - (Input.isDown('back') ? 1 : 0) + (Input.touchMove.y > 0.3 ? 1 : 0),
            steer: (Input.isDown('right') ? 1 : 0) - (Input.isDown('left') ? 1 : 0) + Input.touchMove.x,
            drift: Input.isDown('sprint') || Input.isDown('crouch'),
            boost: Input.isDown('jump'),
          }
        : { throttle: finished ? 0.2 : 0, steer: 0, drift: false, boost: false };
      if (racing && (window as unknown as { __autopilot?: boolean }).__autopilot) {
        const auto = inputFor(playerAI, dt);
        Object.assign(pin, auto, { boost: player.boost > 30 });
      }
      const wasBoost = player.boosting;
      player.lastIdx = player.idx;
      player.update(dt, pin);
      if (player.boosting && !wasBoost) Audio.play('boost');
      for (const bp of boostPads) {
        const i = Math.floor(bp.at * M_);
        const p = track.at(i, bp.lateral);
        if (Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < 2.8 && !player.airborne) {
          if (player.speed < player.maxSpeed * 1.3) {
            player.speed = Math.min(player.maxSpeed * 1.35, player.speed + 18 * dt * 10);
            Audio.play('boost', { throttle: 0.8 });
          }
          player.boost = Math.min(100, player.boost + 40 * dt);
        }
      }
      if (racing && countLap(player)) {
        if (player.lap >= 1) Audio.play('lap');
        if (player.lap >= laps) finishRace();
        else if (player.lap >= 1) useGame.getState().showBanner({ title: player.lap === laps - 1 ? 'FINAL LAP' : `LAP ${player.lap + 1}/${laps}`, subtitle: '', color: '#34d4ff' }, 1600);
        if (cfg.elimination && player.lap >= 1) {
          // Eliminate the last racer each lap
          const r = rankings();
          const last = r[r.length - 1];
          if (r.length > 2) {
            if (last === player) {
              s.fail('Eliminated — you were in last place');
            } else {
              last.eliminated = true;
              last.root.visible = false;
              eliminatedCount++;
              const who = racers.find((x) => x.car === last)?.name ?? 'RIVAL';
              s.toast('❌', 'ELIMINATED', `${who} is out!`);
              s.particles.emit('explosion', last.pos, { count: 40 });
            }
          }
        }
      }
      // AI
      for (const a of ai) {
        if (a.car.eliminated) continue;
        a.car.lastIdx = a.car.idx;
        a.car.update(dt, racing || a.traffic ? inputFor(a, dt) : { throttle: 0, steer: 0, drift: false, boost: false });
        if (!a.traffic && racing) {
          countLap(a.car);
          if (a.car.lap >= laps && !a.car.finished) {
            a.car.finished = true;
            a.car.finishTime = s.time;
          }
        }
      }
      carCollisions();
      // Checkpoint arches highlight
      arches.forEach((ar, k) => (ar.material = glowMat(k === (player.checkpoint + 1) % CP ? 0x3dffa2 : k === 0 ? 0xffd23d : 0x34d4ff, k === (player.checkpoint + 1) % CP ? 2.2 : 1.4)));
      // Chaos variant: meteors falling on the road
      if (cfg.meteors && racing && Math.random() < dt * 0.9) {
        const tgt = track.at(player.idx + Math.floor(rand(15, 40)), rand(-cfg.width / 3, cfg.width / 3));
        s.add(new Meteor(tgt, 1.2, 3.5, 0, 'meteor', (p) => {
          if (player.pos.distanceTo(p) < 4) {
            player.speed *= 0.4;
            player.onCrash?.(20);
          }
        }));
      }
      // Camera & feel
      s.rig.mode = 'vehicle';
      s.rig.vehicleYaw = player.yaw;
      s.rig.vehicleSpeed = Math.abs(player.speed);
      s.rig.fovKick = player.boosting ? 14 : Math.abs(player.speed) * 0.12;
      s.post.motionTarget = clamp(Math.abs(player.speed) / 60, 0, 1) * (player.boosting ? 1.3 : 0.6);
      if (player.boosting) s.particles.emit('fire', player.pos.clone().addScaledVector(player.forward, -2.3).setY(player.pos.y + 0.4), { count: 2, color: 0x80c0ff, color2: 0x2040ff, size: [0.6, 0.1], up: 0.5 });
      if (player.drifting) s.particles.emit('smoke', player.pos.clone().addScaledVector(player.forward, -1.5).setY(player.pos.y + 0.2), { count: 1, size: [0.8, 2.2], alpha: 0.3, color: 0x909090 });
      Audio.setEngine(playing ? clamp(Math.abs(player.speed) / 60, 0, 1.2) : 0.05);
      const r = rankings();
      place = r.indexOf(player) + 1;
      s.progress = cfg.trial ? `Checkpoint ${player.checkpoint}/${CP - 1}` : `${ordinal(place)} of ${r.length}`;
    },
    hud: () => ({
      race: { lap: Math.max(1, player.lap + 1), laps, pos: place, total: rankings().length, speed: player.kmh, boost: player.boost, checkpoint: player.checkpoint, checkpoints: CP - 1 },
    }),
    challengeMet: () => place === 1,
    result: () => ({ raceWon: place === 1 }),
    onPlayerFell: () => true,
    dispose: () => {
      player.dispose();
      ai.forEach((a) => a.car.dispose());
      obstacles.forEach((o) => o.mesh.removeFromParent());
      Audio.setEngine(-1);
    },
  };
  b.finalize();
  return logic;
}

function ordinal(n: number) {
  return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
}
