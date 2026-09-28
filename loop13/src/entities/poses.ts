/**
 * Procedural animation: each animation is a function producing a target pose;
 * the rig blends toward it every frame, so transitions are always smooth.
 * Conventions: limbs hang along −y; −x rotation swings a limb forward,
 * +x on a shin bends the knee, −x on a forearm bends the elbow, +x on the head looks down.
 */
import type { AnimName } from '../game/core/world';

export const JOINTS = ['spine', 'chest', 'neck', 'head', 'lUpper', 'lFore', 'rUpper', 'rFore', 'lThigh', 'lShin', 'lFoot', 'rThigh', 'rShin', 'rFoot'] as const;
export type Joint = (typeof JOINTS)[number];

export interface Pose {
  j: Record<Joint, [number, number, number]>;
  rootY: number;
  rootPitch: number;
}

export function emptyPose(): Pose {
  const j = {} as Pose['j'];
  for (const k of JOINTS) j[k] = [0, 0, 0];
  return { j, rootY: 0, rootPitch: 0 };
}

function cycle(p: Pose, ph: number, A: number, flex: number, arm: number, fore: number, lean: number, bob: number) {
  const s = Math.sin(ph), c = Math.cos(ph);
  p.j.lThigh[0] = -s * A; p.j.rThigh[0] = s * A;
  p.j.lShin[0] = 0.08 + Math.max(0, c) * flex;
  p.j.rShin[0] = 0.08 + Math.max(0, -c) * flex;
  p.j.lFoot[0] = -(p.j.lThigh[0] + p.j.lShin[0]) * 0.5 + 0.1;
  p.j.rFoot[0] = -(p.j.rThigh[0] + p.j.rShin[0]) * 0.5 + 0.1;
  p.j.lUpper[0] = s * arm; p.j.rUpper[0] = -s * arm;
  p.j.lFore[0] = -fore; p.j.rFore[0] = -fore;
  p.j.spine[0] = lean; p.j.spine[1] = s * 0.07;
  p.j.chest[1] = -s * 0.1;
  p.j.head[0] = -lean * 0.6;
  p.rootY = -Math.abs(c) * bob;
}

