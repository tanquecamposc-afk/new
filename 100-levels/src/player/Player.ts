/**
 * Player controller: 3D movement with acceleration, gravity, coyote time, jump
 * buffering, air control, crouch, sprint, dodge roll; stats (HP / stamina /
 * energy); melee + ranged combat; context abilities; interaction; equipment.
 */
import * as THREE from 'three';
import { CharacterModel } from './CharacterModel';
import { Animator } from './Animator';
import { Input } from '../core/Input';
import { clamp, dampAngle, rand, wrapAngle } from '../core/math';
import { MoveResult } from '../physics/Physics';
import { WEAPONS, WeaponDef, buildWeapon } from '../combat/Weapons';
import { Audio } from '../audio/AudioManager';
import { Trail } from '../gfx/Effects';
import { itemById } from '../data/items';
import type { Session } from '../levels/Session';
import type { Interactable } from '../entities/Entity';
import { Combat } from '../combat/Combat';

export type AbilityMode = 'weapon' | 'airdash' | 'pulse' | 'flash' | 'throw' | 'none';

const STAND = new THREE.Vector3(0.32, 0.88, 0.32);
const CROUCH = new THREE.Vector3(0.32, 0.55, 0.32);

export interface Equipment {
  skin: string;
  weapon: string;
  aura: string | null;
  trail: string | null;
  jump: string | null;
  attack: string | null;
}

export class Player {
  readonly model: CharacterModel;
  readonly anim: Animator;
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  yaw = 0;
  half = STAND.clone();
  grounded = false;
  private wasGrounded = false;
  private moveRes: MoveResult = { grounded: false, ground: null, hitCeiling: false, hitWall: false, wallNormal: new THREE.Vector3() };
  ground: MoveResult['ground'] = null;

  hp = 100;
  maxHp = 100;
  stamina = 100;
  energy = 30;
  private staminaDelay = 0;
  invuln = 0;
  dead = false;
  crouching = false;
  sprinting = false;
  hidden = false;
  controlEnabled = true;
  /** When false the player can't attack (puzzle/parkour worlds allow it though). */
  combatEnabled = true;
  abilityMode: AbilityMode = 'weapon';
  gravityScale = 1;
  speedMul = 1;
  jumpMul = 1;
  /** Extra velocity from conveyors / wind / tornadoes (applied each frame then cleared). */
  externalVel = new THREE.Vector3();

  private coyote = 0;
  private jumpBuffer = 0;
  private jumpCut = false;
  private dodgeT = 0;
  private dodgeDir = new THREE.Vector3();
  private airDashT = 0;
  private attackT = 0;
  private comboIdx = 0;
  private comboWindow = 0;
  private queuedAttack = false;
  private lockYaw: number | null = null;
  private stunT = 0;
  aiming = false;
  /** Level logic can force the aiming stance (precision world). */
  forceAim = false;
  private bowCharge = 0;
  private interactHold = 0;
  private holdTarget: Interactable | null = null;
  currentInteract: Interactable | null = null;
  jumps = 0;

  weapon: WeaponDef = WEAPONS.wpn_sword;
  ownedWeapons: string[] = ['wpn_sword'];
  private weaponTip: THREE.Object3D | null = null;
  private weaponTrail: Trail | null = null;
  private bodyTrail: Trail | null = null;
  equip: Equipment;
  private auraT = 0;
  private stepT = 0;
  potions = 0;
  hasRevive = false;
  private speed2d = 0;
  private turnRate = 0;
  private lastYaw = 0;
  /** Called with the landing speed for level logic (fall damage, landing pads). */
  onLand: ((impact: number) => void) | null = null;

