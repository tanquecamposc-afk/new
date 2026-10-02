import { PhysicsConfig } from '@/config/physics';
import { SURFACES, type SurfaceId } from '@/config/surfaces';
import { BALL_IN_CUP_GROUPS, GROUND_QUERY_GROUPS, ballGroups } from '@/game/physics/collisionGroups';
import type { PhysicsWorld } from '@/game/physics/PhysicsWorld';
import { copyVec, horizontalLength, type Vec3 } from '@/utils/math';
import type { Collider, RigidBody } from '@dimforge/rapier3d-compat';

export type BallPhase = 'rest' | 'moving' | 'captured' | 'in_hole' | 'hazard';

export type BallStepOutcome = 'stopped' | 'holed' | 'water' | 'out_of_bounds' | 'timeout' | 'disturbed' | null;

export interface GroundContact {
  surface: SurfaceId;
  role: string;
  boost?: { direction: { x: number; z: number }; accel: number; maxSpeed: number };
  normal: Vec3;
  distance: number;
}

/** Fracción del peso que resiste en pendiente para una esfera maciza que rueda sin deslizar. */
const ROLLING_GRAVITY_FACTOR = 5 / 7;

/**
 * Bola física. Rapier resuelve gravedad, colisiones, rebotes y rodadura por
 * fricción; esta clase añade lo que un motor rígido no modela: resistencia a
 * la rodadura por superficie, detección de parada, captura en la copa y
 * detección de hazards.
 */
export class Ball {
  readonly body: RigidBody;
  readonly collider: Collider;
  phase: BallPhase = 'rest';
  ground: GroundContact | null = null;

  /** Posiciones de los dos últimos pasos fijos (interpolación del render). */
  readonly prevPosition: Vec3;
  readonly position: Vec3;
  readonly velocity: Vec3 = { x: 0, y: 0, z: 0 };

  private settleTimer = 0;
  private movingTime = 0;
  private readonly cfg = PhysicsConfig;

