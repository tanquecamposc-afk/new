/**
 * Collectibles and interactive props: coins (instanced), secret relics, chests,
 * goal portal, checkpoints, switches, pressure plates, triggers, breakable walls,
 * and generic objective items (keys, fuses, data drives...).
 */
import * as THREE from 'three';
import { Entity, Damageable, HitInfo, Interactable } from './Entity';
import { boxGeo, cachedGeo, glowMat, M } from '../gfx/Materials';
import { Audio } from '../audio/AudioManager';
import { makeCollider, Collider } from '../physics/Physics';
import { Rarity, RARITY_COLOR } from '../data/items';
import { rand } from '../core/math';
import { playerOverlaps } from './Platforms';
import type { Session } from '../levels/Session';

/** All coins of a level in a single instanced mesh. */
export class CoinField extends Entity {
  private positions: THREE.Vector3[] = [];
  private taken: boolean[] = [];
  private mesh: THREE.InstancedMesh | null = null;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private sc = new THREE.Vector3(1, 1, 1);
  magnet = 1.3;

  add(p: THREE.Vector3) {
    this.positions.push(p.clone());
    this.taken.push(false);
  }
  addLine(a: THREE.Vector3, b: THREE.Vector3, n: number) {
    for (let i = 0; i < n; i++) this.add(a.clone().lerp(b, n === 1 ? 0.5 : i / (n - 1)));
  }
  addArc(a: THREE.Vector3, b: THREE.Vector3, h: number, n: number) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      this.add(a.clone().lerp(b, t).setY(a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * h));
    }
  }

  init(s: Session) {
    s.scene.add(this.obj);
  }

  /** Finalise after the builder placed all coins. */
  finalize() {
    const s = this.session;
    const geo = cachedGeo('coin', () => {
      const g = new THREE.CylinderGeometry(0.32, 0.32, 0.07, 20);
      g.rotateX(Math.PI / 2);
      return g;
    });
    const mat = new THREE.MeshStandardMaterial({ color: 0xffc830, metalness: 1, roughness: 0.25, emissive: 0xff9a00, emissiveIntensity: 0.35 });
    this.mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, this.positions.length));
    this.mesh.castShadow = true;
    this.obj.add(this.mesh);
    s.totalCoins += this.positions.length;
    this.update(0);
  }

  update(_dt: number) {
    if (!this.mesh) return;
    const s = this.session;
    const t = s.clock;
    const pc = s.player.center;
    for (let i = 0; i < this.positions.length; i++) {
      const p = this.positions[i];
      if (this.taken[i]) {
        this.sc.setScalar(0);
      } else {
        this.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t * 3 + i * 0.4);
        this.sc.setScalar(1);
        if (!s.player.dead && p.distanceTo(pc) < this.magnet) {
          this.taken[i] = true;
          s.addCoin(p);
          this.sc.setScalar(0);
        }
      }
      this.m.compose(new THREE.Vector3(p.x, p.y + Math.sin(t * 2.5 + i) * 0.12, p.z), this.q, this.sc);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  get remaining() {
    return this.taken.filter((x) => !x).length;
  }
}

/** Glowing secret relic. */
export class SecretRelic extends Entity {
  private core: THREE.Mesh;
  private taken = false;
  private beamT = 0;
  constructor(private id: string, private pos: THREE.Vector3) {
    super();
    this.core = new THREE.Mesh(cachedGeo('relic', () => new THREE.OctahedronGeometry(0.35, 0)), new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffb020, emissiveIntensity: 2.5, metalness: 0.8, roughness: 0.2 }));
    const ring = new THREE.Mesh(cachedGeo('relicRing', () => new THREE.TorusGeometry(0.6, 0.03, 8, 32)), glowMat(0xffe066, 3));
    ring.rotation.x = Math.PI / 2;
    this.obj.add(this.core, ring);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    // Already found in a previous run: show a ghost version (still collectable for the star)
    if (useFound(this.id)) (this.core.material as THREE.MeshStandardMaterial).opacity = 0.6;
  }
  update(dt: number) {
    if (this.taken) return;
    const s = this.session;
    this.core.rotation.y += dt * 2;
    this.core.rotation.x += dt * 0.7;
    this.obj.position.y = this.pos.y + Math.sin(s.clock * 2) * 0.15;
    this.obj.children[1].rotation.z += dt;
    this.beamT -= dt;
    if (this.beamT <= 0) {
      this.beamT = 0.15;
      s.particles.emit('magic', this.pos, { count: 1, color: 0xffe066, color2: 0xff8020, velSpread: 0.5, up: 1 });
    }
    if (s.player.center.distanceTo(this.pos) < 1.3) {
      this.taken = true;
      s.foundSecret(this.id, this.pos);
      this.destroy();
    }
  }
}