  constructor(private s: Session, equip: Equipment, owned: string[]) {
    this.equip = equip;
    this.model = new CharacterModel(equip.skin);
    this.anim = new Animator(this.model);
    this.anim.onStep = () => this.footstep();
    this.ownedWeapons = owned.filter((id) => WEAPONS[id]);
    if (!this.ownedWeapons.length) this.ownedWeapons = ['wpn_sword'];
    this.setWeapon(WEAPONS[equip.weapon] ? equip.weapon : this.ownedWeapons[0]);
    s.scene.add(this.model.root);
    if (equip.trail) {
      const it = itemById(equip.trail);
      const col = equip.trail === 'fx_trail_rainbow' ? 'rainbow' : it?.color ?? '#00f0ff';
      this.bodyTrail = new Trail(this.model.root, col, 0.22, 26, 0.95);
      s.fx.addTrail(this.bodyTrail);
    }
  }

  setWeapon(id: string) {
    const def = WEAPONS[id];
    if (!def) return;
    this.weapon = def;
    const w = buildWeapon(id);
    this.model.setWeapon(w.right, w.left);
    this.weaponTip = w.tip;
    if (this.weaponTrail) {
      this.s.fx.removeTrail(this.weaponTrail);
      this.weaponTrail = null;
    }
    if (w.tip && def.kind === 'melee') {
      const atk = this.equip.attack ? itemById(this.equip.attack)?.color : null;
      this.weaponTrail = new Trail(w.tip, atk ?? '#' + new THREE.Color(def.color).getHexString(), 0.14, 14, 0);
      this.weaponTrail.enabled = false;
      this.s.fx.addTrail(this.weaponTrail);
    }
    this.aiming = false;
  }

  spawn(p: THREE.Vector3, yaw: number) {
    this.pos.copy(p);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.lastYaw = yaw;
    this.model.root.position.copy(p);
    this.model.root.rotation.y = yaw;
  }

  get center() {
    return new THREE.Vector3(this.pos.x, this.pos.y + this.half.y, this.pos.z);
  }
  get headPos() {
    return new THREE.Vector3(this.pos.x, this.pos.y + this.half.y * 2 - 0.1, this.pos.z);
  }
  get facing() {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }
  get isDodging() {
    return this.dodgeT > 0;
  }
  get isAttacking() {
    return this.attackT > 0;
  }
  get speed() {
    return this.speed2d;
  }

  heal(n: number) {
    this.hp = Math.min(this.maxHp, this.hp + n);
    this.s.particles.emit('heal', this.center);
    Audio.play('powerup');
  }

  /** Apply damage. Returns true if damage was taken. */
  damage(amount: number, from?: THREE.Vector3, knock = 6): boolean {
    if (this.dead || this.invuln > 0 || this.dodgeT > 0.08 || this.s.state !== 'playing') return false;
    if (this.s.muts.has('onelife')) amount = 9999;
    this.hp -= amount;
    this.invuln = 0.6;
    this.s.onPlayerDamaged(amount, from);
    if (from) {
      const d = new THREE.Vector3().subVectors(this.pos, from).setY(0).normalize();
      this.vel.x += d.x * knock;
      this.vel.z += d.z * knock;
      this.vel.y = Math.max(this.vel.y, knock * 0.4);
    }
    this.model.flash(0.15);
    this.anim.play('hit', 1.2);
    this.attackT = 0;
    Audio.play('hurt');
    this.s.particles.emit('blood', this.center, { count: 8 });
    if (this.hp <= 0) {
      if (this.hasRevive && !this.s.muts.has('onelife')) {
        this.hasRevive = false;
        this.s.consumeRevive();
        this.hp = this.maxHp * 0.5;
        this.invuln = 2;
        this.s.particles.emit('fire', this.center, { count: 60, velSpread: 4 });
        this.s.fx.flash(this.center, 0xffb030, 40, 0.6);
        this.s.post.flashScreen(0xffc060, 0.6);
        Audio.play('powerup');
        this.s.toast('🪶', 'PHOENIX FEATHER', 'You rise again!');
      } else this.die();
    }
    return true;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.hp = 0;
    this.anim.play('death');
    this.aiming = false;
    Audio.play('death');
    this.s.onPlayerDeath();
  }

  stun(t: number) {
    this.stunT = Math.max(this.stunT, t);
  }

  impulse(v: THREE.Vector3) {
    this.vel.copy(v);
    if (v.y > 0) {
      this.grounded = false;
      this.coyote = 0;
    }
  }

