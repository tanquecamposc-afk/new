import * as THREE from 'three';
import { obstacleBoxes, obstaclePose } from '@/game/obstacles/poses';
import type { ObstacleDef } from '@/game/obstacles/types';

/**
 * Meshes de los obstáculos. Su pose se calcula con la MISMA función pura que
 * usa la física (obstaclePose), así que lo que se ve coincide con lo que choca.
 */
export class ObstacleView {
  readonly group = new THREE.Group();
  private items: { def: ObstacleDef; obj: THREE.Object3D }[] = [];
  private disposables: { dispose(): void }[] = [];

  /** `castShadows`: sólo con sombras dinámicas (en modo estático el mapa no se recalcula). */
  constructor(defs: readonly ObstacleDef[], private readonly castShadows = true) {
    const wood = this.track(new THREE.MeshStandardMaterial({ color: 0xf6efe2, roughness: 0.6 }));
    const accent = this.track(new THREE.MeshStandardMaterial({ color: 0xe8483f, roughness: 0.55 }));
    const slider = this.track(new THREE.MeshStandardMaterial({ color: 0xffb020, roughness: 0.5 }));
    const stripe = this.track(new THREE.MeshStandardMaterial({ color: 0x23324f, roughness: 0.5 }));
    const bumper = this.track(new THREE.MeshStandardMaterial({ color: 0xff4f8b, roughness: 0.35, emissive: 0x551030 }));
    const metal = this.track(new THREE.MeshStandardMaterial({ color: 0xcfd6df, metalness: 0.6, roughness: 0.3 }));

    for (const def of defs) {
      const g = new THREE.Group();
      const boxes = obstacleBoxes(def);
      boxes.forEach((b, i) => {
        const mat = def.kind === 'windmill' ? (i % 2 ? accent : wood) : slider;
        const m = new THREE.Mesh(this.track(new THREE.BoxGeometry(b.half.x * 2, b.half.y * 2, b.half.z * 2)), mat);
        m.position.set(b.offset.x, b.offset.y, b.offset.z);
        m.quaternion.set(b.rotation.x, b.rotation.y, b.rotation.z, b.rotation.w);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
        if (def.kind === 'slider') {
          // Franjas de aviso sobre la barrera.
          for (let k = -1; k <= 1; k++) {
            const s = new THREE.Mesh(this.track(new THREE.BoxGeometry(b.half.x * 2 + 0.01, b.half.y * 2 + 0.01, 0.12)), stripe);
            s.position.z = k * b.half.z * 0.55;
            g.add(s);
          }
        }
      });
      if (def.kind === 'windmill') {
        const hub = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 16)), metal);
        hub.rotation.x = Math.PI / 2;
        hub.castShadow = true;
        g.add(hub);
      }
      if (def.kind === 'bumper') {
        const body = new THREE.Mesh(this.track(new THREE.CylinderGeometry(def.radius, def.radius * 1.08, def.height, 24)), bumper);
        const cap = new THREE.Mesh(this.track(new THREE.SphereGeometry(def.radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), bumper);
        cap.position.y = def.height / 2;
        cap.scale.y = 0.45;
        for (const m of [body, cap]) {
          m.castShadow = true;
          g.add(m);
        }
      }
      this.group.add(g);
      this.items.push({ def, obj: g });
    }
    if (!this.castShadows) this.group.traverse((o) => (o.castShadow = false));
    this.update(0);
  }

  private track<T extends { dispose(): void }>(o: T): T {
    this.disposables.push(o);
    return o;
  }

  /** `t` = tiempo de simulación interpolado (s). */
  update(t: number): void {
    for (const { def, obj } of this.items) {
      const p = obstaclePose(def, t);
      obj.position.set(p.position.x, p.position.y, p.position.z);
      obj.quaternion.set(p.rotation.x, p.rotation.y, p.rotation.z, p.rotation.w);
    }
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.group.clear();
  }
}
