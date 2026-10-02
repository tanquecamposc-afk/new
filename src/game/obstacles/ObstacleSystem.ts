import { SURFACES } from '@/config/surfaces';
import type { Collider, RigidBody } from '@dimforge/rapier3d-compat';
import type { PhysicsWorld } from '@/game/physics/PhysicsWorld';
import { OBSTACLE_GROUPS } from '@/game/physics/collisionGroups';
import { obstacleBoxes, obstaclePose } from './poses';
import type { ObstacleDef } from './types';

interface Entry {
  def: ObstacleDef;
  body: RigidBody;
}

/**
 * Crea los obstáculos en Rapier. Los dinámicos son cuerpos cinemáticos
 * controlados por posición: Rapier calcula su velocidad a partir del objetivo,
 * así que empujan y golpean la bola con física real (no teletransporte).
 */
export class ObstacleSystem {
  private entries: Entry[] = [];

  constructor(physics: PhysicsWorld, defs: readonly ObstacleDef[]) {
    const R = physics.R;
    for (const def of defs) {
      const pose = obstaclePose(def, 0);
      const desc = def.kind === 'bumper' ? R.RigidBodyDesc.fixed() : R.RigidBodyDesc.kinematicPositionBased();
      const body = physics.world.createRigidBody(desc.setTranslation(pose.position.x, pose.position.y, pose.position.z).setRotation(pose.rotation));
      const colliders: Collider[] = [];
      if (def.kind === 'bumper') {
        const s = SURFACES.bumper;
        colliders.push(
          physics.world.createCollider(
            R.ColliderDesc.cylinder(def.height / 2, def.radius)
              .setRestitution(s.restitution)
              .setRestitutionCombineRule(R.CoefficientCombineRule.Max)
              .setFriction(s.friction)
              .setCollisionGroups(OBSTACLE_GROUPS)
              .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
            body,
          ),
        );
      }
      const wood = SURFACES.wood;
      for (const b of obstacleBoxes(def)) {
        colliders.push(
          physics.world.createCollider(
            R.ColliderDesc.cuboid(b.half.x, b.half.y, b.half.z)
              .setTranslation(b.offset.x, b.offset.y, b.offset.z)
              .setRotation(b.rotation)
              .setRestitution(wood.restitution)
              .setRestitutionCombineRule(R.CoefficientCombineRule.Max)
              .setFriction(wood.friction)
              .setCollisionGroups(OBSTACLE_GROUPS)
              .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
            body,
          ),
        );
      }
      for (const c of colliders) physics.registerCollider(c, { role: 'obstacle', surface: def.kind === 'bumper' ? 'bumper' : 'wood', obstacleId: def.id });
      this.entries.push({ def, body });
    }
  }

  /** Fija el objetivo cinemático para el final del próximo paso (tiempo `t`). */
  setTarget(t: number): void {
    for (const e of this.entries) {
      if (e.def.kind === 'bumper') continue;
      const p = obstaclePose(e.def, t);
      e.body.setNextKinematicTranslation(p.position);
      e.body.setNextKinematicRotation(p.rotation);
    }
  }

  /** Coloca los obstáculos directamente en el instante `t` (inicio de una predicción). */
  teleport(t: number): void {
    for (const e of this.entries) {
      if (e.def.kind === 'bumper') continue;
      const p = obstaclePose(e.def, t);
      e.body.setTranslation(p.position, true);
      e.body.setRotation(p.rotation, true);
    }
  }

  get count(): number {
    return this.entries.length;
  }
}
