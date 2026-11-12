/**
 * Procedural models for everything a runner can hold or pick up: the five weapons, the four
 * consumables and the ammunition boxes. Each one is a handful of primitives merged into a single
 * vertex-coloured geometry, so an item costs one draw call (or one instance).
 *
 * The designs are original: chunky, readable silhouettes with one accent colour per weapon family
 * so a pickup can be recognised from a distance. Weapon space: barrel along -Z, grip at the origin.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from './palette.js';

const BODY = 0x26323d;
const BODY_LIGHT = 0x3b4a58;
const METAL = 0x9aa5b4;
const GRIP = 0x151c23;

function tint(geometry: THREE.BufferGeometry, color: number): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, color: number, rotX = 0): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(w, h, d);
  if (rotX !== 0) geometry.rotateX(rotX);
  return tint(geometry.translate(x, y, z), color);
}

/** Cylinder along the Z axis. */
function tube(radius: number, length: number, x: number, y: number, z: number, color: number, sides = 10): THREE.BufferGeometry {
  return tint(new THREE.CylinderGeometry(radius, radius, length, sides).rotateX(Math.PI / 2).translate(x, y, z), color);
}

/** Cylinder along the Y axis. */
function can(radius: number, height: number, x: number, y: number, z: number, color: number, sides = 12): THREE.BufferGeometry {
  return tint(new THREE.CylinderGeometry(radius, radius, height, sides).translate(x, y, z), color);
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error('could not merge model parts');
  return merged;
}

export interface WeaponModelSpec {
  geometry: THREE.BufferGeometry;
  /** Tip of the barrel, where tracers and flashes start. */
  muzzle: THREE.Vector3;
  /** Where the supporting hand holds the weapon. */
  support: THREE.Vector3;
  accent: number;
}

function buildWeapons(): Record<string, WeaponModelSpec> {
  const amber = PALETTE.amber;
  const turquoise = PALETTE.turquoise;
  const coral = PALETTE.coral;
  const violet = PALETTE.violet;
  const blue = PALETTE.blue;
  return {
    starter_ar: {
      accent: amber,
      muzzle: new THREE.Vector3(0, 0.055, -0.66),
      support: new THREE.Vector3(0, 0.0, -0.3),
      geometry: merge([
        box(0.06, 0.1, 0.4, 0, 0.05, -0.12, BODY), // receiver
        box(0.05, 0.07, 0.24, 0, 0.045, -0.4, BODY_LIGHT), // handguard
        tube(0.016, 0.16, 0, 0.055, -0.58, METAL), // barrel
        box(0.045, 0.09, 0.2, 0, 0.03, 0.17, BODY_LIGHT), // stock
        box(0.05, 0.12, 0.04, 0, 0.0, 0.27, GRIP), // butt plate
        box(0.045, 0.13, 0.06, 0, -0.06, 0.0, GRIP, 0.25), // grip
        box(0.04, 0.16, 0.075, 0, -0.08, -0.16, BODY_LIGHT, -0.18), // magazine
        box(0.02, 0.035, 0.16, 0, 0.12, -0.1, METAL), // sight rail
        box(0.064, 0.02, 0.3, 0, 0.075, -0.2, amber), // accent strip
      ]),
    },
    starter_smg: {
      accent: turquoise,
      muzzle: new THREE.Vector3(0, 0.05, -0.42),
      support: new THREE.Vector3(0, -0.02, -0.2),
      geometry: merge([
        box(0.065, 0.11, 0.3, 0, 0.05, -0.1, BODY),
        tube(0.02, 0.14, 0, 0.05, -0.33, METAL),
        box(0.045, 0.12, 0.055, 0, -0.055, 0.0, GRIP, 0.22),
        box(0.035, 0.24, 0.06, 0, -0.11, -0.12, BODY_LIGHT), // long straight magazine
        box(0.03, 0.03, 0.2, 0, 0.09, 0.14, METAL), // wire stock
        box(0.03, 0.09, 0.03, 0, 0.05, 0.24, METAL),
        box(0.069, 0.02, 0.22, 0, 0.08, -0.1, turquoise),
      ]),
    },
    starter_shotgun: {
      accent: coral,
      muzzle: new THREE.Vector3(0, 0.06, -0.7),
      support: new THREE.Vector3(0, 0.0, -0.36),
      geometry: merge([
        box(0.07, 0.1, 0.3, 0, 0.05, -0.06, BODY),
        tube(0.03, 0.46, 0, 0.07, -0.44, METAL, 12), // fat barrel
        tube(0.024, 0.34, 0, 0.022, -0.4, BODY_LIGHT), // tube magazine
        box(0.06, 0.06, 0.16, 0, 0.022, -0.36, coral), // pump
        box(0.05, 0.1, 0.24, 0, 0.02, 0.2, BODY_LIGHT, -0.12), // stock
        box(0.05, 0.12, 0.06, 0, -0.055, 0.03, GRIP, 0.3),
      ]),
    },
    starter_sniper: {
      accent: violet,
      muzzle: new THREE.Vector3(0, 0.055, -1.02),
      support: new THREE.Vector3(0, 0.0, -0.4),
      geometry: merge([
        box(0.06, 0.09, 0.44, 0, 0.05, -0.12, BODY),
        tube(0.015, 0.56, 0, 0.055, -0.62, METAL),
        tube(0.026, 0.1, 0, 0.055, -0.96, BODY_LIGHT), // muzzle brake
        box(0.05, 0.1, 0.3, 0, 0.03, 0.23, BODY_LIGHT, -0.06), // stock
        box(0.05, 0.13, 0.04, 0, 0.0, 0.38, GRIP),
        box(0.045, 0.12, 0.06, 0, -0.055, 0.02, GRIP, 0.28),
        box(0.035, 0.09, 0.07, 0, -0.04, -0.14, BODY_LIGHT),
        tube(0.034, 0.28, 0, 0.145, -0.12, BODY_LIGHT, 12), // scope
        tube(0.04, 0.04, 0, 0.145, -0.27, violet, 12), // scope lens ring
        box(0.02, 0.045, 0.03, 0, 0.105, -0.04, METAL),
        box(0.02, 0.045, 0.03, 0, 0.105, -0.2, METAL),
      ]),
    },
    starter_pistol: {
      accent: blue,
      muzzle: new THREE.Vector3(0, 0.06, -0.21),
      support: new THREE.Vector3(-0.02, -0.05, 0.0),
      geometry: merge([
        box(0.045, 0.06, 0.22, 0, 0.06, -0.07, BODY), // slide
        box(0.04, 0.035, 0.16, 0, 0.02, -0.05, BODY_LIGHT), // frame
        box(0.042, 0.13, 0.06, 0, -0.045, 0.02, GRIP, 0.2),
        box(0.049, 0.018, 0.12, 0, 0.085, -0.06, blue),
      ]),
    },
  };
}

