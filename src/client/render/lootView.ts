/**
 * Draws the items lying in the world: one instanced mesh per kind of item, plus a coloured ring
 * on the ground under each of them so pickups can be spotted from a distance. A pure view of the
 * simulation's loot table — it is rebuilt from that table every frame.
 */
import * as THREE from 'three';
import type { LootItem } from '../../core/sim/loot.js';
import { pickupColor, pickupGeometry } from './models.js';

const CAPACITY = 64;

export class LootView {
  readonly group = new THREE.Group();

  private readonly material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2 });
  private readonly ringGeometry = new THREE.RingGeometry(0.3, 0.4, 20).rotateX(-Math.PI / 2);
  private readonly ringMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
  private readonly rings = new THREE.InstancedMesh(this.ringGeometry, this.ringMaterial, CAPACITY * 4);
  private readonly meshes = new Map<string, THREE.InstancedMesh>();
  private readonly counts = new Map<string, number>();
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();
  private readonly euler = new THREE.Euler();
  private readonly color = new THREE.Color();

  constructor() {
    this.group.name = 'loot';
    this.rings.frustumCulled = false;
    this.rings.renderOrder = 2;
    this.rings.count = 0;
    this.group.add(this.rings);
  }

  update(items: Iterable<LootItem> | null, timeSeconds: number, reducedMotion: boolean): void {
    for (const key of this.counts.keys()) this.counts.set(key, 0);
    let ringCount = 0;
    if (items) {
      for (const item of items) {
        const key = `${item.kind}:${item.defId}`;
        let mesh = this.meshes.get(key);
        if (!mesh) {
          const geometry = pickupGeometry(item.kind, item.defId);
          if (!geometry) continue;
          mesh = new THREE.InstancedMesh(geometry, this.material, CAPACITY);
          mesh.frustumCulled = false;
          mesh.count = 0;
          this.meshes.set(key, mesh);
          this.group.add(mesh);
        }
        const index = this.counts.get(key) ?? 0;
        if (index >= CAPACITY) continue;
        this.counts.set(key, index + 1);

        // Each item gets its own phase so a pile of loot does not move in lockstep.
        const phase = item.id * 1.7;
        const bob = reducedMotion ? 0 : Math.sin(timeSeconds * 2.2 + phase) * 0.05;
        const spin = reducedMotion ? phase : timeSeconds * 0.9 + phase;
        const weapon = item.kind === 'weapon';
        this.position.set(item.x, item.y + (weapon ? 0.5 : 0.16) + bob, item.z);
        this.euler.set(0, spin, weapon ? 0.35 : 0);
        this.quaternion.setFromEuler(this.euler);
        this.scale.setScalar(weapon ? 1.15 : 1.35);
        this.matrix.compose(this.position, this.quaternion, this.scale);
        mesh.setMatrixAt(index, this.matrix);

        if (ringCount < this.rings.instanceMatrix.count) {
          const pulse = reducedMotion ? 1 : 1 + Math.sin(timeSeconds * 3 + phase) * 0.08;
          this.position.set(item.x, item.y + 0.03, item.z);
          this.quaternion.identity();
          this.scale.setScalar(pulse);
          this.matrix.compose(this.position, this.quaternion, this.scale);
          this.rings.setMatrixAt(ringCount, this.matrix);
          this.rings.setColorAt(ringCount, this.color.setHex(pickupColor(item.kind, item.defId)));
          ringCount++;
        }
      }
    }
    for (const [key, mesh] of this.meshes) {
      mesh.count = this.counts.get(key) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
    this.rings.count = ringCount;
    this.rings.instanceMatrix.needsUpdate = true;
    if (this.rings.instanceColor) this.rings.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    // Item geometries are shared with the rest of the game and are not disposed here.
    for (const mesh of this.meshes.values()) mesh.dispose();
    this.meshes.clear();
    this.rings.dispose();
    this.ringGeometry.dispose();
    this.ringMaterial.dispose();
    this.material.dispose();
    this.group.removeFromParent();
  }
}
