/**
 * Cinematic third-person camera: mouse orbit, zoom, lag, wall avoidance,
 * shake, dynamic FOV; plus cutscene shots, CCTV views, dialogue framing and the menu orbit.
 */
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { view } from '../game/core/view';
import { world } from '../game/core/world';
import { Input } from '../game/core/input';
import { G } from '../game/core/store';
import { CCTV, roomAt } from '../game/data/level';
import { segmentCast, solidBoxes } from '../game/physics/colliders';
import { clamp, damp } from '../game/core/rng';
import { updateVisibility } from '../world/visibility';
import { isPlayPhase } from '../game/systems/Flow';

const desired = new THREE.Vector3();
const pivot = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const smoothPos = new THREE.Vector3(0, 3, 6);
const smoothLook = new THREE.Vector3();
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
let zoom = 3.1;
let initialised = false;

export function CameraRig() {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = G();
    const phase = st.phase;
    const settings = st.settings;
    const p = world.player;
    let fov = settings.fov;
    let cctv = false;

    if (view.shot) {
      // ── cutscene shot ──
      const s = view.shot;
      view.shotTime += dt;
      let k = clamp(view.shotTime / s.duration, 0, 1);
      if (s.ease === 'inOut') k = k * k * (3 - 2 * k);
      const to = s.to ?? s.from;
      tmpA.fromArray(s.from.pos).lerp(tmpB.fromArray(to.pos), k);
      smoothPos.copy(tmpA);
      tmpA.fromArray(s.from.target).lerp(tmpB.fromArray(to.target), k);
      smoothLook.copy(tmpA);
      fov = s.fov ?? 50;
    } else if (phase === 'MENU' || phase === 'LOADING' || view.menuOrbit) {
      // ── slow menu orbit through the Hub ──
      const t = clock.elapsedTime * 0.05;
      smoothPos.set(Math.sin(t) * 6.5, 2.4 + Math.sin(t * 1.7) * 0.4, Math.cos(t) * 5.5);
      smoothLook.set(Math.sin(t + 1.2) * 2, 1.4, -4);
      fov = 55;
    } else if (world.cctv.active) {
      // ── security camera view ──
      cctv = true;
      const c = CCTV[world.cctv.index];
      const pan = Math.sin(clock.elapsedTime * 0.25) * 0.8;
      tmpA.fromArray(c.target);
      // sit just in front of the camera housing so the dome model doesn't block the view
      smoothPos.fromArray(c.pos).add(tmpB.copy(tmpA).sub(smoothPos.fromArray(c.pos)).normalize().multiplyScalar(0.4));
      tmpB.set(-(tmpA.z - c.pos[2]), 0, tmpA.x - c.pos[0]).normalize();
      smoothLook.copy(tmpA).addScaledVector(tmpB, pan);
      fov = 72;
    } else {
      // ── third person ──
      const canLook = isPlayPhase(phase) && !!document.pointerLockElement;
      const [mx, my] = Input.takeMouse();
      const wheel = Input.takeWheel();
      if (canLook) {
        const sens = 0.0022 * settings.mouseSensitivity * settings.cameraSensitivity;
        view.yaw -= mx * sens;
        view.pitch = clamp(view.pitch + my * sens * (settings.invertY ? -1 : 1), -0.75, 1.0);
        zoom = clamp(zoom + wheel * 0.35, 1.4, 5);
      }
      // steer toward a forced focus point (first Observer sighting)
      if (view.focus && performance.now() < view.focus.until) {
        const dx = view.focus.x - p.pos.x, dz = view.focus.z - p.pos.z;
        const want = Math.atan2(-dx, -dz);
        let d = want - view.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        view.yaw += d * Math.min(1, dt * 4);
        view.pitch = damp(view.pitch, 0.05, 4, dt);
        fov -= 14;
      } else view.focus = null;

      const crouch = p.crouching ? 0.5 : 0;
      pivot.set(p.pos.x, p.pos.y + 1.55 - crouch, p.pos.z);
      // dialogue: frame the conversation over the shoulder
      let dist = zoom;
      if (phase === 'DIALOGUE') dist = Math.min(zoom, 2.2);
      if (phase === 'DEATH') { dist = 4.5; view.pitch = damp(view.pitch, 0.9, 1, dt); }
      const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
      const sy = Math.sin(view.yaw), cy = Math.cos(view.yaw);
      // shoulder offset (to the right of the view)
      const sh = phase === 'DIALOGUE' ? 0.55 : 0.42;
      const rx = cy * sh, rz = -sy * sh;
      desired.set(pivot.x + sy * cp * dist + rx, pivot.y + sp * dist, pivot.z + cy * cp * dist + rz);
      // wall avoidance: cast from pivot to desired camera position
      const hit = segmentCast(pivot.x, pivot.y, pivot.z, desired.x, desired.y, desired.z, solidBoxes(true), 0.18);
      if (hit < 1) desired.lerpVectors(pivot, desired, Math.max(0.08, hit - 0.04));
      // never rise through the ceiling
      const ceil = (roomAt(pivot.x, pivot.z)?.height ?? 3) - 0.25;
      if (desired.y > ceil) desired.y = ceil;
      if (!initialised) { smoothPos.copy(desired); initialised = true; }
      // lag: faster when pulled in by a wall so we never clip
      const lambda = hit < 1 ? 30 : 11;
      smoothPos.x = damp(smoothPos.x, desired.x, lambda, dt);
      smoothPos.y = damp(smoothPos.y, desired.y, lambda, dt);
      smoothPos.z = damp(smoothPos.z, desired.z, lambda, dt);
      lookTarget.set(pivot.x - sy * 4 + rx, pivot.y - sp * 1.5 + 0.1, pivot.z - cy * 4 + rz);
      smoothLook.copy(lookTarget);
      fov += world.fovBoost;
    }

    cam.position.copy(smoothPos);
    // camera shake (noise), stronger during resets / chases
    const sh = world.shake;
    if (sh > 0) {
      const t = clock.elapsedTime;
      cam.position.x += (Math.sin(t * 37) + Math.sin(t * 23.1)) * 0.03 * sh;
      cam.position.y += (Math.sin(t * 41.3) + Math.sin(t * 19.7)) * 0.03 * sh;
    }
    cam.lookAt(smoothLook);
    if (sh > 0) cam.rotation.z += Math.sin(clock.elapsedTime * 13) * 0.01 * sh;
    view.fov = damp(view.fov, fov, 5, dt);
    if (Math.abs(cam.fov - view.fov) > 0.01) { cam.fov = view.fov; cam.updateProjectionMatrix(); }
    // CCTV-only layer
    if (cctv) cam.layers.enable(1); else cam.layers.disable(1);
    view.camPos.copy(cam.position);
    cam.getWorldDirection(view.camDir);
    updateVisibility();
  }, -1);
  return null;
}
