import * as THREE from 'three';
import { PhysicsConfig } from '@/config/physics';
import type { ShotInput } from '@/game/shooting/shot';
import type { Vec3 } from '@/utils/math';

const SAFE = new THREE.Color(0xffffff);
const DANGER = new THREE.Color(0xff3344);

/**
 * Indicador de apuntado: flecha de dirección cuya longitud y color dependen de
 * la potencia (blanco → rojo al superar el umbral recomendado), anillo de
 * potencia alrededor de la bola y línea de arrastre hacia atrás.
 */
export class AimView {
  readonly group = new THREE.Group();
  private readonly arrow: THREE.Mesh;
  private readonly head: THREE.Mesh;
  private readonly back: THREE.Mesh;
  private readonly ring: THREE.Mesh;
  private readonly ringMat: THREE.MeshBasicMaterial;
  private readonly arrowMat: THREE.MeshBasicMaterial;
  private readonly backMat: THREE.MeshBasicMaterial;

  constructor() {
    this.arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide });
    this.backMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });

    const shaft = new THREE.PlaneGeometry(1, 1);
    shaft.rotateX(-Math.PI / 2);
    shaft.translate(0, 0, -0.5); // crece hacia -Z local
    this.arrow = new THREE.Mesh(shaft, this.arrowMat);

    const headGeo = new THREE.BufferGeometry();
    headGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0, 0, -1], 3));
    headGeo.setIndex([0, 1, 2]);
    this.head = new THREE.Mesh(headGeo, this.arrowMat);

    const backGeo = new THREE.PlaneGeometry(1, 1);
    backGeo.rotateX(-Math.PI / 2);
    backGeo.translate(0, 0, 0.5); // crece hacia +Z local (detrás de la bola)
    this.back = new THREE.Mesh(backGeo, this.backMat);

    this.ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.18, 48, 1, 0, Math.PI * 2), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;

    for (const m of [this.arrow, this.head, this.back, this.ring]) m.renderOrder = 10;
    this.group.add(this.arrow, this.head, this.back, this.ring);
    this.group.visible = false;
  }

  show(ball: Vec3, shot: ShotInput | null): void {
    if (!shot) {
      this.group.visible = false;
      return;
    }
    const r = PhysicsConfig.ball.radius;
    this.group.visible = true;
    this.group.position.set(ball.x, ball.y - r + 0.02, ball.z);
    // La flecha apunta en la dirección del tiro (local -Z).
    this.group.rotation.set(0, Math.atan2(-shot.direction.x, -shot.direction.z), 0);

    const p = shot.power;
    const t = Math.max(0, (p - 0.45) / (PhysicsConfig.shot.dangerPower - 0.45));
    const color = SAFE.clone().lerp(DANGER, Math.min(1, t));
    if (p >= PhysicsConfig.shot.dangerPower) color.copy(DANGER);
    this.arrowMat.color.copy(color);
    this.ringMat.color.copy(color);

    const len = 0.4 + p * 3.6;
    const width = 0.09 + p * 0.05;
    this.arrow.position.set(0, 0, -r * 1.4);
    this.arrow.scale.set(width, 1, len);
    this.head.position.set(0, 0, -r * 1.4 - len);
    this.head.scale.set(width * 3.2, 1, 0.32);
    this.back.position.set(0, 0, r * 1.4);
    this.back.scale.set(0.05, 1, p * 2.2);
    const ringR = r * (1.7 + p * 0.6);
    this.ring.scale.set(ringR, ringR, ringR);
  }

  hide(): void {
    this.group.visible = false;
  }

  dispose(): void {
    for (const m of [this.arrow, this.head, this.back, this.ring]) m.geometry.dispose();
    this.arrowMat.dispose();
    this.backMat.dispose();
    this.ringMat.dispose();
  }
}