let foundCheck: ((id: string) => boolean) | null = null;
export const setFoundCheck = (fn: (id: string) => boolean) => (foundCheck = fn);
const useFound = (id: string) => foundCheck?.(id) ?? false;

/** Treasure chest placed in a level; opens with E and reveals its rarity. */
export class ChestPickup extends Entity {
  private lid: THREE.Group;
  private opened = false;
  private k = 0;
  private it: Interactable | null = null;
  constructor(private rarity: Rarity, private pos: THREE.Vector3, private yaw = 0) {
    super();
    const col = RARITY_COLOR[rarity];
    const wood = M.wood();
    const trim = new THREE.MeshStandardMaterial({ color: col, metalness: 0.9, roughness: 0.3, emissive: col, emissiveIntensity: 0.25 });
    const base = new THREE.Mesh(boxGeo(1.2, 0.6, 0.8), wood);
    base.position.y = 0.3;
    base.castShadow = true;
    this.lid = new THREE.Group();
    const lidMesh = new THREE.Mesh(cachedGeo('chestLid', () => new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2)), wood);
    lidMesh.castShadow = true;
    lidMesh.position.z = 0.4;
    this.lid.add(lidMesh);
    this.lid.position.set(0, 0.6, -0.4);
    const bands = [-0.45, 0.45].map((x) => {
      const b = new THREE.Mesh(boxGeo(0.1, 0.64, 0.84), trim);
      b.position.set(x, 0.3, 0);
      return b;
    });
    const lock = new THREE.Mesh(boxGeo(0.18, 0.2, 0.06), trim);
    lock.position.set(0, 0.55, 0.42);
    this.obj.add(base, this.lid, lock, ...bands);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.yaw;
    this.addCollider(makeCollider(this.pos.clone().setY(this.pos.y + 0.3), new THREE.Vector3(1.2, 0.6, 1.2)));
    this.it = s.addInteractable({
      pos: this.pos.clone().setY(this.pos.y + 0.8), radius: 2.2, prompt: `Open ${this.rarity} chest`, enabled: true,
      onInteract: () => this.open(),
    });
  }
  open() {
    if (this.opened) return;
    this.opened = true;
    if (this.it) this.it.enabled = false;
    const s = this.session;
    s.foundChest(this.rarity, this.pos.clone().setY(this.pos.y + 1));
    s.fx.flash(this.pos.clone().setY(this.pos.y + 1.5), RARITY_COLOR[this.rarity], 30, 1.2);
    s.particles.emit('magic', this.pos.clone().setY(this.pos.y + 0.8), { count: 50, velSpread: 4, color: new THREE.Color(RARITY_COLOR[this.rarity]).getHex(), up: 3 });
    Audio.play('chestOpen');
  }
  update(dt: number) {
    if (this.opened) this.k = Math.min(1, this.k + dt * 3);
    this.lid.rotation.x = -this.k * 1.9;
  }
  dispose() {
    if (this.it) this.session.removeInteractable(this.it);
    super.dispose();
  }
}

