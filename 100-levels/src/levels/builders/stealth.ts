/**
 * WORLD 6 — STEALTH (levels 51-60): infiltrate a tech fortress compound.
 * Guards with vision cones patrol around buildings, cameras sweep alleys,
 * tall grass hides you when crouched, stones distract, panels kill alarms,
 * takedowns from behind, keycard gates and data drives to steal.
 */
import * as THREE from 'three';
import type { Session, LevelLogic } from '../Session';
import { Builder } from '../Builder';
import { StealthDirector, Guard, SecurityCamera } from '../../enemies/Stealth';
import { ObjectiveItem, ItemMeshes, GoalPortal } from '../../entities/Pickups';
import { Door } from '../../entities/Platforms';
import { Entity, Interactable } from '../../entities/Entity';
import { M, mat, glowMat, boxGeo, cachedGeo } from '../../gfx/Materials';
import { Audio } from '../../audio/AudioManager';
import { useGame } from '../../store/gameStore';


interface StealthCfg {
  cols: number;
  rows: number;
  guards: number;
  cameras: number;
  grass: number;
  objective: 'extract' | 'intel' | 'panels' | 'takedowns' | 'keycards' | 'drives';
  items: number;
  panels: number;
  combat?: boolean;
  dark?: boolean;
}

const CFG: Record<string, StealthCfg> = {
  intro: { cols: 3, rows: 4, guards: 3, cameras: 0, grass: 5, objective: 'intel', items: 1, panels: 1 },
  cameras: { cols: 3, rows: 4, guards: 3, cameras: 6, grass: 3, objective: 'intel', items: 1, panels: 2 },
  distract: { cols: 3, rows: 5, guards: 6, cameras: 2, grass: 3, objective: 'intel', items: 2, panels: 1 },
  alarms: { cols: 4, rows: 4, guards: 5, cameras: 6, grass: 3, objective: 'panels', items: 0, panels: 3 },
  takedown: { cols: 3, rows: 5, guards: 7, cameras: 2, grass: 4, objective: 'takedowns', items: 3, panels: 1 },
  keycards: { cols: 3, rows: 6, guards: 7, cameras: 4, grass: 4, objective: 'keycards', items: 3, panels: 2 },
  grass: { cols: 4, rows: 5, guards: 8, cameras: 2, grass: 12, objective: 'intel', items: 3, panels: 1 },
  heist: { cols: 4, rows: 5, guards: 8, cameras: 6, grass: 5, objective: 'drives', items: 3, panels: 2 },
  lockdown: { cols: 4, rows: 6, guards: 11, cameras: 9, grass: 5, objective: 'drives', items: 3, panels: 3 },
  boss: { cols: 5, rows: 7, guards: 14, cameras: 12, grass: 7, objective: 'drives', items: 4, panels: 3 },
  stealth_combat: { cols: 4, rows: 5, guards: 10, cameras: 4, grass: 5, objective: 'drives', items: 3, panels: 2, combat: true },
};

/** Wall panel that shuts the alarm (and linked cameras) down. */
class AlarmPanel extends Entity {
  used = false;
  private screen: THREE.Mesh;
  private it!: Interactable;
  constructor(private pos: THREE.Vector3, private yaw: number, private onUse: () => void) {
    super();
    const box = new THREE.Mesh(boxGeo(1, 1.4, 0.3), M.darkMetal());
    box.position.y = 1.4;
    this.screen = new THREE.Mesh(boxGeo(0.7, 0.5, 0.05), glowMat(0xff3030, 2.5));
    this.screen.position.set(0, 1.55, 0.17);
    this.obj.add(box, this.screen);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.yaw;
    const f = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.it = s.addInteractable({ pos: this.pos.clone().addScaledVector(f, 0.6).setY(this.pos.y + 1.2), radius: 1.8, prompt: 'Disable security panel', enabled: true, hold: 1.2, onInteract: () => this.use() });
  }
  private use() {
    if (this.used) return;
    this.used = true;
    this.it.enabled = false;
    this.screen.material = glowMat(0x40ff80, 2.5);
    Audio.play('powerup', { pos: this.pos });
    this.session.particles.emit('sparks', this.pos.clone().setY(this.pos.y + 1.5), { count: 16, color: 0x40ff80 });
    this.onUse();
  }
  dispose() {
    this.session.removeInteractable(this.it);
    super.dispose();
  }
}

