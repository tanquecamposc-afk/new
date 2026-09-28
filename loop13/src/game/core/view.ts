/** Shared camera/view state written by the camera rig and read by gameplay systems. */
import { Vector3 } from 'three';

export interface CinematicShot {
  from: { pos: [number, number, number]; target: [number, number, number] };
  to?: { pos: [number, number, number]; target: [number, number, number] };
  duration: number;
  fov?: number;
  dof?: boolean;
  ease?: 'linear' | 'inOut';
}

export const view = {
  yaw: Math.PI, // camera orbit yaw (0 → camera looks toward −z)
  pitch: 0.25,
  dist: 3.2,
  camPos: new Vector3(0, 2, 5),
  camDir: new Vector3(0, 0, -1),
  fov: 62,
  /** Active cinematic shot (overrides the third-person rig). */
  shot: null as CinematicShot | null,
  shotTime: 0,
  /** Forced look-at target that smoothly steers the rig (e.g. first Observer sighting). */
  focus: null as { x: number; y: number; z: number; until: number } | null,
  /** Menu background orbit. */
  menuOrbit: true,
};

export function setShot(shot: CinematicShot | null): void {
  view.shot = shot;
  view.shotTime = 0;
}