/** Level exit portal. Can be locked until an objective completes. */
export class GoalPortal extends Entity {
  locked: boolean;
  private ring: THREE.Mesh;
  private inner: THREE.Mesh;
  private beacon: THREE.Mesh;
  onEnter: (() => void) | null = null;
  constructor(private pos: THREE.Vector3, locked = false, private color = 0x40ffb0) {
    super();
    this.locked = locked;
    this.ring = new THREE.Mesh(cachedGeo('portalRing', () => new THREE.TorusGeometry(1.4, 0.14, 12, 48)), glowMat(color, 3));
    this.inner = new THREE.Mesh(cachedGeo('portalDisk', () => new THREE.CircleGeometry(1.35, 48)), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.beacon = new THREE.Mesh(cachedGeo('beacon', () => new THREE.CylinderGeometry(0.6, 1.4, 40, 16, 1, true).translate(0, 20, 0)), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    const base = new THREE.Mesh(cachedGeo('portalBase', () => new THREE.CylinderGeometry(1.8, 2, 0.3, 24)), M.darkMetal());
    base.position.y = 0.15;
    base.receiveShadow = true;
    this.ring.position.y = this.inner.position.y = 1.9;
    this.obj.add(this.ring, this.inner, this.beacon, base);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    this.setLocked(this.locked);
  }
  setLocked(l: boolean) {
    this.locked = l;
    const c = l ? 0xff3040 : this.color;
    this.ring.material = glowMat(c, 3);
    (this.inner.material as THREE.MeshBasicMaterial).color.set(c);
    (this.beacon.material as THREE.MeshBasicMaterial).color.set(c);
    if (!l && this.session) {
      Audio.play('powerup');
      this.session.particles.emit('magic', this.pos.clone().setY(this.pos.y + 2), { count: 40, color: this.color, velSpread: 5 });
    }
  }
  update(dt: number) {
    const s = this.session;
    const t = s.clock;
    this.ring.rotation.z += dt;
    this.ring.rotation.y = Math.sin(t * 0.7) * 0.3;
    this.inner.rotation.y = this.ring.rotation.y;
    this.inner.scale.setScalar(0.95 + Math.sin(t * 4) * 0.05);
    if (Math.random() < 0.5) s.particles.emit('magic', this.pos.clone().setY(this.pos.y + 1.9 + rand(-1, 1)), { count: 1, color: this.locked ? 0xff3040 : this.color, velSpread: 1, up: 0.5 });
    const d = s.player.pos.distanceTo(this.pos);
    if (d < 1.8 && s.player.pos.y < this.pos.y + 3) {
      if (this.locked) {
        s.hudFlash = 'locked';
        return;
      }
      if (this.onEnter) this.onEnter();
      else s.win();
    }
  }
}

/** Checkpoint flag that stores the respawn point. */
export class Checkpoint extends Entity {
  private flag: THREE.Mesh;
  private active = false;
  constructor(private pos: THREE.Vector3, private yaw = 0) {
    super();
    const pole = new THREE.Mesh(cachedGeo('flagPole', () => new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8).translate(0, 1.3, 0)), M.metal());
    pole.castShadow = true;
    this.flag = new THREE.Mesh(cachedGeo('flagCloth', () => new THREE.PlaneGeometry(0.9, 0.55, 6, 1).translate(0.45, 2.3, 0)), new THREE.MeshStandardMaterial({ color: 0x808890, side: THREE.DoubleSide, emissive: 0x000000 }));
    const base = new THREE.Mesh(cachedGeo('flagBase', () => new THREE.CylinderGeometry(0.4, 0.5, 0.15, 12)), M.darkMetal());
    this.obj.add(pole, this.flag, base);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
  }
  update(dt: number) {
    const s = this.session;
    this.flag.rotation.y = Math.sin(s.clock * 3) * 0.2;
    if (!this.active && s.player.pos.distanceTo(this.pos) < 2) {
      this.active = true;
      const m = this.flag.material as THREE.MeshStandardMaterial;
      m.color.set(0x40ff90);
      m.emissive.set(0x20a050);
      s.setCheckpoint(this.pos.clone().setY(this.pos.y + 0.1), this.yaw);
      s.particles.emit('magic', this.pos.clone().setY(this.pos.y + 2), { count: 30, color: 0x40ff90 });
    }
    void dt;
  }
}

/** Lever / button interactable. */
export class Switch extends Entity {
  on = false;
  private handle: THREE.Mesh;
  private lamp: THREE.Mesh;
  private it!: Interactable;
  constructor(private pos: THREE.Vector3, private onToggle: (on: boolean) => void, private toggleable = false, private label = 'Pull lever', private yaw = 0) {
    super();
    const base = new THREE.Mesh(boxGeo(0.6, 1.1, 0.4), M.darkMetal());
    base.position.y = 0.55;
    base.castShadow = true;
    this.handle = new THREE.Mesh(boxGeo(0.1, 0.6, 0.1), M.metal());
    this.handle.geometry = cachedGeo('leverHandle', () => new THREE.BoxGeometry(0.1, 0.6, 0.1).translate(0, 0.3, 0));
    this.handle.position.set(0, 0.9, 0.22);
    this.handle.rotation.x = 0.6;
    this.lamp = new THREE.Mesh(cachedGeo('lamp', () => new THREE.SphereGeometry(0.08, 8, 6)), glowMat(0xff3030, 3));
    this.lamp.position.set(0, 1.2, 0.1);
    this.obj.add(base, this.handle, this.lamp);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.yaw;
    this.addCollider(makeCollider(this.pos.clone().setY(this.pos.y + 0.55), new THREE.Vector3(0.6, 1.1, 0.6)));
    this.it = s.addInteractable({ pos: this.pos.clone().setY(this.pos.y + 1), radius: 2, prompt: this.label, enabled: true, onInteract: () => this.toggle() });
  }
  toggle() {
    if (this.on && !this.toggleable) return;
    this.set(!this.on);
  }
  set(v: boolean, silent = false) {
    if (this.on === v) return;
    this.on = v;
    this.lamp.material = glowMat(v ? 0x40ff80 : 0xff3030, 3);
    if (!silent) {
      Audio.play('switch', { pos: this.pos });
      this.session.particles.emit('sparks', this.pos.clone().setY(this.pos.y + 1.1), { count: 8 });
    }
    if (!this.toggleable && v) this.it.enabled = false;
    this.onToggle(v);
  }
  update(dt: number) {
    this.handle.rotation.x += ((this.on ? -0.6 : 0.6) - this.handle.rotation.x) * Math.min(1, dt * 10);
  }
  dispose() {
    this.session.removeInteractable(this.it);
    super.dispose();
  }
}

/** Pressure plate — pressed by the player or any crate. */
export class PressurePlate extends Entity {
  pressed = false;
  private top: THREE.Mesh;
  private min: THREE.Vector3;
  private max: THREE.Vector3;
  constructor(private pos: THREE.Vector3, private onChange: (p: boolean) => void, private crateOnly = false, size = 1.6) {
    super();
    this.min = new THREE.Vector3(pos.x - size / 2, pos.y - 0.2, pos.z - size / 2);
    this.max = new THREE.Vector3(pos.x + size / 2, pos.y + 1.2, pos.z + size / 2);
    const rim = new THREE.Mesh(boxGeo(size + 0.2, 0.1, size + 0.2), M.darkMetal());
    this.top = new THREE.Mesh(boxGeo(size, 0.12, size), glowMat(0xb48cff, 1.2));
    this.top.position.y = 0.08;
    this.obj.add(rim, this.top);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
  }
  update() {
    const s = this.session;
    let p = !this.crateOnly && playerOverlaps(s, this.min, this.max);
    if (!p) {
      for (const c of s.physics.colliders) {
        if (c.tag !== 'crate' || !c.enabled) continue;
        const cx = (c.min.x + c.max.x) / 2, cz = (c.min.z + c.max.z) / 2;
        if (cx > this.min.x && cx < this.max.x && cz > this.min.z && cz < this.max.z && c.min.y < this.pos.y + 0.6) {
          p = true;
          break;
        }
      }
    }
    if (p !== this.pressed) {
      this.pressed = p;
      this.top.position.y = p ? 0.02 : 0.08;
      this.top.material = glowMat(p ? 0x40ff80 : 0xb48cff, p ? 2.5 : 1.2);
      Audio.play('switch', { pos: this.pos, pitch: p ? 1 : 0.7 });
      this.onChange(p);
    }
  }
}

/** Invisible trigger volume. */
export class Trigger extends Entity {
  private fired = false;
  constructor(public min: THREE.Vector3, public max: THREE.Vector3, private fn: () => void, private once = true) {
    super();
  }
  init(s: Session) {
    this.session = s;
  }
  update() {
    if (this.fired && this.once) return;
    const inside = playerOverlaps(this.session, this.min, this.max);
    if (inside && !this.fired) {
      this.fired = true;
      this.fn();
    } else if (!inside && !this.once) this.fired = false;
  }
}

/** Cracked wall that hides secret rooms — break it with an attack. */
export class BreakableWall extends Entity implements Damageable {
  center: THREE.Vector3;
  radius: number;
  halfHeight: number;
  team: 'neutral' = 'neutral';
  private col!: Collider;
  private hp = 30;
  private mesh: THREE.Mesh;
  constructor(pos: THREE.Vector3, private size: THREE.Vector3, mat: THREE.Material) {
    super();
    this.center = pos.clone();
    this.radius = Math.max(size.x, size.z) / 2;
    this.halfHeight = size.y / 2;
    this.mesh = new THREE.Mesh(boxGeo(size.x, size.y, size.z, 2), mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    // Crack lines
    const crack = new THREE.Mesh(boxGeo(size.x * 0.7 + 0.02, 0.05, size.z + 0.04), glowMat(0xffe066, 0.8));
    crack.rotation.z = 0.5;
    const crack2 = crack.clone();
    crack2.rotation.z = -0.7;
    crack2.position.y = -0.4;
    this.obj.add(this.mesh, crack, crack2);
  }
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.center);
    this.col = this.addCollider(makeCollider(this.center, this.size));
    s.addDamageable(this);
  }
  takeDamage(h: HitInfo) {
    if (!this.alive) return;
    this.hp -= h.amount;
    const s = this.session;
    s.particles.emit('debris', h.point ?? this.center, { count: 6 });
    Audio.play('hit', { pos: this.center, pitch: 0.6 });
    this.obj.position.x = this.center.x + rand(-0.05, 0.05);
    if (this.hp <= 0) {
      s.particles.emit('debris', this.center, { count: 40, spread: this.size.x / 2, velSpread: 6 });
      s.particles.emit('dust', this.center, { count: 30, spread: this.size.x / 2 });
      Audio.play('break', { pos: this.center });
      s.rig.shake(0.2);
      this.col.enabled = false;
      this.destroy();
    }
  }
  dispose() {
    this.session.removeDamageable(this);
    super.dispose();
  }
}

