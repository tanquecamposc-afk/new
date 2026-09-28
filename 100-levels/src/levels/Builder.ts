/**
 * Level construction helpers shared by every world builder.
 */
import * as THREE from 'three';
import type { Session } from './Session';
import { RNG } from '../core/math';
import { boxGeo, glowMat } from '../gfx/Materials';
import { makeCollider, Collider } from '../physics/Physics';
import { Entity } from '../entities/Entity';
import { CoinField, SecretRelic, ChestPickup, GoalPortal, Checkpoint } from '../entities/Pickups';
import { Rarity } from '../data/items';

export interface BoxOpts {
  collide?: boolean;
  shadow?: boolean;
  tile?: number;
  tag?: string;
  friction?: number;
  oneWay?: boolean;
  blocksSight?: boolean;
  rotY?: number;
}

export class Builder {
  readonly coins: CoinField;
  readonly rng: RNG;
  lights = 0;
  goalPortal: GoalPortal | null = null;
  private staticGroup = new THREE.Group();

  constructor(readonly s: Session, seed: number) {
    this.rng = new RNG(seed);
    this.coins = s.add(new CoinField());
    s.scene.add(this.staticGroup);
  }

  /** Box by centre + size; adds a collider unless collide === false. */
  box(center: THREE.Vector3, size: THREE.Vector3, mat: THREE.Material, o: BoxOpts = {}): { mesh: THREE.Mesh; col: Collider | null } {
    const mesh = new THREE.Mesh(boxGeo(size.x, size.y, size.z, o.tile ?? 4), mat);
    mesh.position.copy(center);
    if (o.rotY) mesh.rotation.y = o.rotY;
    mesh.castShadow = o.shadow !== false;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.staticGroup.add(mesh);
    let col: Collider | null = null;
    if (o.collide !== false) {
      col = makeCollider(center, size, { tag: o.tag, friction: o.friction, oneWay: o.oneWay, blocksSight: o.blocksSight });
      this.s.physics.add(col);
    }
    return { mesh, col };
  }

  /** Platform whose top surface is at `top`. */
  plat(x: number, top: number, z: number, w: number, d: number, mat: THREE.Material, h = 1, o: BoxOpts = {}) {
    return this.box(new THREE.Vector3(x, top - h / 2, z), new THREE.Vector3(w, h, d), mat, o);
  }

  /** Invisible collider (level bounds, invisible walls). */
  invisible(center: THREE.Vector3, size: THREE.Vector3, tag = 'bound') {
    const c = makeCollider(center, size, { tag, blocksSight: false });
    this.s.physics.add(c);
    return c;
  }

  deco(o: THREE.Object3D, isStatic = true) {
    if (isStatic) {
      o.traverse((c) => {
        c.matrixAutoUpdate = false;
        c.updateMatrix();
      });
    }
    this.s.scene.add(o);
    return o;
  }

  mesh(geo: THREE.BufferGeometry, mat: THREE.Material, pos: THREE.Vector3, rot?: THREE.Euler, scale?: THREE.Vector3, shadow = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    if (rot) m.rotation.copy(rot);
    if (scale) m.scale.copy(scale);
    m.castShadow = shadow;
    m.receiveShadow = true;
    this.deco(m);
    return m;
  }

  /** Limited number of static point lights (keeps shader cost bounded). */
  light(pos: THREE.Vector3, color: THREE.ColorRepresentation, intensity = 20, dist = 18, shadow = false) {
    if (this.lights >= 6) return null;
    this.lights++;
    const l = new THREE.PointLight(color, intensity, dist, 2);
    l.position.copy(pos);
    l.castShadow = shadow && this.s.engine.quality === 'high';
    if (l.castShadow) l.shadow.mapSize.set(512, 512);
    this.s.scene.add(l);
    return l;
  }

  /** Visible glowing lamp mesh (cheap: no real light). */
  lamp(pos: THREE.Vector3, color: THREE.ColorRepresentation, size = 0.25, withLight = false, intensity = 15) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 8), glowMat(color, 3));
    m.position.copy(pos);
    this.s.scene.add(m);
    if (withLight) this.light(pos, color, intensity, 14);
    return m;
  }

  neon(a: THREE.Vector3, b: THREE.Vector3, color: THREE.ColorRepresentation, thickness = 0.08) {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(boxGeo(thickness, thickness, len, 1), glowMat(color, 3));
    m.position.copy(a).lerp(b, 0.5);
    m.lookAt(b);
    this.deco(m);
    return m;
  }

  instanced(geo: THREE.BufferGeometry, mat: THREE.Material, items: { pos: THREE.Vector3; rot?: THREE.Euler; scale?: THREE.Vector3 }[], shadow = true) {
    if (!items.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    items.forEach((it, i) => {
      q.setFromEuler(it.rot ?? new THREE.Euler());
      m.compose(it.pos, q, it.scale ?? new THREE.Vector3(1, 1, 1));
      im.setMatrixAt(i, m);
    });
    im.castShadow = shadow;
    im.receiveShadow = true;
    im.computeBoundingSphere();
    this.s.scene.add(im);
    return im;
  }

  add<T extends Entity>(e: T): T {
    return this.s.add(e);
  }

  coin(x: number, y: number, z: number) {
    this.coins.add(new THREE.Vector3(x, y, z));
  }

  goal(pos: THREE.Vector3, locked = false, color?: number) {
    this.goalPortal = this.add(new GoalPortal(pos, locked, color));
    return this.goalPortal;
  }

  checkpoint(pos: THREE.Vector3, yaw = 0) {
    return this.add(new Checkpoint(pos, yaw));
  }

  /** Secret relic for this level (only if the level has one). */
  secret(pos: THREE.Vector3) {
    if (!this.s.meta.hasSecret) return null;
    return this.add(new SecretRelic('relic-' + this.s.meta.id, pos));
  }

  chest(r: Rarity, pos: THREE.Vector3, yaw = 0) {
    return this.add(new ChestPickup(r, pos, yaw));
  }

  finalize() {
    this.coins.finalize();
  }
}