export function buildStealth(s: Session, variant: string): LevelLogic {
  const cfg = CFG[variant] ?? CFG.intro;
  const b = new Builder(s, s.meta.num * 173 + 29);
  const rng = b.rng;
  const dir = new StealthDirector(s);
  const CELL = 16;
  const W = cfg.cols * CELL, D = cfg.rows * CELL;
  const x0 = -W / 2, z0 = 0;
  const ground = mat('compound', { tex: 'asphalt', color: 0x8890a0, roughness: 0.8 });
  const wallM = mat('fortWall', { tex: 'metal', color: 0x5a6878, roughness: 0.5, metalness: 0.6 });
  const bldM = [mat('bldA', { tex: 'tech', color: 0x6a7888, roughness: 0.5, metalness: 0.5, emissive: 0x3dffa2, emissiveIntensity: 0.8, emissiveMap: true }), M.darkConcrete(), wallM];
  b.plat(0, 0, D / 2, W + 12, D + 30, ground, 1, { tile: 6 });
  // Perimeter walls
  const H = 5;
  b.box(new THREE.Vector3(x0 - 1, H / 2, D / 2), new THREE.Vector3(2, H, D + 30), wallM, { tile: 3 });
  b.box(new THREE.Vector3(-x0 + 1, H / 2, D / 2), new THREE.Vector3(2, H, D + 30), wallM, { tile: 3 });
  b.box(new THREE.Vector3(0, H / 2, -15), new THREE.Vector3(W + 4, H, 2), wallM, { tile: 3 });
  b.box(new THREE.Vector3(0, H / 2, D + 15), new THREE.Vector3(W + 4, H, 2), wallM, { tile: 3 });
  // Wall-top lights
  for (let z = -10; z < D + 10; z += 12) for (const x of [x0 - 1, -x0 + 1]) b.lamp(new THREE.Vector3(x, H + 0.3, z), 0x3dffa2, 0.15);

  // Buildings on a grid, leaving alleys
  interface Bld { c: THREE.Vector3; w: number; d: number }
  const blds: Bld[] = [];
  for (let r = 0; r < cfg.rows; r++)
    for (let c = 0; c < cfg.cols; c++) {
      if (r === 0 && c === Math.floor(cfg.cols / 2)) continue; // keep the entry clear
      if (rng.chance(0.12)) continue;
      const w = rng.range(6, 10), d = rng.range(6, 10);
      const cc = new THREE.Vector3(x0 + c * CELL + CELL / 2 + rng.range(-1.5, 1.5), 0, z0 + r * CELL + CELL / 2 + rng.range(-1.5, 1.5));
      if (cfg.objective === 'keycards' && [1, 2, 3].some((k) => Math.abs(cc.z - (k / 4) * D) < d / 2 + 2.5)) continue;
      const h = rng.range(4, 9);
      b.box(cc.clone().setY(h / 2), new THREE.Vector3(w, h, d), rng.pick(bldM), { tile: 3 });
      // Roof details
      b.box(cc.clone().setY(h + 0.4), new THREE.Vector3(1.4, 0.8, 1.4), M.metal(), { collide: false });
      b.neon(cc.clone().add(new THREE.Vector3(-w / 2 - 0.02, h - 0.3, -d / 2 - 0.02)), cc.clone().add(new THREE.Vector3(w / 2 + 0.02, h - 0.3, -d / 2 - 0.02)), 0x3dffa2, 0.08);
      blds.push({ c: cc, w, d });
    }
  // Crates as cover
  for (let i = 0; i < cfg.cols * cfg.rows; i++) {
    const p = new THREE.Vector3(rng.range(x0 + 3, -x0 - 3), 0, rng.range(8, D - 4));
    if (blds.some((bl) => Math.abs(p.x - bl.c.x) < bl.w / 2 + 1.5 && Math.abs(p.z - bl.c.z) < bl.d / 2 + 1.5)) continue;
    const sz = rng.pick([1.2, 1.6]);
    b.box(p.clone().setY(sz / 2), new THREE.Vector3(sz, sz, sz), mat('crateS', { tex: 'wood', color: 0x8a7050 }), { tile: 1.2 });
  }
  const inBuilding = (p: THREE.Vector3, pad = 1) => blds.some((bl) => Math.abs(p.x - bl.c.x) < bl.w / 2 + pad && Math.abs(p.z - bl.c.z) < bl.d / 2 + pad);
  const openSpot = (zMin = 10, zMax = D - 4) => {
    for (let k = 0; k < 50; k++) {
      const p = new THREE.Vector3(rng.range(x0 + 3, -x0 - 3), 0, rng.range(zMin, zMax));
      if (!inBuilding(p, 1.6)) return p;
    }
    return new THREE.Vector3(0, 0, (zMin + zMax) / 2);
  };
  // Tall grass patches
  const tuftGeo = cachedGeo('tallGrass', () => new THREE.ConeGeometry(0.1, 1.3, 3).translate(0, 0.65, 0));
  const tufts: { pos: THREE.Vector3; rot: THREE.Euler; scale: THREE.Vector3 }[] = [];
  for (let i = 0; i < cfg.grass; i++) {
    const c = openSpot(6, D - 6);
    const gw = rng.range(4, 7), gd = rng.range(4, 7);
    dir.grass.push(new THREE.Box3(new THREE.Vector3(c.x - gw / 2, -0.5, c.z - gd / 2), new THREE.Vector3(c.x + gw / 2, 3, c.z + gd / 2)));
    for (let k = 0; k < gw * gd * 4; k++) tufts.push({ pos: new THREE.Vector3(c.x + rng.range(-gw / 2, gw / 2), 0, c.z + rng.range(-gd / 2, gd / 2)), rot: new THREE.Euler(rng.range(-0.2, 0.2), rng.range(0, 3), rng.range(-0.2, 0.2)), scale: new THREE.Vector3(1, rng.range(0.8, 1.3), 1) });
  }
  b.instanced(tuftGeo, mat('tallGrassM', { color: 0x4a7a38, roughness: 0.9 }), tufts, false);

  // Guards: patrol loops around buildings, or idle sentries
  const guards: Guard[] = [];
  const nGuards = Math.round(cfg.guards * s.diff.enemyCount * (s.muts.has('enemies') ? 1.6 : 1));
  for (let i = 0; i < nGuards; i++) {
    const bl = blds[(i * 3 + 1) % Math.max(1, blds.length)];
    if (!bl) break;
    if (i % 4 === 3) {
      const p = openSpot(14, D - 6);
      guards.push(s.add(new Guard(dir, p.clone().setY(0.05), [], rng.range(0, Math.PI * 2), true)));
      continue;
    }
    const ox = bl.w / 2 + 2.5, oz = bl.d / 2 + 2.5;
    const corners = [[-ox, -oz], [ox, -oz], [ox, oz], [-ox, oz]].map(([x, z]) => bl.c.clone().add(new THREE.Vector3(x, 0.05, z)));
    const route = i % 2 ? corners : corners.reverse();
    if (route.some((p) => Math.abs(p.x) > -x0 - 1.5 || p.z < 4)) {
      guards.push(s.add(new Guard(dir, route[0].clone().setX(Math.max(x0 + 2, Math.min(-x0 - 2, route[0].x))), [], rng.range(0, 6))));
      continue;
    }
    guards.push(s.add(new Guard(dir, route[0].clone(), route, 0)));
  }
  // Cameras on building corners
  for (let i = 0; i < cfg.cameras && blds.length; i++) {
    const bl = blds[(i * 5 + 2) % blds.length];
    const sx = i % 2 ? 1 : -1, sz = i % 3 ? 1 : -1;
    const p = bl.c.clone().add(new THREE.Vector3(sx * (bl.w / 2 + 0.3), 3.6, sz * (bl.d / 2 + 0.3)));
    b.add(new SecurityCamera(dir, p, Math.atan2(sx, sz), 0.9, 12, 0.55));
  }

  // Objectives
  let got = 0;
  let goal!: GoalPortal;
  let takedownsNeeded = 0;
  const need = cfg.objective === 'panels' ? cfg.panels : cfg.objective === 'takedowns' ? cfg.items : cfg.items;
  const label = { extract: '', intel: 'Intel', panels: 'Panels disabled', takedowns: 'Takedowns', keycards: 'Keycards', drives: 'Data drives' }[cfg.objective];
  const complete = () => {
    goal.setLocked(false);
    useGame.getState().showBanner({ title: 'OBJECTIVE COMPLETE', subtitle: 'Reach extraction', color: '#3dffa2' }, 2400);
  };
  const progressUpd = () => (s.progress = `${label}: ${got}/${need}`);
  const gotOne = () => {
    got++;
    progressUpd();
    Audio.play('pickup');
    if (got >= need) complete();
  };
  const keyDoors: Door[] = [];
  if (cfg.objective === 'keycards') {
    // Sector gates across the compound
    const colors = [0xff3040, 0x3da5ff, 0xffd23d];
    for (let k = 0; k < 3; k++) {
      const z = ((k + 1) / 4) * D;
      const gw = 5;
      const segW = (W - gw) / 2;
      b.box(new THREE.Vector3(x0 + segW / 2, 2, z), new THREE.Vector3(segW, 4, 1), wallM);
      b.box(new THREE.Vector3(-x0 - segW / 2, 2, z), new THREE.Vector3(segW, 4, 1), wallM);
      keyDoors.push(b.add(new Door(new THREE.Vector3(0, 1.8, z), new THREE.Vector3(gw, 3.6, 0.5), M.darkMetal(), colors[k])));
      // Clear buildings blocking the gate
      const card = openSpot(Math.max(6, (k / 4) * D + 4), z - 4);
      b.add(new ObjectiveItem(card.clone().setY(1), ItemMeshes.card(colors[k]), () => {
        keyDoors[k].open();
        gotOne();
        s.toast('🔑', 'KEYCARD', `Sector ${k + 1} gate unlocked`);
      }, 'Take keycard', true, colors[k]));
    }
  } else if (cfg.objective === 'intel' || cfg.objective === 'drives') {
    for (let i = 0; i < need; i++) {
      const p = openSpot(D * (0.3 + (i / Math.max(1, need)) * 0.6), D - 4);
      b.add(new ObjectiveItem(p.clone().setY(1), cfg.objective === 'intel' ? ItemMeshes.card(0x3dffa2) : ItemMeshes.drive(), gotOne, 'Steal', true, 0x3dffa2));
      b.box(p.clone().setY(0.4), new THREE.Vector3(1.2, 0.8, 0.8), M.darkMetal());
    }
  } else if (cfg.objective === 'takedowns') {
    takedownsNeeded = need;
    s.toast('🥷', 'TAKEDOWNS', 'Sneak behind guards and press E');
  }
  // Alarm panels (always useful; required in 'panels')
  for (let i = 0; i < cfg.panels && blds.length; i++) {
    const bl = blds[(i * 7 + 3) % blds.length];
    const p = bl.c.clone().add(new THREE.Vector3(0, 0, -bl.d / 2 - 0.16));
    b.add(new AlarmPanel(p, Math.PI, () => {
      dir.disableAlarm();
      // Shut down the nearest cameras
      dir.cameras.slice().sort((a, c) => (a as unknown as { pos: THREE.Vector3 }).pos.distanceTo(p) - (c as unknown as { pos: THREE.Vector3 }).pos.distanceTo(p)).slice(0, Math.ceil(dir.cameras.length / cfg.panels)).forEach((c) => c.disable());
      s.toast('🛡', 'SECURITY DOWN', 'Alarm reset · nearby cameras offline');
      if (cfg.objective === 'panels') gotOne();
    }));
  }
  // Extraction
  goal = b.goal(new THREE.Vector3(0, 0, D + 8), cfg.objective !== 'extract', 0x3dffa2);
  b.plat(0, 0.02, D + 8, 8, 8, M.tech(0x3dffa2), 0.1, { collide: false });
  // Secret: a relic on a rooftop reached via crates
  const roof = blds[Math.floor(blds.length / 2)];
  if (roof) {
    const rh = 5;
    b.box(roof.c.clone().add(new THREE.Vector3(roof.w / 2 + 1, 0.7, 0)), new THREE.Vector3(1.4, 1.4, 1.4), mat('crateS', { tex: 'wood', color: 0x8a7050 }));
    b.box(roof.c.clone().add(new THREE.Vector3(roof.w / 2 + 1, 2.1, 1.4)), new THREE.Vector3(1.4, 1.4, 1.4), mat('crateS', { tex: 'wood', color: 0x8a7050 }));
    b.box(roof.c.clone().add(new THREE.Vector3(roof.w / 2 + 1, 3.5, 2.8)), new THREE.Vector3(1.4, 1.4, 1.4), mat('crateS', { tex: 'wood', color: 0x8a7050 }));
    void rh;
    const top = s.physics.heightAt(roof.c.x, roof.c.z);
    if (s.meta.hasSecret) b.secret(roof.c.clone().setY(top + 1.2));
    else b.chest('rare', roof.c.clone().setY(top));
  }
  for (let i = 0; i < 12; i++) {
    const p = openSpot(4, D);
    b.coin(p.x, 1, p.z);
  }
  b.finalize();
  if (cfg.objective !== 'extract') progressUpd();
  let lastState = '';
  return {
    spawn: new THREE.Vector3(0, 0.05, -8),
    spawnYaw: 0,
    theme: 'fortress',
    music: variant === 'boss' ? 'fortress' : 'stealth',
    ambient: ['hum', 'wind'],
    objective: cfg.objective === 'panels' ? 'Disable every security panel, then extract' : cfg.objective === 'takedowns' ? `Take down ${need} guards silently, then extract` : cfg.objective === 'keycards' ? 'Find the keycards to open each sector gate' : `Steal the ${label?.toLowerCase()} and reach extraction`,
    abilityMode: 'throw',
    combat: !!cfg.combat,
    killY: -20,
    update: (dt) => {
      dir.update(dt);
      if (takedownsNeeded) {
        const downs = guards.filter((g) => g.state === 'DOWN').length;
        if (downs !== got) {
          got = downs;
          progressUpd();
          if (got >= need) complete();
        }
      }
      const st = dir.worstState;
      if (st !== lastState) {
        lastState = st;
        Audio.setMusicIntensity(st === 'CHASE' || st === 'ALARM' ? 2 : st === 'SUSPICIOUS' || st === 'SEARCH' ? 1 : 0);
      }
    },
    hud: () => ({ stealth: { detection: dir.maxDetection * 100, state: dir.worstState, alarm: dir.alarm } }),
    challengeMet: () => !s.detected,
  };
}