/** Generic objective item (key, fuse, data drive, relic, wood...). */
export class ObjectiveItem extends Entity {
  private taken = false;
  constructor(private pos: THREE.Vector3, private mesh: THREE.Object3D, private onTake: () => void, private label = 'Pick up', private auto = true, private glowColor = 0xffe066) {
    super();
    this.obj.add(mesh);
  }
  private it: Interactable | null = null;
  init(s: Session) {
    s.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    if (!this.auto) this.it = s.addInteractable({ pos: this.pos, radius: 2, prompt: this.label, enabled: true, onInteract: () => this.take() });
  }
  take() {
    if (this.taken) return;
    this.taken = true;
    Audio.play('pickup');
    this.session.particles.emit('magic', this.pos, { count: 30, color: this.glowColor });
    this.onTake();
    this.destroy();
  }
  update(dt: number) {
    const s = this.session;
    this.mesh.rotation.y += dt * 1.5;
    this.mesh.position.y = Math.sin(s.clock * 2.5) * 0.12;
    if (Math.random() < 0.15) s.particles.emit('magic', this.pos, { count: 1, color: this.glowColor, velSpread: 0.4, up: 0.8 });
    if (this.auto && s.player.center.distanceTo(this.pos) < 1.4) this.take();
  }
  dispose() {
    if (this.it) this.session.removeInteractable(this.it);
    super.dispose();
  }
}

