/**
 * Base entity + shared gameplay interfaces.
 */
import * as THREE from 'three';
import type { Session } from '../levels/Session';
import type { Collider } from '../physics/Physics';

export type Element = 'fire' | 'ice' | 'electric' | 'void' | 'shadow' | 'poison' | 'physical';

export interface HitInfo {
  amount: number;
  dir: THREE.Vector3;
  knockback: number;
  source: 'player' | 'enemy' | 'env';
  element?: Element;
  heavy?: boolean;
  point?: THREE.Vector3;
  /** Projectile / beam hits don't count for melee combos. */
  ranged?: boolean;
}

export interface Damageable {
  /** Centre of the hit volume. */
  center: THREE.Vector3;
  radius: number;
  halfHeight: number;
  alive: boolean;
  team: 'enemy' | 'neutral';
  takeDamage(h: HitInfo): void;
  /** Precision targets / shootables use this to ignore melee. */
  rangedOnly?: boolean;
  /** Lock-on priority (bosses > enemies). */
  priority?: number;
}

export interface Interactable {
  pos: THREE.Vector3;
  radius: number;
  prompt: string;
  enabled: boolean;
  /** Seconds the key must be held. */
  hold?: number;
  onInteract(): void;
}

export abstract class Entity {
  session!: Session;
  alive = true;
  readonly obj = new THREE.Group();
  protected colliders: Collider[] = [];
  protected disposables: { dispose(): void }[] = [];

  /** Called once when added to the session. */
  init(_s: Session): void {}
  update(_dt: number): void {}

  protected addCollider(c: Collider) {
    this.colliders.push(c);
    this.session.physics.add(c);
    return c;
  }

  destroy() {
    this.alive = false;
  }

  dispose() {
    for (const c of this.colliders) this.session.physics.remove(c);
    this.colliders = [];
    this.obj.removeFromParent();
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }
}