  constructor(
    private readonly physics: PhysicsWorld,
    spawn: Vec3,
    readonly collideWithBalls = false,
  ) {
    const R = physics.R;
    const b = this.cfg.ball;
    this.body = physics.world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(spawn.x, spawn.y, spawn.z)
        .setLinearDamping(b.linearDamping)
        .setAngularDamping(b.angularDamping)
        .setCcdEnabled(b.ccd)
        .setCanSleep(true),
    );
    const volume = (4 / 3) * Math.PI * b.radius ** 3;
    this.collider = physics.world.createCollider(
      R.ColliderDesc.ball(b.radius)
        .setDensity(b.mass / volume)
        .setFriction(b.friction)
        .setRestitution(b.restitution)
        .setCollisionGroups(ballGroups(collideWithBalls))
        .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
      this.body,
    );
    this.position = copyVec(spawn);
    this.prevPosition = copyVec(spawn);
  }

  get speed(): number {
    return Math.hypot(this.velocity.x, this.velocity.y, this.velocity.z);
  }

  get isMoving(): boolean {
    return this.phase === 'moving' || this.phase === 'captured';
  }

  /** Aplica el impulso del golpe. `direction` es un vector unitario en XZ. */
  launch(direction: { x: number; z: number }, power: number): void {
    const speed = power * this.cfg.shot.maxSpeed;
    const m = this.body.mass();
    this.body.wakeUp();
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    // Impulso real (J = m·v): la bola sale por física, no por animación.
    this.body.applyImpulse({ x: direction.x * speed * m, y: 0, z: direction.z * speed * m }, true);
    this.phase = 'moving';
    this.settleTimer = 0;
    this.movingTime = 0;
  }

  /** Coloca la bola en reposo en una posición (reset / spawn / tras hazard). */
  placeAt(p: Vec3): void {
    this.body.setTranslation(p, false);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, false);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
    this.collider.setCollisionGroups(ballGroups(this.collideWithBalls));
    this.body.sleep();
    this.phase = 'rest';
    this.settleTimer = 0;
    this.movingTime = 0;
    Object.assign(this.position, p);
    Object.assign(this.prevPosition, p);
    this.velocity.x = this.velocity.y = this.velocity.z = 0;
  }

  /** Coloca la bola ya embocada en el fondo de la copa (resincronización con el servidor). */
  placeInCup(hole: Vec3): void {
    const p = { x: hole.x, y: hole.y - this.cfg.hole.depth + this.cfg.ball.radius, z: hole.z };
    this.placeAt(p);
    this.collider.setCollisionGroups(BALL_IN_CUP_GROUPS);
    this.phase = 'in_hole';
  }

  /** Lógica previa al paso de Rapier: suelo, rodadura y captura en la copa. */
  preStep(dt: number, hole: Vec3): void {
    if (this.phase !== 'moving' && this.phase !== 'captured') return;
    this.ground = this.probeGround();

    if (this.phase === 'captured') {
      this.guideIntoCup(hole);
      return;
    }

    if (this.ground) {
      const s = SURFACES[this.ground.surface];
      this.applyRollingResistance(s.rollingResistance * dt);
      if (s.accelerationModifier !== 0) this.applySpeedModifier(1 + s.accelerationModifier * dt);
      if (this.ground.boost) this.applyBoost(this.ground.boost, dt);
    }
    this.checkHoleCapture(hole, dt);
  }

  /** Lógica posterior al paso: sincroniza estado y detecta resultados del tiro. */
  postStep(dt: number, hole: Vec3, killY: number): BallStepOutcome {
    const t = this.body.translation();
    const v = this.body.linvel();
    Object.assign(this.prevPosition, this.position);
    this.position.x = t.x;
    this.position.y = t.y;
    this.position.z = t.z;
    this.velocity.x = v.x;
    this.velocity.y = v.y;
    this.velocity.z = v.z;

    if (this.phase === 'captured') {
      if (t.y < hole.y - this.cfg.ball.radius) {
        this.phase = 'in_hole';
        return 'holed';
      }
      return null;
    }
    if (this.phase === 'in_hole') {
      // Deja que termine de caer y luego la duerme en el fondo de la copa.
      if (this.speed < 0.05) this.body.sleep();
      return null;
    }
    if (this.phase === 'rest') {
      // Un obstáculo (o una bola) ha empujado a la bola parada.
      if (Math.hypot(v.x, v.y, v.z) > this.cfg.stop.linearThreshold * 3) {
        this.phase = 'moving';
        this.settleTimer = 0;
        this.movingTime = 0;
        return 'disturbed';
      }
      return null;
    }
    if (this.phase !== 'moving') return null;

    this.movingTime += dt;
    if (t.y < killY) return this.enterHazard('out_of_bounds');
    if (this.ground) {
      if (this.ground.role === 'out_of_bounds') return this.enterHazard('out_of_bounds');
      if (SURFACES[this.ground.surface].hazardType === 'water') return this.enterHazard('water');
    }
    if (this.checkStopped(dt)) return 'stopped';
    if (this.movingTime > this.cfg.stop.maxShotDuration) {
      this.freeze();
      return 'timeout';
    }
    return null;
  }

  private enterHazard(kind: 'water' | 'out_of_bounds'): BallStepOutcome {
    this.phase = 'hazard';
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, false);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
    this.body.sleep();
    return kind;
  }

  private probeGround(): GroundContact | null {
    const R = this.physics.R;
    const r = this.cfg.ball.radius;
    const t = this.body.translation();
    const ray = new R.Ray({ x: t.x, y: t.y, z: t.z }, { x: 0, y: -1, z: 0 });
    const hit = this.physics.world.castRayAndGetNormal(
      ray,
      r + this.cfg.world.groundProbe,
      true,
      undefined,
      GROUND_QUERY_GROUPS,
      this.collider,
      this.body,
    );
    if (!hit) return null;
    const info = this.physics.getInfo(hit.collider);
    if (!info) return null;
    return { surface: info.surface, role: info.role, boost: info.boost, normal: { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z }, distance: hit.timeOfImpact };
  }

  /** Resistencia a la rodadura: reduce la velocidad lineal y angular en la misma proporción. */
  private applyRollingResistance(deltaV: number): void {
    const v = this.body.linvel();
    const speed = Math.hypot(v.x, v.y, v.z);
    if (speed <= 1e-6) return;
    this.applySpeedModifier(Math.max(0, speed - deltaV) / speed);
  }

  /**
   * Acelerador: suma velocidad en la dirección de la zona (aceleración
   * controlada y acotada, nunca teletransporte). La rodadura se ajusta para
   * que la bola no derrape.
   */
  private applyBoost(boost: NonNullable<GroundContact['boost']>, dt: number): void {
    const v = this.body.linvel();
    const along = v.x * boost.direction.x + v.z * boost.direction.z;
    if (along >= boost.maxSpeed) return;
    const dv = Math.min(boost.accel * dt, boost.maxSpeed - along);
    const nx = v.x + boost.direction.x * dv;
    const nz = v.z + boost.direction.z * dv;
    this.body.setLinvel({ x: nx, y: v.y, z: nz }, true);
    const r = this.cfg.ball.radius;
    // ω = (up × v) / r para una esfera que rueda sin deslizar.
    this.body.setAngvel({ x: nz / r, y: 0, z: -nx / r }, true);
  }

  private applySpeedModifier(scale: number): void {
    const v = this.body.linvel();
    const w = this.body.angvel();
    this.body.setLinvel({ x: v.x * scale, y: v.y * scale, z: v.z * scale }, true);
    this.body.setAngvel({ x: w.x * scale, y: w.y * scale, z: w.z * scale }, true);
  }

  /**
   * Captura en la copa. Si el centro de la bola está sobre la boca y va lo
   * bastante lenta, deja de colisionar con el green y cae por gravedad. Si va
   * demasiado rápida "salta" el hoyo. En el borde, una pequeña atracción
   * simula la caída del labio.
   */
  private checkHoleCapture(hole: Vec3, dt: number): void {
    const { radius, captureSpeed, lipPull } = this.cfg.hole;
    const r = this.cfg.ball.radius;
    const t = this.body.translation();
    if (t.y > hole.y + r + 0.12) return;
    const dx = hole.x - t.x;
    const dz = hole.z - t.z;
    const d = Math.hypot(dx, dz);
    const v = this.body.linvel();
    const hs = Math.hypot(v.x, v.z);
    if (hs > captureSpeed) return;

    if (d < radius) {
      this.phase = 'captured';
      this.collider.setCollisionGroups(BALL_IN_CUP_GROUPS);
      // El labio frena la bola al caer.
      this.body.setLinvel({ x: v.x * 0.5, y: Math.min(v.y, 0), z: v.z * 0.5 }, true);
    } else if (d < radius + r * 0.8 && d > 1e-4) {
      const k = lipPull * dt;
      this.body.setLinvel({ x: v.x + (dx / d) * k, y: v.y, z: v.z + (dz / d) * k }, true);
    }
  }

  /** Mantiene la bola dentro del cilindro de la copa mientras cae. */
  private guideIntoCup(hole: Vec3): void {
    const t = this.body.translation();
    const v = this.body.linvel();
    const maxOffset = this.cfg.hole.radius - this.cfg.ball.radius;
    const dx = t.x - hole.x;
    const dz = t.z - hole.z;
    const d = Math.hypot(dx, dz);
    let vx = v.x * 0.9;
    let vz = v.z * 0.9;
    if (d > maxOffset * 0.6) {
      vx -= (dx / d) * 2;
      vz -= (dz / d) * 2;
    }
    this.body.setLinvel({ x: vx, y: v.y, z: vz }, true);
  }

  private checkStopped(dt: number): boolean {
    const st = this.cfg.stop;
    const g = this.ground;
    if (!g) {
      this.settleTimer = 0;
      return false;
    }
    const s = SURFACES[g.surface];
    const v = this.body.linvel();
    const w = this.body.angvel();
    const speed = Math.hypot(v.x, v.y, v.z);
    const ang = Math.hypot(w.x, w.y, w.z);
    const slopeAccel = Math.abs(PhysicsConfig.gravity) * Math.sqrt(Math.max(0, 1 - g.normal.y * g.normal.y));
    const canRest = slopeAccel * ROLLING_GRAVITY_FACTOR < s.rollingResistance * st.restSlopeFactor;
    const slow = speed < st.linearThreshold * s.stopThreshold && ang < st.angularThreshold * s.stopThreshold;

    if (slow && canRest) {
      this.settleTimer += dt;
      if (this.settleTimer >= st.settleTime) {
        this.freeze();
        return true;
      }
    } else {
      this.settleTimer = 0;
    }
    return false;
  }

  private freeze(): void {
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, false);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
    this.body.sleep();
    this.phase = 'rest';
    this.settleTimer = 0;
    this.velocity.x = this.velocity.y = this.velocity.z = 0;
  }

  horizontalSpeed(): number {
    return horizontalLength(this.velocity);
  }

  dispose(): void {
    this.physics.world.removeRigidBody(this.body);
  }
}
