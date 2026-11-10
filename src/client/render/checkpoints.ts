/**
 * Visuals for the course anchors: a spinning diamond inside a ring with a tall light beam. The
 * next anchor glows amber, later ones wait in dim turquoise, reached ones disappear.
 * State comes from the simulation's course; this class only draws it.
 */
import * as THREE from 'three';
import type { CheckpointDef } from '../../core/sim/map.js';
import { PALETTE } from './palette.js';

interface AnchorView {
  group: THREE.Group;
  core: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  ring: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  beam: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  glow: THREE.Sprite;
  /** 1 = fully visible, eases to 0 once reached. */
  visibility: number;
}

export class CheckpointView {
  readonly group = new THREE.Group();
  private readonly anchors: AnchorView[] = [];
  private readonly coreGeometry = new THREE.OctahedronGeometry(0.42, 0);
  private readonly ringGeometry = new THREE.TorusGeometry(0.85, 0.045, 6, 28);
  private readonly beamGeometry = new THREE.CylinderGeometry(0.16, 0.34, 1, 10, 1, true);
  private readonly amber = new THREE.Color(PALETTE.amber);
  private readonly turquoise = new THREE.Color(PALETTE.turquoise);

  constructor(checkpoints: readonly CheckpointDef[], glowTexture: THREE.Texture) {
    this.group.name = 'checkpoints';
    for (const cp of checkpoints) {
      const group = new THREE.Group();
      group.position.set(cp.x, cp.y, cp.z);

      const core = new THREE.Mesh(this.coreGeometry, new THREE.MeshBasicMaterial({ color: PALETTE.turquoise, transparent: true }));
      const ring = new THREE.Mesh(this.ringGeometry, new THREE.MeshBasicMaterial({ color: PALETTE.turquoise, transparent: true }));
      const beam = new THREE.Mesh(
        this.beamGeometry,
        new THREE.MeshBasicMaterial({
          color: PALETTE.amber,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        }),
      );
      beam.scale.set(1, 46, 1);
      beam.position.y = 23;
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glowTexture, color: PALETTE.amber, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      );
      glow.scale.setScalar(3.4);
      group.add(core, ring, beam, glow);
      this.group.add(group);
      this.anchors.push({ group, core, ring, beam, glow, visibility: 1 });
    }
  }

  /**
   * @param nextIndex index of the anchor to reach next (== count when the course is finished)
   */
  update(nextIndex: number, timeSeconds: number, frameSeconds: number, reducedMotion: boolean): void {
    const pulse = reducedMotion ? 1 : 0.86 + 0.14 * Math.sin(timeSeconds * 4.2);
    for (let i = 0; i < this.anchors.length; i++) {
      const anchor = this.anchors[i]!;
      const reached = i < nextIndex;
      const isNext = i === nextIndex;
      const target = reached ? 0 : 1;
      anchor.visibility += (target - anchor.visibility) * Math.min(1, frameSeconds * 9);
      const v = anchor.visibility;
      anchor.group.visible = v > 0.02;
      if (!anchor.group.visible) continue;

      const color = isNext ? this.amber : this.turquoise;
      anchor.core.material.color.copy(color);
      anchor.ring.material.color.copy(color);
      anchor.core.material.opacity = (isNext ? 1 : 0.55) * v;
      anchor.ring.material.opacity = (isNext ? 0.95 : 0.4) * v;
      anchor.beam.visible = isNext;
      anchor.beam.material.opacity = 0.22 * v * pulse;
      anchor.glow.visible = isNext;
      anchor.glow.material.opacity = 0.75 * v * pulse;

      const spin = reducedMotion ? 0 : timeSeconds;
      anchor.core.rotation.set(0, spin * 1.6, 0);
      anchor.core.position.y = reducedMotion ? 0 : Math.sin(timeSeconds * 2 + i) * 0.12;
      anchor.ring.rotation.set(Math.PI / 2 + Math.sin(spin * 0.9 + i) * 0.35, spin * 0.7, 0);
      // A reached anchor bursts outward as it fades.
      const scale = (isNext ? 1.15 * pulse : 0.8) * (reached ? 1 + (1 - v) * 1.6 : 1);
      anchor.core.scale.setScalar(scale);
      anchor.ring.scale.setScalar(scale);
    }
  }

  dispose(): void {
    for (const anchor of this.anchors) {
      anchor.core.material.dispose();
      anchor.ring.material.dispose();
      anchor.beam.material.dispose();
      anchor.glow.material.dispose();
    }
    this.coreGeometry.dispose();
    this.ringGeometry.dispose();
    this.beamGeometry.dispose();
    this.group.removeFromParent();
  }
}