export function computePose(anim: AnimName, ph: number, t: number, p: Pose): void {
  for (const k of JOINTS) { p.j[k][0] = 0; p.j[k][1] = 0; p.j[k][2] = 0; }
  p.rootY = 0; p.rootPitch = 0;
  // resting arms
  p.j.lUpper[2] = 0.09; p.j.rUpper[2] = -0.09; p.j.lFore[0] = -0.12; p.j.rFore[0] = -0.12;
  const breathe = Math.sin(t * 1.7) * 0.025;
  switch (anim) {
    case 'idle':
      p.j.chest[0] = breathe; p.j.head[1] = Math.sin(t * 0.37) * 0.15; p.j.head[0] = Math.sin(t * 0.23) * 0.05;
      p.j.lUpper[0] = breathe; p.j.rUpper[0] = breathe; break;
    case 'talk':
      p.j.chest[0] = breathe; p.j.rUpper[0] = -0.45 + Math.sin(t * 2) * 0.15; p.j.rFore[0] = -1.0 + Math.sin(t * 3.1) * 0.3; p.j.head[2] = Math.sin(t * 1.3) * 0.08; break;
    case 'walk': cycle(p, ph, 0.45, 0.85, 0.35, 0.25, 0.04, 0.03); break;
    case 'run': cycle(p, ph, 0.8, 1.4, 0.7, 1.1, 0.16, 0.06); break;
    case 'sprint': cycle(p, ph, 1.0, 1.75, 1.0, 1.45, 0.3, 0.08); break;
    case 'crouchIdle': case 'crouchWalk': {
      const w = anim === 'crouchWalk' ? 0.25 : 0;
      const s = Math.sin(ph) * w;
      p.rootY = -0.42;
      p.j.lThigh[0] = -1.3 - s; p.j.rThigh[0] = -1.3 + s;
      p.j.lShin[0] = 1.9 + Math.max(0, Math.cos(ph)) * w; p.j.rShin[0] = 1.9 + Math.max(0, -Math.cos(ph)) * w;
      p.j.lFoot[0] = -0.55; p.j.rFoot[0] = -0.55;
      p.j.spine[0] = 0.45; p.j.head[0] = -0.35;
      p.j.lUpper[0] = -0.35 + s; p.j.rUpper[0] = -0.35 - s; p.j.lFore[0] = -0.6; p.j.rFore[0] = -0.6;
      break;
    }
    case 'jump':
      p.j.lThigh[0] = -0.9; p.j.rThigh[0] = -0.15; p.j.lShin[0] = 1.2; p.j.rShin[0] = 0.4;
      p.j.lUpper[0] = -0.7; p.j.rUpper[0] = -0.7; p.j.lUpper[2] = 0.4; p.j.rUpper[2] = -0.4; p.j.spine[0] = 0.1; break;
    case 'fall':
      p.j.lThigh[0] = -0.4; p.j.rThigh[0] = 0.1; p.j.lShin[0] = 0.6; p.j.rShin[0] = 0.3;
      p.j.lUpper[2] = 1.1; p.j.rUpper[2] = -1.1; p.j.lUpper[0] = -0.3; p.j.rUpper[0] = -0.3; break;
    case 'land':
      p.rootY = -0.28; p.j.lThigh[0] = -0.8; p.j.rThigh[0] = -0.8; p.j.lShin[0] = 1.3; p.j.rShin[0] = 1.3;
      p.j.lFoot[0] = -0.5; p.j.rFoot[0] = -0.5; p.j.spine[0] = 0.4; p.j.lUpper[0] = -0.4; p.j.rUpper[0] = -0.4; break;
    case 'interact': case 'openDoor':
      p.j.rUpper[0] = -1.35; p.j.rUpper[2] = 0.1; p.j.rFore[0] = -0.25; p.j.spine[0] = 0.08; p.j.chest[1] = 0.15; break;
    case 'reach':
      p.j.rUpper[0] = -2.1 + Math.sin(t * 1.5) * 0.25; p.j.rUpper[2] = -0.2 + Math.cos(t * 1.1) * 0.2; p.j.rFore[0] = -0.1; p.j.head[0] = -0.3; p.j.neck[2] = 0.3; break;
    case 'pickup':
      p.rootY = -0.34; p.j.spine[0] = 0.85; p.j.lThigh[0] = -0.9; p.j.rThigh[0] = -0.9; p.j.lShin[0] = 1.3; p.j.rShin[0] = 1.3;
      p.j.lFoot[0] = -0.4; p.j.rFoot[0] = -0.4; p.j.rUpper[0] = -0.9; p.j.rFore[0] = -0.2; p.j.head[0] = 0.2; break;
    case 'inspect':
      p.j.lUpper[0] = -0.95; p.j.rUpper[0] = -0.95; p.j.lFore[0] = -1.35; p.j.rFore[0] = -1.35;
      p.j.lUpper[2] = -0.25; p.j.rUpper[2] = 0.25; p.j.head[0] = 0.35 + breathe; break;
    case 'computer':
      p.j.lUpper[0] = -0.65; p.j.rUpper[0] = -0.65; p.j.lFore[0] = -1.0 + Math.sin(t * 17) * 0.05; p.j.rFore[0] = -1.0 + Math.sin(t * 19 + 1) * 0.05;
      p.j.lUpper[2] = -0.12; p.j.rUpper[2] = 0.12; p.j.head[0] = 0.2; p.j.spine[0] = 0.12; break;
    case 'hurt':
      p.j.spine[0] = -0.35; p.j.head[0] = -0.4; p.j.lUpper[2] = 0.6; p.j.rUpper[2] = -0.6; p.j.lUpper[0] = -0.5; p.j.rUpper[0] = -0.5; break;
    case 'stumble':
      p.j.spine[0] = 0.5; p.j.rUpper[0] = -1.2; p.j.rUpper[2] = -0.4; p.j.lThigh[0] = -0.6; p.j.lShin[0] = 0.8; break;
    case 'death':
      p.rootPitch = -1.5; p.rootY = 0.12; p.j.lUpper[2] = 1.3; p.j.rUpper[2] = -1.2; p.j.head[1] = 0.6; p.j.lThigh[0] = -0.2; p.j.rShin[0] = 0.4; break;
    case 'lying':
      p.rootPitch = -1.57; p.rootY = 0.14 + breathe * 0.3; p.j.head[0] = -0.1; p.j.lUpper[2] = 0.15; p.j.rUpper[2] = -0.15; break;
    case 'sit':
      p.rootY = -0.47; p.j.lThigh[0] = -1.55; p.j.rThigh[0] = -1.55; p.j.lShin[0] = 1.55; p.j.rShin[0] = 1.55; p.j.lUpper[0] = -0.5; p.j.rUpper[0] = -0.5; p.j.lFore[0] = -0.7; p.j.rFore[0] = -0.7; break;
  }
}