function buildItems(): Record<string, THREE.BufferGeometry> {
  const cream = PALETTE.cream;
  return {
    // Small hexagonal cell.
    shield_cell: merge([can(0.085, 0.16, 0, 0.11, 0, PALETTE.blue, 6), can(0.095, 0.035, 0, 0.02, 0, BODY, 6), can(0.095, 0.035, 0, 0.2, 0, BODY, 6)]),
    // Tall battery with a handle.
    shield_battery: merge([
      can(0.11, 0.3, 0, 0.19, 0, PALETTE.turquoise, 10),
      can(0.12, 0.05, 0, 0.03, 0, BODY, 10),
      can(0.12, 0.05, 0, 0.35, 0, BODY, 10),
      box(0.16, 0.03, 0.035, 0, 0.42, 0, METAL),
    ]),
    // A roll of bandage lying on its side.
    bandage: merge([tube(0.085, 0.13, 0, 0.09, 0, cream, 12), tube(0.089, 0.035, 0, 0.09, 0, PALETTE.coral, 12)]),
    // Case with a cross.
    medkit: merge([
      box(0.34, 0.2, 0.24, 0, 0.11, 0, cream),
      box(0.07, 0.14, 0.012, 0, 0.11, -0.124, PALETTE.coral),
      box(0.16, 0.055, 0.012, 0, 0.11, -0.124, PALETTE.coral),
      box(0.12, 0.03, 0.04, 0, 0.225, 0, BODY),
    ]),
    ammo_light: merge([box(0.2, 0.12, 0.14, 0, 0.07, 0, BODY_LIGHT), box(0.205, 0.035, 0.145, 0, 0.11, 0, PALETTE.blue)]),
    ammo_medium: merge([box(0.24, 0.14, 0.15, 0, 0.08, 0, BODY_LIGHT), box(0.245, 0.04, 0.155, 0, 0.125, 0, PALETTE.amber)]),
    ammo_shells: merge([box(0.2, 0.13, 0.2, 0, 0.075, 0, BODY_LIGHT), box(0.205, 0.04, 0.205, 0, 0.115, 0, PALETTE.coral)]),
    ammo_heavy: merge([box(0.28, 0.13, 0.13, 0, 0.075, 0, BODY_LIGHT), box(0.285, 0.04, 0.135, 0, 0.115, 0, PALETTE.violet)]),
  };
}

let weapons: Record<string, WeaponModelSpec> | null = null;
let items: Record<string, THREE.BufferGeometry> | null = null;

/** Shared weapon model data (built on first use and kept for the life of the page). */
export function weaponModel(weaponId: string): WeaponModelSpec | undefined {
  weapons ??= buildWeapons();
  return weapons[weaponId];
}

/** Shared geometry of a consumable or an ammunition box (`ammo_<type>`). */
export function itemGeometry(id: string): THREE.BufferGeometry | undefined {
  items ??= buildItems();
  return items[id];
}

/** Accent colour of whatever a pickup is, used for its marker ring. */
export function pickupColor(kind: string, defId: string): number {
  if (kind === 'weapon') return weaponModel(defId)?.accent ?? PALETTE.amber;
  if (kind === 'ammo') return PALETTE.cream;
  return defId === 'bandage' || defId === 'medkit' ? PALETTE.coral : PALETTE.turquoise;
}

/** Geometry key of a pickup, or undefined when it has no model. */
export function pickupGeometry(kind: string, defId: string): THREE.BufferGeometry | undefined {
  if (kind === 'weapon') return weaponModel(defId)?.geometry;
  return itemGeometry(kind === 'ammo' ? `ammo_${defId}` : defId);
}
