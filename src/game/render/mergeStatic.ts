import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Fusiona las mallas estáticas de un grupo que comparten material y modo de
 * sombra en una sola malla (transformaciones horneadas). Reduce decenas de
 * llamadas de dibujo a unas pocas — también en la pasada de sombras.
 * `keep`: objetos animados que no deben fusionarse.
 */
export function mergeStaticMeshes(root: THREE.Group, keep: Set<THREE.Object3D>): { merged: number; produced: number; geometries: THREE.BufferGeometry[] } {
  root.updateMatrixWorld(true);
  const buckets = new Map<string, { material: THREE.Material; cast: boolean; receive: boolean; renderOrder: number; geos: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }>();
  const skip = (o: THREE.Object3D): boolean => {
    for (let p: THREE.Object3D | null = o; p && p !== root; p = p.parent) if (keep.has(p)) return true;
    return false;
  };
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh || skip(o) || Array.isArray(o.material)) return;
    const mat = o.material as THREE.Material;
    if (mat.transparent || mat instanceof THREE.ShaderMaterial) return;
    const key = `${mat.uuid}|${o.castShadow}|${o.receiveShadow}|${o.renderOrder}`;
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { material: mat, cast: o.castShadow, receive: o.receiveShadow, renderOrder: o.renderOrder, geos: [], meshes: [] }));
    let g = o.geometry as THREE.BufferGeometry;
    g = g.index ? g.toNonIndexed() : g.clone();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    g.clearGroups();
    g.applyMatrix4(o.matrixWorld);
    b.geos.push(g);
    b.meshes.push(o);
  });
  let merged = 0;
  let produced = 0;
  const geometries: THREE.BufferGeometry[] = [];
  for (const b of buckets.values()) {
    if (b.meshes.length < 2) {
      b.geos.forEach((g) => g.dispose());
      continue;
    }
    const geo = mergeGeometries(b.geos, false);
    b.geos.forEach((g) => g.dispose());
    if (!geo) continue;
    for (const m of b.meshes) m.removeFromParent();
    const mesh = new THREE.Mesh(geo, b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    mesh.renderOrder = b.renderOrder;
    mesh.matrixAutoUpdate = false;
    // La transformación ya está horneada: el grupo raíz no debe volver a aplicarse.
    mesh.applyMatrix4(root.matrixWorld.clone().invert());
    mesh.updateMatrix();
    root.add(mesh);
    geometries.push(geo);
    merged += b.meshes.length;
    produced++;
  }
  return { merged, produced, geometries };
}
