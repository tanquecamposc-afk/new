/** Player, NPCs, The Observer, and dynamic crates — visuals driven by the simulation each frame. */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { world } from '../game/core/world';
import { view } from '../game/core/view';
import { playerAnim } from '../game/systems/PlayerSystem';
import { Humanoid, LOOKS, type RigState } from './Humanoid';
import { G } from '../game/core/store';
import { Crate } from '../world/props/Furniture';
import { coneTexture } from '../world/textures';
import { visibleRooms } from '../world/visibility';
import { roomAt } from '../game/data/level';

export function Player({ shadows }: { shadows: boolean }) {
  const g = useRef<THREE.Group>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const beam = useRef<THREE.Mesh>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const state = useRef<RigState>({ anim: 'idle', speed: 0 });
  useFrame(() => {
    const p = world.player;
    const anim = playerAnim();
    state.current.anim = anim;
    state.current.speed = p.speed;
    state.current.flashlight = p.flashlightOn;
    if (g.current) {
      if (anim === 'lying') { g.current.position.set(-7.75, 0.42, 13.3); g.current.rotation.y = Math.PI / 2; }
      else { g.current.position.copy(p.pos); g.current.rotation.y = p.yaw; }
      // hide the body when the camera is inside it (tight corners)
      g.current.visible = view.camPos.distanceTo(p.pos.clone().setY(p.pos.y + 1.4)) > 0.45 || G().phase === 'CUTSCENE';
    }
    const on = p.flashlightOn && !world.cctv.active;
    if (spot.current) {
      const h = p.pos.clone();
      h.y += p.crouching ? 0.9 : 1.35;
      h.x += Math.sin(p.yaw) * 0.3 - Math.cos(p.yaw) * 0.18;
      h.z += Math.cos(p.yaw) * 0.3 + Math.sin(p.yaw) * 0.18;
      spot.current.position.copy(h);
      const dir = view.shot ? new THREE.Vector3(Math.sin(p.yaw), -0.1, Math.cos(p.yaw)) : view.camDir.clone();
      target.position.copy(h).addScaledVector(dir, 6);
      target.updateMatrixWorld();
      const flick = p.battery < 15 ? (Math.random() < 0.1 ? 0.2 : 1) : 1;
      spot.current.intensity = on ? 38 * flick * Math.min(1, 0.4 + p.battery / 60) : 0;
      if (beam.current) {
        beam.current.visible = on;
        beam.current.position.copy(h);
        beam.current.lookAt(target.position);
      }
    }
  });
  return (
    <>
      <group ref={g}><Humanoid look={LOOKS.player} state={() => state.current} /></group>
      <primitive object={target} />
      <spotLight ref={spot} target={target} angle={0.42} penumbra={0.55} distance={22} decay={1.6} color="#fff1d8" castShadow={shadows} shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.0008} shadow-camera-near={0.2} />
      <mesh ref={beam}>
        <primitive object={beamGeo} attach="geometry" />
        <meshBasicMaterial map={beamTex} transparent opacity={0.07} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} color="#fff1d8" />
      </mesh>
    </>
  );
}
const beamGeo = new THREE.ConeGeometry(2.2, 8, 24, 1, true).translate(0, -4, 0).rotateX(-Math.PI / 2);
const beamTex = typeof document !== 'undefined' ? (() => { const t = coneTexture(); t.rotation = Math.PI; t.center.set(0.5, 0.5); return t; })() : null;
export function NPC({ id }: { id: 'kane' | 'maya' }) {
  const g = useRef<THREE.Group>(null);
  const state = useRef<RigState>({ anim: 'idle', speed: 0 });
  const prev = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    const n = world[id];
    const visible = n.present && visibleRooms.has(roomAt(n.pos.x, n.pos.z)?.id ?? 'HUB');
    if (!g.current) return;
    g.current.visible = visible;
    if (!visible) return;
    const sp = prev.current.distanceTo(n.pos) / Math.max(dt, 1e-3);
    prev.current.copy(n.pos);
    g.current.position.copy(n.pos);
    g.current.rotation.y = n.yaw;
    state.current.anim = n.anim;
    state.current.speed = Math.min(sp, 4);
    state.current.headYaw = n.headYaw;
    // Kane fading out of existence at the end of his route
    const v = n.vanishing;
    state.current.glitch = v > 0 ? Math.min(1, v) : 0;
    g.current.scale.setScalar(v > 0 ? Math.max(0.001, 1 - Math.max(0, v - 1.2)) : 1);
  });
  return <group ref={g}><Humanoid look={LOOKS[id]} state={() => state.current} /></group>;
}

/** Anomaly: a second, motionless Kane in the Dormitory. */
export function DuplicateKane() {
  const g = useRef<THREE.Group>(null);
  const state = useRef<RigState>({ anim: 'idle', speed: 0 });
  useFrame(() => {
    if (!g.current) return;
    g.current.visible = world.anomalies.includes('DUPLICATE_KANE') && visibleRooms.has('DORM');
    const p = world.player.pos;
    const facing = Math.hypot(p.x + 22.9, p.z + 1.8) < 4 ? Math.atan2(p.x + 22.9, p.z + 1.8) : -Math.PI / 2;
    g.current.rotation.y = facing;
  });
  return <group ref={g} position={[-22.9, 0, -1.8]}><Humanoid look={LOOKS.kane} state={() => state.current} /></group>;
}

export function Observer() {
  const g = useRef<THREE.Group>(null);
  const state = useRef<RigState>({ anim: 'idle', speed: 0, glitch: 0.4 });
  const layerSet = useRef<boolean | null>(null);
  const prev = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    const o = world.observer;
    if (!g.current) return;
    g.current.visible = o.visible && o.opacity > 0.02;
    g.current.position.copy(o.pos);
    g.current.rotation.y = o.yaw;
    const sp = prev.current.distanceTo(o.pos) / Math.max(dt, 1e-3);
    prev.current.copy(o.pos);
    state.current.anim = o.anim;
    state.current.speed = Math.min(sp, 5);
    state.current.opacity = o.opacity;
    state.current.glitch = o.mode === 'DISAPPEARING' ? 1 : o.mode === 'HUNTING' ? 0.6 : 0.25;
    // CCTV-only apparitions live on layer 1 (rendered only by security cameras)
    if (layerSet.current !== o.cctvOnly) {
      layerSet.current = o.cctvOnly;
      g.current.traverse((c) => c.layers.set(o.cctvOnly ? 1 : 0));
    }
  });
  const look = G().run.ngPlus > 0 ? LOOKS.observerNG : LOOKS.observer;
  return <group ref={g} name="observer"><Humanoid look={look} state={() => state.current} /></group>;
}

export function Crates() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    world.crates.forEach((c, i) => {
      const r = refs.current[i];
      if (r) r.position.set(c.pos.x, c.pos.y - c.size / 2, c.pos.z);
    });
  });
  return (
    <>
      {world.crates.map((c, i) => (
        <group key={i} ref={(r) => { refs.current[i] = r; }}><Crate size={c.size} /></group>
      ))}
    </>
  );
}
