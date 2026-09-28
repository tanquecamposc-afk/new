/** Sliding doors, the Core vault door, the elevator and the hidden Sector 7 wall. */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DOORS, type DoorDef } from '../game/data/level';
import { world } from '../game/core/world';
import { getMaterials, glow, worldBox, WALL_MAT } from './materials';
import { B } from './primitives';
import { textTexture } from './textures';
import { doorUsable } from '../game/systems/DoorSystem';
import { visibleRooms } from './visibility';
import { roomById } from '../game/data/level';

const green = glow('#38ff8c', 3), red = glow('#ff2a20', 3), amber = glow('#ffb020', 3);

function Door({ d }: { d: DoorDef }) {
  const root = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.Mesh>(null);
  const h = d.height ?? 2.5;
  const w = d.width;
  const m = getMaterials();
  const sign = useMemo(() => textTexture([d.label], { w: 512, h: 96, bg: '#0d1114', fg: d.kind === 'elevator' ? '#7dffb0' : '#dfe6ea', border: d.kind === 'core' ? '#6f5cff' : undefined }), [d]);
  const signMat = useMemo(() => new THREE.MeshBasicMaterial({ map: sign, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) }), [sign]);
  const rot = d.axis === 'x' ? 0 : Math.PI / 2;
  const roomH = Math.min(roomById(d.rooms[0]).height, roomById(d.rooms[1]).height);
  const panelMat = d.kind === 'elevator' ? m.steel : d.kind === 'core' ? m.darkPanel : d.kind === 'keypad' || d.kind === 'power' ? m.panel : m.metal;
  const hiddenMat = m[WALL_MAT[roomById('RESTRICTED').wall]];

  useFrame(({ clock }) => {
    if (root.current) root.current.visible = visibleRooms.has(d.rooms[0]) || visibleRooms.has(d.rooms[1]);
    const s = world.doors[d.id];
    const o = s.open;
    if (d.kind === 'hidden') {
      if (left.current) {
        left.current.visible = o < 0.98;
        left.current.scale.y = 1 - o;
        left.current.position.x = o > 0 ? Math.sin(clock.elapsedTime * 60) * 0.03 * (1 - o) : 0;
      }
      return;
    }
    if (d.kind === 'core') {
      if (left.current) left.current.position.y = o * (h - 0.1);
      if (right.current) right.current.position.y = -o * 0.6;
    } else {
      if (left.current) left.current.position.x = -o * (w / 2 - 0.05);
      if (right.current) right.current.position.x = o * (w / 2 - 0.05);
    }
    if (lamp.current) {
      const usable = doorUsable(d, 'player');
      lamp.current.material = d.kind === 'timed' && !usable ? amber : usable || o > 0.5 ? green : red;
    }
  });

  if (d.kind === 'arch') {
    return (
      <group ref={root} position={[d.x, 0, d.z]} rotation={[0, rot, 0]}>
        <B p={[-w / 2 - 0.08, h / 2, 0]} s={[0.16, h, 0.5]} m="blackMetal" />
        <B p={[w / 2 + 0.08, h / 2, 0]} s={[0.16, h, 0.5]} m="blackMetal" />
      </group>
    );
  }
  if (d.kind === 'hidden') {
    return (
      <group ref={root} position={[d.x, 0, d.z]} rotation={[0, rot, 0]}>
        <group ref={left}>
          <mesh geometry={worldBox(w, roomH, 0.5, 2.4)} material={hiddenMat} position={[0, roomH / 2, 0]} castShadow receiveShadow />
        </group>
      </group>
    );
  }
  return (
    <group ref={root} position={[d.x, 0, d.z]} rotation={[0, rot, 0]}>
      {/* frame */}
      <B p={[-w / 2 - 0.1, h / 2, 0]} s={[0.2, h, 0.56]} m="blackMetal" />
      <B p={[w / 2 + 0.1, h / 2, 0]} s={[0.2, h, 0.56]} m="blackMetal" />
      <B p={[0, h + 0.1, 0]} s={[w + 0.4, 0.2, 0.56]} m="blackMetal" />
      <B p={[0, 0.01, 0]} s={[w, 0.02, 0.5]} m="steel" cast={false} />
      {d.kind === 'jammed' && <B p={[0, h + 0.3, 0]} s={[w + 0.4, 0.08, 0.6]} m="yellow" />}
      {d.kind === 'core' ? (
        <>
          <group ref={left}><B p={[0, h * 0.55, 0]} s={[w, h * 0.9, 0.3]} m="darkPanel" />
            <mesh position={[0, h * 0.55, 0.16]}><ringGeometry args={[0.6, 0.72, 48]} /><meshBasicMaterial color={new THREE.Color('#6f5cff').multiplyScalar(1.6)} toneMapped={false} /></mesh>
            <mesh position={[0, h * 0.55, -0.16]} rotation={[0, Math.PI, 0]}><ringGeometry args={[0.6, 0.72, 48]} /><meshBasicMaterial color={new THREE.Color('#6f5cff').multiplyScalar(1.6)} toneMapped={false} /></mesh>
            <B p={[0, h * 0.55, 0]} s={[w, 0.12, 0.34]} m="yellow" />
          </group>
          <group ref={right}><B p={[0, h * 0.05, 0]} s={[w, h * 0.1, 0.3]} m="blackMetal" /></group>
        </>
      ) : (
        <>
          <group ref={left}>
            <mesh geometry={worldBox(w / 2, h, 0.08, 1.5)} material={panelMat} position={[-w / 4, h / 2, 0]} castShadow receiveShadow />
            <B p={[-0.06, h / 2, 0.05]} s={[0.04, h * 0.8, 0.02]} m="blackMetal" cast={false} />
            {d.kind !== 'elevator' && <mesh position={[-w / 4, h * 0.7, 0.045]} material={m.glass}><planeGeometry args={[w * 0.25, 0.5]} /></mesh>}
          </group>
          <group ref={right}>
            <mesh geometry={worldBox(w / 2, h, 0.08, 1.5)} material={panelMat} position={[w / 4, h / 2, 0]} castShadow receiveShadow />
            <B p={[0.06, h / 2, 0.05]} s={[0.04, h * 0.8, 0.02]} m="blackMetal" cast={false} />
            {d.kind !== 'elevator' && <mesh position={[w / 4, h * 0.7, 0.045]} material={m.glass}><planeGeometry args={[w * 0.25, 0.5]} /></mesh>}
          </group>
          {(d.kind === 'power' || d.kind === 'keycard' || d.kind === 'jammed' || d.kind === 'keypad') && (
            <>
              <B p={[0, h * 0.35, 0.05]} s={[w, 0.12, 0.01]} m="yellow" cast={false} />
              <B p={[0, h * 0.35, -0.05]} s={[w, 0.12, 0.01]} m="yellow" cast={false} />
            </>
          )}
        </>
      )}
      {/* status lamp + signs */}
      <mesh ref={lamp} position={[0, h + 0.1, 0.29]} material={red}><boxGeometry args={[0.24, 0.05, 0.02]} /></mesh>
      <mesh position={[0, h + 0.1, -0.29]} material={green}><boxGeometry args={[0.24, 0.05, 0.02]} /></mesh>
      {roomH > h + 0.55 && (
        <>
          <mesh position={[0, h + 0.42, 0.29]} material={signMat}><planeGeometry args={[Math.min(1.6, w + 0.2), 0.3]} /></mesh>
          <mesh position={[0, h + 0.42, -0.29]} rotation={[0, Math.PI, 0]} material={signMat}><planeGeometry args={[Math.min(1.6, w + 0.2), 0.3]} /></mesh>
        </>
      )}
    </group>
  );
}

export function Doors() {
  return <group>{DOORS.map((d) => <Door key={d.id} d={d} />)}</group>;
}
