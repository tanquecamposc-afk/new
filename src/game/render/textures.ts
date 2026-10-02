import * as THREE from 'three';

/** Texturas procedurales pequeñas (sin assets externos, baratas para Chromebooks). */
export function createStripeTexture(base: string, stripe: string, stripes = 2): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  g.fillStyle = stripe;
  const w = size / (stripes * 2);
  for (let i = 0; i < stripes; i++) g.fillRect(i * 2 * w, 0, w, size);
  // Ruido suave para romper la uniformidad del césped.
  const img = g.getImageData(0, 0, size, size);
  let seed = 1337;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 14;
    img.data[i] = Math.min(255, Math.max(0, img.data[i]! + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1]! + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2]! + n));
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function createSkyTexture(top: number, bottom: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, `#${top.toString(16).padStart(6, '0')}`);
  grad.addColorStop(1, `#${bottom.toString(16).padStart(6, '0')}`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Proyección planar XZ en coordenadas de mundo: las franjas del césped continúan entre bloques. */
export function applyWorldPlanarUV(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, scale: number): void {
  const pos = geometry.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
    uv[i * 2] = v.x * scale;
    uv[i * 2 + 1] = v.z * scale;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
