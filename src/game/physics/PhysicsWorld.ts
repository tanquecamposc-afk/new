import { PhysicsConfig } from '@/config/physics';
import { SURFACES, type SurfaceId } from '@/config/surfaces';
import type { BlockDef, CourseData } from '@/game/courses/types';
import { eulerToQuat } from '@/utils/math';
import type { Collider, World } from '@dimforge/rapier3d-compat';
import { CUP_GROUPS, FLOOR_GROUPS, OOB_GROUPS, WALL_GROUPS } from './collisionGroups';
import type { Rapier } from './rapier';

export type ColliderRole = 'floor' | 'wall' | 'out_of_bounds' | 'cup';

export interface ColliderInfo {
  role: ColliderRole;
  surface: SurfaceId;
}

/**
 * Envoltorio del mundo de Rapier: construye los colliders estáticos de un curso
 * a partir de sus datos y permite consultar la superficie de cada collider.
 */
export class PhysicsWorld {
  readonly world: World;
  private info = new Map<number, ColliderInfo>();

  constructor(
    readonly R: Rapier,
    gravity = PhysicsConfig.gravity,
  ) {
    this.world = new R.World({ x: 0, y: gravity, z: 0 });
    this.world.timestep = PhysicsConfig.fixedTimestep;
  }

  setGravity(g: number): void {
    this.world.gravity = { x: 0, y: g, z: 0 };
  }

  buildCourse(course: CourseData): void {
    for (const b of course.surfaces) this.addBlock(b, 'floor', FLOOR_GROUPS);
    for (const b of course.walls) this.addBlock(b, 'wall', WALL_GROUPS);
    for (const b of course.outOfBounds) this.addBlock(b, 'out_of_bounds', OOB_GROUPS);
    this.addCup(course);
  }

  private addBlock(b: BlockDef, role: ColliderRole, collisionGroups: number): Collider {
    const s = SURFACES[b.surface];
    const desc = this.R.ColliderDesc.cuboid(b.size.x / 2, b.size.y / 2, b.size.z / 2)
      .setTranslation(b.center.x, b.center.y, b.center.z)
      .setFriction(s.friction)
      .setRestitution(s.restitution)
      .setRestitutionCombineRule(this.R.CoefficientCombineRule.Max)
      .setCollisionGroups(collisionGroups);
    if (b.rotation) desc.setRotation(eulerToQuat(b.rotation.x, b.rotation.y, b.rotation.z));
    if (role === 'wall') desc.setActiveEvents(this.R.ActiveEvents.COLLISION_EVENTS);
    const c = this.world.createCollider(desc);
    this.info.set(c.handle, { role, surface: b.surface });
    return c;
  }

  /** Fondo de la copa: sólo colisiona con bolas ya capturadas. */
  private addCup(course: CourseData): void {
    const { radius, depth } = PhysicsConfig.hole;
    const p = course.hole.position;
    const desc = this.R.ColliderDesc.cylinder(0.05, radius)
      .setTranslation(p.x, p.y - depth - 0.05, p.z)
      .setFriction(1)
      .setRestitution(0)
      .setCollisionGroups(CUP_GROUPS);
    const c = this.world.createCollider(desc);
    this.info.set(c.handle, { role: 'cup', surface: 'stone' });
  }

  getInfo(collider: Collider | number): ColliderInfo | undefined {
    return this.info.get(typeof collider === 'number' ? collider : collider.handle);
  }

  step(eventQueue?: import('@dimforge/rapier3d-compat').EventQueue): void {
    this.world.step(eventQueue);
  }

  /** Estadística para el panel de depuración. */
  get bodyCount(): number {
    return this.world.bodies.len();
  }

  get colliderCount(): number {
    return this.world.colliders.len();
  }

  free(): void {
    this.world.free();
    this.info.clear();
  }
}