/** Common objective item meshes. */
export const ItemMeshes = {
  key(color = 0xffc830) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.3, emissive: color, emissiveIntensity: 0.4 });
    const ring = new THREE.Mesh(cachedGeo('keyRing', () => new THREE.TorusGeometry(0.16, 0.05, 8, 16)), m);
    ring.position.y = 0.25;
    const shaft = new THREE.Mesh(boxGeo(0.07, 0.45, 0.07), m);
    const tooth = new THREE.Mesh(boxGeo(0.15, 0.06, 0.07), m);
    tooth.position.set(0.08, -0.15, 0);
    g.add(ring, shaft, tooth);
    return g;
  },
  fuse() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(cachedGeo('fuseBody', () => new THREE.CylinderGeometry(0.12, 0.12, 0.45, 12)), new THREE.MeshStandardMaterial({ color: 0x40ff90, emissive: 0x20c060, emissiveIntensity: 1.5, transparent: true, opacity: 0.85 }));
    const caps = [0.25, -0.25].map((y) => {
      const c = new THREE.Mesh(cachedGeo('fuseCap', () => new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12)), M.metal());
      c.position.y = y;
      return c;
    });
    g.add(body, ...caps);
    return g;
  },
  drive() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(boxGeo(0.4, 0.1, 0.28), M.darkMetal()));
    const led = new THREE.Mesh(boxGeo(0.3, 0.02, 0.05), glowMat(0x3dffa2, 3));
    led.position.set(0, 0.06, 0.08);
    g.add(led);
    return g;
  },
  card(color: number) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(boxGeo(0.4, 0.26, 0.03), glowMat(color, 1.5)));
    return g;
  },
  orb(color: number) {
    return new THREE.Mesh(cachedGeo('itemOrb', () => new THREE.IcosahedronGeometry(0.28, 1)), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2, roughness: 0.2 }));
  },
  candle() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(cachedGeo('candle', () => new THREE.CylinderGeometry(0.08, 0.09, 0.35, 10)), new THREE.MeshStandardMaterial({ color: 0xf0e8d0, roughness: 0.6 })));
    return g;
  },
};
