/** Tiny JSX helpers for building props from shared geometries/materials. */
import * as THREE from 'three';
import type { ReactNode } from 'react';
import { getMaterials, worldBox, type MatName } from './materials';

type V3 = [number, number, number];

const cylCache = new Map<string, THREE.CylinderGeometry>();
export function cylGeo(rt: number, rb: number, h: number, seg = 16, open = false): THREE.CylinderGeometry {
  const k = `${rt}|${rb}|${h}|${seg}|${open}`;
  let g = cylCache.get(k);
  if (!g) { g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); cylCache.set(k, g); }
  return g;
}
const sphCache = new Map<string, THREE.SphereGeometry>();
export function sphGeo(r: number, seg = 16): THREE.SphereGeometry {
  const k = `${r}|${seg}`;
  let g = sphCache.get(k);
  if (!g) { g = new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2)); sphCache.set(k, g); }
  return g;
}

export function B({ p, s, m, r, cast = true, mat, uv = 1 }: { p: V3; s: V3; m?: MatName; r?: V3; cast?: boolean; mat?: THREE.Material; uv?: number }) {
  return (
    <mesh position={p} rotation={r} geometry={worldBox(s[0], s[1], s[2], uv)} material={mat ?? getMaterials()[m ?? 'steel']} castShadow={cast} receiveShadow />
  );
}

export function C({ p, r = 0.1, rb, h, m, rot, seg = 16, mat, cast = true }: { p: V3; r?: number; rb?: number; h: number; m?: MatName; rot?: V3; seg?: number; mat?: THREE.Material; cast?: boolean }) {
  return <mesh position={p} rotation={rot} geometry={cylGeo(r, rb ?? r, h, seg)} material={mat ?? getMaterials()[m ?? 'steel']} castShadow={cast} receiveShadow />;
}

export function S({ p, r, m, mat, sc }: { p: V3; r: number; m?: MatName; mat?: THREE.Material; sc?: V3 }) {
  return <mesh position={p} scale={sc} geometry={sphGeo(r)} material={mat ?? getMaterials()[m ?? 'steel']} castShadow receiveShadow />;
}

/** Group placed at (x, y, z) rotated by quarter turns. */
export function At({ x, y = 0, z, rot = 0, children }: { x: number; y?: number; z: number; rot?: number; children: ReactNode }) {
  return <group position={[x, y, z]} rotation={[0, (rot * Math.PI) / 2, 0]}>{children}</group>;
}