  private footstep() {
    const k = this.sprinting ? 1 : 0.7;
    Audio.play('step', { vol: k * (this.crouching ? 0.3 : 1), throttle: 0.12 });
    if (this.sprinting || this.speed2d > 6) this.s.particles.emit('dust', this.pos, { count: 3, velSpread: 1 });
    if (!this.crouching) this.s.emitNoise(this.pos, this.sprinting ? 9 : 4);
  }

  private jump() {
    this.vel.y = 10.4 * this.jumpMul;
    this.grounded = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumpCut = false;
    this.jumps++;
    Audio.play('jump', { throttle: 0.05 });
    this.s.particles.emit('dust', this.pos, { count: 6 });
    this.s.stats.jumps++;
    const je = this.equip.jump;
    if (je === 'fx_jump_spark') this.s.particles.emit('sparks', this.pos, { count: 18, up: 1, color: 0xffe066 });
    else if (je === 'fx_jump_ring') this.s.fx.shockwave(this.pos, 2.2, 0x3dffa2, 0.4);
    else if (je === 'fx_jump_flame') this.s.particles.emit('fire', this.pos, { count: 26, up: -1, velSpread: 2 });
  }

  update(dt: number) {
    const s = this.s;
    const playing = s.state === 'playing' && this.controlEnabled && !this.dead && !s.rig.inCinematic;
    this.invuln = Math.max(0, this.invuln - dt);
    this.stunT = Math.max(0, this.stunT - dt);

    // ── Carry on moving platforms
    if (this.grounded && this.ground && (this.ground.delta.x || this.ground.delta.y || this.ground.delta.z)) {
      this.pos.add(this.ground.delta);
    }
    s.physics.depenetrate(this.pos, this.half);

    // ── Input
    const axis = playing && this.stunT <= 0 && !this.hidden ? Input.moveAxis() : { x: 0, y: 0 };
    const camF = s.rig.forward();
    const camR = s.rig.right();
    const wish = new THREE.Vector3().addScaledVector(camF, axis.y).addScaledVector(camR, axis.x);
    const wishLen = Math.min(1, wish.length());
    if (wishLen > 0.01) wish.normalize();

    // Crouch (hold)
    const wantCrouch = playing && Input.isDown('crouch') && this.grounded;
    if (wantCrouch !== this.crouching) {
      if (wantCrouch) {
        this.crouching = true;
        this.half.copy(CROUCH);
      } else if (!s.physics.blocked(this.pos.x, this.pos.y + 0.02, this.pos.z, STAND)) {
        this.crouching = false;
        this.half.copy(STAND);
      }
    }

    // Sprint
    this.sprinting = playing && Input.isDown('sprint') && wishLen > 0.3 && !this.crouching && this.stamina > 1 && !this.aiming;
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - 16 * dt);
      this.staminaDelay = 0.7;
    }

    // Timers
    this.coyote = this.grounded ? 0.12 : Math.max(0, this.coyote - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (playing && Input.wasPressed('jump')) this.jumpBuffer = 0.13;
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    if (this.comboWindow <= 0 && this.attackT <= 0) this.comboIdx = 0;

    // Stamina / energy regen
    this.staminaDelay -= dt;
    if (this.staminaDelay <= 0) this.stamina = Math.min(100, this.stamina + 32 * dt);
    const eRegen = this.abilityMode === 'airdash' ? 22 : this.abilityMode === 'pulse' || this.abilityMode === 'throw' ? 14 : this.abilityMode === 'flash' ? 6 : 2.5;
    this.energy = Math.min(100, this.energy + eRegen * dt);

    // ── Actions
    if (playing && this.stunT <= 0 && !this.hidden) {
      this.handleCombat(dt, wish, wishLen);
      if (Input.wasPressed('dodge')) this.tryDodge(wish, wishLen);
      if (Input.wasPressed('ability')) this.useAbility();
      if (Input.wasPressed('w1')) this.cycleWeapon(0);
      if (Input.wasPressed('w2')) this.cycleWeapon(1);
      if (Input.wasPressed('w3')) this.cycleWeapon(2);
      if (Input.wasPressed('w4')) this.cycleWeapon(3);
      if (Input.wasPressed('w5')) this.cycleWeapon(4);
      if (Input.wasPressed('w6')) this.cycleWeapon(5);
    }
    if (playing) this.handleInteract(dt);
    else this.currentInteract = null;

    // ── Horizontal movement
    let maxSpeed = (this.crouching ? 2.5 : this.sprinting ? 8.6 : 5.4) * this.speedMul;
    if (this.attackT > 0) maxSpeed *= 0.3;
    if (this.aiming) maxSpeed = Math.min(maxSpeed, 2.6);
    const friction = this.ground?.friction ?? 1;
    const desired = wish.clone().multiplyScalar(maxSpeed * wishLen);
    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      const k = Math.max(0, this.dodgeT / 0.5);
      this.vel.x = this.dodgeDir.x * (5 + 10 * k);
      this.vel.z = this.dodgeDir.z * (5 + 10 * k);
    } else if (this.airDashT > 0) {
      this.airDashT -= dt;
    } else {
      const hv = new THREE.Vector3(this.vel.x, 0, this.vel.z);
      const accelerating = desired.lengthSq() > hv.lengthSq() * 0.9;
      let accel = this.grounded ? (accelerating ? 48 : 34) : 13;
      if (this.grounded && friction < 1) accel *= friction;
      const diff = desired.sub(hv);
      const dl = diff.length();
      const step = accel * dt;
      if (dl > step) diff.multiplyScalar(step / dl);
      this.vel.x += diff.x;
      this.vel.z += diff.z;
    }

    // ── Vertical
    if (this.jumpBuffer > 0 && this.coyote > 0 && !this.crouching && this.dodgeT <= 0 && playing) this.jump();
    if (!Input.isDown('jump') && this.vel.y > 3 && !this.jumpCut && !this.grounded) {
      this.vel.y *= 0.55;
      this.jumpCut = true;
    }
    const g = s.physics.gravity * this.gravityScale * (this.vel.y < 0 ? 1.3 : 1);
    if (this.airDashT <= 0) this.vel.y += g * dt;
    this.vel.y = Math.max(this.vel.y, -42);

    // ── Integrate with collisions
    const move = new THREE.Vector3(
      (this.vel.x + this.externalVel.x) * dt,
      (this.vel.y + this.externalVel.y) * dt,
      (this.vel.z + this.externalVel.z) * dt,
    );
    this.externalVel.set(0, 0, 0);
    const vyBefore = this.vel.y;
    const r = s.physics.moveCharacter(this.pos, this.half, move, this.grounded ? 0.45 : 0.2, this.moveRes);
    this.grounded = r.grounded && this.vel.y <= 0.1;
    this.ground = r.ground;
    if (r.grounded && this.vel.y < 0) this.vel.y = 0;
    if (r.hitCeiling && this.vel.y > 0) this.vel.y = 0;
    if (r.hitWall) {
      // Kill velocity into the wall so we slide along it
      const n = r.wallNormal;
      const into = this.vel.x * n.x + this.vel.z * n.z;
      if (into < 0) {
        this.vel.x -= n.x * into;
        this.vel.z -= n.z * into;
      }
    }

    // Landing
    if (this.grounded && !this.wasGrounded) {
      const impact = -vyBefore;
      if (impact > 5) {
        this.anim.land(impact);
        Audio.play('land', { vol: Math.min(1, impact / 20) });
        this.s.particles.emit('dust', this.pos, { count: Math.min(20, Math.floor(impact)) });
        if (impact > 16) s.rig.shake(0.18);
        s.emitNoise(this.pos, 5);
      }
      this.ground?.onLand?.();
      this.onLand?.(impact);
    }
    this.wasGrounded = this.grounded;

    // Kill plane
    if (this.pos.y < s.killY && !this.dead) s.playerFell();

    // ── Facing
    const hv = new THREE.Vector3(this.vel.x, 0, this.vel.z);
    this.speed2d = hv.length();
    if (this.aiming || (this.attackT > 0 && this.weapon.kind !== 'melee')) {
      this.yaw = dampAngle(this.yaw, s.rig.yaw, 20, dt);
    } else if (this.lockYaw !== null && this.attackT > 0) {
      this.yaw = dampAngle(this.yaw, this.lockYaw, 18, dt);
    } else if (this.speed2d > 0.5 && this.dodgeT <= 0 && wishLen > 0.05) {
      this.yaw = dampAngle(this.yaw, Math.atan2(wish.x, wish.z), 13, dt);
    }
    this.turnRate = clamp(wrapAngle(this.yaw - this.lastYaw) / Math.max(dt, 1e-3) / 6, -1, 1);
    this.lastYaw = this.yaw;

    // ── Model + animation
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.yaw;
    this.anim.update(dt, {
      speed: this.speed2d,
      grounded: this.grounded,
      vy: this.vel.y,
      crouch: this.crouching,
      sprint: this.sprinting,
      aim: this.aiming,
      turn: this.turnRate,
    });
    this.model.updateCloth(s.time, this.speed2d, this.vel.y);
    if (this.hidden) this.model.root.visible = false;
    else this.model.root.visible = true;

    // Weapon trail only during swings
    if (this.weaponTrail) this.weaponTrail.enabled = this.attackT > 0 && this.weapon.kind === 'melee';

    // Aura
    if (this.equip.aura && !this.hidden) {
      this.auraT -= dt;
      if (this.auraT <= 0) {
        this.auraT = 0.06;
        const c = this.center;
        c.x += rand(-0.4, 0.4);
        c.z += rand(-0.4, 0.4);
        c.y += rand(-0.8, 0.6);
        if (this.equip.aura === 'fx_aura_inferno') s.particles.emit('fire', c, { count: 1, up: 1.5, size: [0.4, 0.05] });
        else if (this.equip.aura === 'fx_aura_void') s.particles.emit('magic', c, { count: 1, color: 0xa040ff, color2: 0x200040, velSpread: 0.5, up: 0.8 });
        else s.particles.emit('magic', c, { count: 1, color: 0x60c0ff, color2: 0x2040ff, velSpread: 0.4, up: 0.8 });
      }
    }
    if (this.weapon.element === 'fire' && this.weaponTip && rand() < 0.4) {
      const tp = new THREE.Vector3();
      this.weaponTip.getWorldPosition(tp);
      s.particles.emit('fire', tp, { count: 1, size: [0.3, 0.02], up: 1.2 });
    }
    const ring = this.model.weaponR.children[0]?.userData?.spin as THREE.Object3D | undefined;
    if (ring) ring.rotation.z += dt * 3;

    // Sprint FOV + motion effect
    s.rig.fovKick = this.sprinting ? 6 : this.airDashT > 0 ? 10 : 0;
    s.post.motionTarget = this.sprinting ? 0.35 : this.airDashT > 0 ? 0.8 : s.post.motionTarget * 0.9;

    this.stepT += dt;
  }

  // ── Combat ────────────────────────────────────────────────────────────────
  private handleCombat(dt: number, wish: THREE.Vector3, wishLen: number) {
    this.attackT = Math.max(0, this.attackT - dt);
    if (!this.combatEnabled) {
      this.aiming = this.forceAim;
      return;
    }
    const w = this.weapon;
    if (w.kind === 'melee') {
      this.aiming = false;
      if (Input.wasPressed('attack')) this.queuedAttack = true;
      if (this.queuedAttack && this.dodgeT <= 0) {
        const canChain = this.attackT <= 0 || (this.anim.actionProgress > 0.55 && this.comboIdx > 0);
        if (canChain && this.stamina >= 3) {
          this.queuedAttack = false;
          this.meleeAttack(false);
        } else if (this.attackT <= 0) this.queuedAttack = false;
      }
      if (Input.wasPressed('heavy') && this.attackT <= 0 && this.dodgeT <= 0 && this.stamina >= 15) this.meleeAttack(true);
    } else if (w.kind === 'bow') {
      this.aiming = Input.isDown('heavy') && this.grounded;
      if (this.aiming) {
        this.bowCharge = Math.min(1, this.bowCharge + dt * 1.6);
        if (this.anim.actionName !== 'bowDraw') this.anim.play('bowDraw');
      } else {
        this.bowCharge = 0;
        if (this.anim.actionName === 'bowDraw') this.anim.release('bowDraw');
      }
      if (Input.wasPressed('attack') && this.attackT <= 0 && this.stamina >= 3) {
        const power = this.aiming ? 0.5 + this.bowCharge * 0.5 : 0.45;
        Combat.fireArrow(this.s, this, power);
        this.anim.play('bowRelease', 1.4);
        this.attackT = this.aiming ? 0.35 : 0.45;
        this.stamina -= w.staminaCost;
        this.staminaDelay = 0.5;
        this.bowCharge = 0.2;
      }
    } else if (w.kind === 'staff') {
      this.aiming = Input.isDown('heavy') && this.grounded;
      if (Input.wasPressed('attack') && this.attackT <= 0 && this.stamina >= 4) {
        this.anim.play('cast', 1.5, () => Combat.castBolt(this.s, this, this.aiming));
        this.attackT = 0.4;
        this.stamina -= w.staminaCost;
        this.staminaDelay = 0.5;
      }
    }
    void wish;
    void wishLen;
  }

  private meleeAttack(heavy: boolean) {
    const w = this.weapon;
    const target = Combat.findLockTarget(this.s, this.pos, heavy ? 5 : 4.5);
    const baseYaw = this.speed2d > 0.5 || !target ? this.yaw : this.yaw;
    this.lockYaw = target ? Math.atan2(target.center.x - this.pos.x, target.center.z - this.pos.z) : baseYaw;
    let action: string;
    if (heavy) {
      action = w.heavy;
      this.stamina -= w.staminaCost * 2;
      this.comboIdx = 0;
    } else {
      action = w.combo[this.comboIdx % w.combo.length];
      this.comboIdx++;
      this.stamina -= w.staminaCost;
    }
    this.staminaDelay = 0.6;
    const speed = w.speed * (heavy ? 0.85 : 1) * (1 + (this.comboIdx === w.combo.length ? -0.1 : 0));
    const finisher = !heavy && this.comboIdx === w.combo.length;
    this.anim.play(action, speed * 1.15, () => {
      const mult = heavy ? w.heavyMul : finisher ? 1.5 : 1;
      Combat.melee(this.s, this, w, mult, heavy || finisher);
    });
    this.attackT = 0.42 / (speed * 1.15) + (heavy ? 0.35 : 0);
    this.comboWindow = 1.0;
    // Lunge forward
    const f = new THREE.Vector3(Math.sin(this.lockYaw), 0, Math.cos(this.lockYaw));
    this.vel.x += f.x * (heavy ? 3 : 4.2);
    this.vel.z += f.z * (heavy ? 3 : 4.2);
    Audio.play(heavy ? 'heavy' : 'swing', { pitch: 0.9 + this.comboIdx * 0.08 });
  }

  private tryDodge(wish: THREE.Vector3, wishLen: number) {
    if (this.dodgeT > 0 || this.stamina < 18 || this.crouching || this.aiming) return;
    if (!this.grounded && this.coyote <= 0) return;
    this.stamina -= 18;
    this.staminaDelay = 0.7;
    this.dodgeDir.copy(wishLen > 0.1 ? wish : this.facing).setY(0).normalize();
    this.yaw = Math.atan2(this.dodgeDir.x, this.dodgeDir.z);
    this.dodgeT = 0.5;
    this.attackT = 0;
    this.anim.play('dodge', 1);
    Audio.play('dodge');
    this.s.particles.emit('dust', this.pos, { count: 8 });
  }

  private useAbility() {
    const s = this.s;
    switch (this.abilityMode) {
      case 'none':
        return;
      case 'airdash': {
        if (this.energy < 30 || this.airDashT > 0) return;
        this.energy -= 30;
        const f = s.rig.forward();
        const axis = Input.moveAxis();
        const dir = axis.x || axis.y ? new THREE.Vector3().addScaledVector(f, axis.y).addScaledVector(s.rig.right(), axis.x).normalize() : this.facing;
        this.vel.set(dir.x * 17, 2.5, dir.z * 17);
        this.yaw = Math.atan2(dir.x, dir.z);
        this.airDashT = 0.2;
        Audio.play('whoosh');
        s.particles.emit('magic', this.center, { count: 20, color: 0x60e0ff, color2: 0x2060ff });
        s.fx.shockwave(this.center, 1.5, 0x60e0ff, 0.3);
        return;
      }
      case 'pulse':
        if (this.energy < 35) return this.noEnergy();
        this.energy -= 35;
        s.fx.shockwave(this.pos, 16, 0xb48cff, 1.2);
        s.particles.emit('magic', this.center, { count: 40, velSpread: 8 });
        Audio.play('magic');
        s.bus.emit('pulse', this.pos.clone());
        return;
      case 'flash':
        if (this.energy < 50) return this.noEnergy();
        this.energy -= 50;
        s.post.flashScreen(0xffffff, 0.5, 3);
        s.fx.flash(this.headPos.addScaledVector(this.facing, 1.5), 0xffffff, 80, 0.4, 25);
        Audio.play('zap');
        s.bus.emit('flash', this.pos.clone());
        return;
      case 'throw':
        if (this.energy < 20) return this.noEnergy();
        this.energy -= 20;
        this.anim.play('throw', 1.3, () => Combat.throwStone(s, this));
        return;
      case 'weapon':
        if (!this.combatEnabled) return;
        if (this.energy < this.weapon.ability.cost) return this.noEnergy();
        if (this.attackT > 0.15) return;
        this.energy -= this.weapon.ability.cost;
        Combat.ability(s, this);
        return;
    }
  }

  private noEnergy() {
    Audio.play('error', { throttle: 0.3 });
    this.s.hudFlash = 'energy';
  }

  private cycleWeapon(i: number) {
    const id = this.ownedWeapons[i];
    if (!id || id === this.weapon.id || this.attackT > 0) return;
    this.setWeapon(id);
    Audio.play('pickup');
  }

  private handleInteract(dt: number) {
    // Nearest enabled interactable in range
    let best: Interactable | null = null;
    let bestD = Infinity;
    for (const it of this.s.interactables) {
      if (!it.enabled) continue;
      const d = it.pos.distanceTo(this.center);
      if (d < it.radius && d < bestD) {
        best = it;
        bestD = d;
      }
    }
    this.currentInteract = best;
    if (!best) {
      this.interactHold = 0;
      return;
    }
    if (best.hold) {
      if (Input.isDown('interact')) {
        if (this.holdTarget !== best) {
          this.holdTarget = best;
          this.interactHold = 0;
        }
        this.interactHold += dt;
        if (this.interactHold >= best.hold) {
          this.interactHold = 0;
          this.holdTarget = null;
          best.onInteract();
        }
      } else this.interactHold = 0;
    } else if (Input.wasPressed('interact')) {
      this.anim.play('interact', 1.4);
      best.onInteract();
    }
  }

  get interactProgress() {
    return this.currentInteract?.hold ? this.interactHold / this.currentInteract.hold : 0;
  }

  usePotion() {
    if (this.dead || this.hp >= this.maxHp) return false;
    if (!this.s.consumePotion()) return false;
    this.heal(50);
    return true;
  }

  getWeaponTip(out: THREE.Vector3) {
    if (this.weaponTip) return this.weaponTip.getWorldPosition(out);
    return out.copy(this.headPos).addScaledVector(this.facing, 0.8);
  }

  dispose() {
    if (this.weaponTrail) this.s.fx.removeTrail(this.weaponTrail);
    if (this.bodyTrail) this.s.fx.removeTrail(this.bodyTrail);
    this.model.dispose();
  }
}

