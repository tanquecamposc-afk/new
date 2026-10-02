import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { radialTexture } from '@/cosmetics/ballTextures';
import type { BlockDef } from '@/game/courses/types';

/**
 * Oclusión ambiental de contacto "horneada": franjas oscuras degradadas en el
 * suelo junto a la base de cada pared. Todas en UNA geometría (1 draw call);
 * dan profundidad aunque no haya mapa de sombras (calidad baja).
 */
export function createContactAO(walls: BlockDef[]): { mesh: THREE.Mesh; dispose(): void } | null {
  const parts: THREE.BufferGeometry[] = [];
  const width = 0.45;
  for (const w of walls) {
    const yaw = w.rotation?.y ?? 0;
    if (w.quat || w.rotation?.x || w.rotation?.z) continue;
    const baseY = w.center.y - w.size.y / 2 + 0.05 + 0.006;
    for (const side of [-1, 1]) {
      const g = new THREE.PlaneGeometry(width, w.size.z);
      g.rotateX(-Math.PI / 2);
      // UV.x = 0 junto a la pared → 1 lejos de ella.
      if (side < 0) {
        const uv = g.getAttribute('uv');
        for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
      }
      g.translate(side * (w.size.x / 2 + width / 2), 0, 0);
      g.rotateY(yaw);
      g.translate(w.center.x, baseY, w.center.z);
      parts.push(g);
    }
  }
  if (!parts.length) return null;
  const geo = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 4;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.42)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 4);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1;
  return {
    mesh,
    dispose: () => {
      geo.dispose();
      mat.dispose();
      tex.dispose();
    },
  };
}

/** Sombra "blob" bajo una bola (cuando no hay sombras dinámicas o para bolas fantasma). */
export class BlobShadow {
  readonly mesh: THREE.Mesh;
  private static geo: THREE.PlaneGeometry | null = null;
  private readonly mat: THREE.MeshBasicMaterial;

  constructor(opacity = 0.45) {
    BlobShadow.geo ??= new THREE.PlaneGeometry(0.42, 0.42).rotateX(-Math.PI / 2);
    this.mat = new THREE.MeshBasicMaterial({ map: radialTexture(), color: 0x000000, transparent: true, opacity, depthWrite: false });
    this.mesh = new THREE.Mesh(BlobShadow.geo, this.mat);
    this.mesh.renderOrder = 2;
  }

  /** Coloca la sombra en el suelo bajo la bola; se difumina al elevarse. */
  place(ball: THREE.Vector3, groundY: number, visible: boolean): void {
    const h = Math.max(0, ball.y - groundY - 0.15);
    this.mesh.visible = visible && h < 1.5;
    this.mesh.position.set(ball.x, groundY + 0.008, ball.z);
    const s = 1 + h * 0.8;
    this.mesh.scale.set(s, 1, s);
    this.mat.opacity = 0.45 / (1 + h * 2);
  }

  dispose(): void {
    this.mat.dispose();
  }
}
