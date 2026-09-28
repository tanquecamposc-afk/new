/** Machinery with animation: servers, generators, reactor, Temporal Core, anchors, consoles, pod. */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { B, C } from '../primitives';
import { getMaterials, glow } from '../materials';
import { screenMaterial } from '../screens';
import { world } from '../../game/core/world';
import { at, SYMBOL_GLYPH } from '../../game/core/constants';
import { ANCHOR_GLYPH } from '../../game/systems/PuzzleSystem';
import { textTexture } from '../textures';
import { Computer } from './Furniture';

export function ServerRack() {
  const leds = useMemo(() => {
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.018, 0.018), new THREE.MeshBasicMaterial({ toneMapped: false }), 48);
    const o = new THREE.Object3D();
    for (let i = 0; i < 48; i++) {
      o.position.set(-0.3 + (i % 6) * 0.05, 0.25 + Math.floor(i / 6) * 0.23, 0.506);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
      im.setColorAt(i, new THREE.Color(i % 7 === 0 ? '#ffaa00' : '#33ff88').multiplyScalar(2.5));
    }
    return im;
  }, []);
  const col = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (Math.floor(t * 8) % 2) return;
    for (let i = 0; i < 48; i++) {
      const on = Math.sin(t * (3 + (i % 5)) + i * 1.7) > -0.2 && world.light.power > 0.3;
      col.set(i % 7 === 0 ? '#ffaa00' : '#33ff88').multiplyScalar(on ? 2.5 : 0.05);
      leds.setColorAt(i, col);
    }
    if (leds.instanceColor) leds.instanceColor.needsUpdate = true;
  });
  return (
    <group>
      <B p={[0, 1.05, 0]} s={[0.8, 2.1, 1.0]} m="blackMetal" />
      {Array.from({ length: 8 }, (_, i) => <B key={i} p={[0, 0.25 + i * 0.23, 0.49]} s={[0.72, 0.18, 0.02]} m="darkPanel" />)}
      <B p={[0.3, 1.05, 0.5]} s={[0.04, 1.9, 0.02]} m="steel" />
      <primitive object={leds} />
    </group>
  );
}

export function SecurityConsole() {
  return (
    <group>
      <B p={[0, 0.45, 0]} s={[3.2, 0.9, 0.8]} m="darkPanel" />
      <B p={[0, 0.93, 0.1]} s={[3.3, 0.06, 0.9]} m="blackMetal" />
      {[-1.1, 0, 1.1].map((x) => (
        <group key={x} position={[x, 0.96, 0.15]}>
          <B p={[0, 0.3, -0.1]} s={[0.7, 0.46, 0.05]} m="plastic" />
          <mesh position={[0, 0.3, -0.07]} material={screenMaterial(x === 0 ? 'security' : x < 0 ? 'terminal' : 'security')}><planeGeometry args={[0.66, 0.42]} /></mesh>
        </group>
      ))}
      <B p={[0, 0.98, 0.4]} s={[1.2, 0.03, 0.2]} m="plastic" />
      {Array.from({ length: 10 }, (_, i) => <C key={i} p={[-1.4 + i * 0.1, 0.98, 0.45]} r={0.015} h={0.03} mat={i % 3 ? glowG : glowR} />)}
    </group>
  );
}
const glowG = glow('#3dff9a', 2.5);
const glowR = glow('#ff3a30', 2.5);
const glowA = glow('#ffb03a', 2.5);

export function Generator({ index }: { index: number }) {
  const fan = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.Mesh>(null);
  const spin = useRef(0);
  useFrame((_, dt) => {
    const on = world.generators[index];
    spin.current += ((on ? 18 : 0) - spin.current) * Math.min(1, dt * 0.8);
    if (fan.current) fan.current.rotation.z += spin.current * dt;
    if (lamp.current) lamp.current.material = on ? glowG : glowR;
  });
  return (
    <group>
      <B p={[0, 0.1, 0]} s={[2.2, 0.2, 1.0]} m="blackMetal" />
      <B p={[-0.3, 0.8, 0]} s={[1.4, 1.2, 0.9]} m="yellow" />
      <C p={[0.8, 0.7, 0]} r={0.35} h={0.9} m="darkPanel" rot={[0, 0, Math.PI / 2]} />
      <group position={[-0.3, 0.8, 0.46]}>
        <C p={[0, 0, 0]} r={0.36} h={0.04} m="blackMetal" rot={[Math.PI / 2, 0, 0]} />
        <group ref={fan} position={[0, 0, 0.03]}>
          {[0, 1, 2, 3, 4].map((i) => <B key={i} p={[Math.cos((i * Math.PI * 2) / 5) * 0.15, Math.sin((i * Math.PI * 2) / 5) * 0.15, 0]} r={[0, 0.3, (i * Math.PI * 2) / 5]} s={[0.28, 0.08, 0.01]} m="steel" cast={false} />)}
        </group>
      </group>
      <C p={[-0.9, 1.7, -0.2]} r={0.08} h={0.6} m="steel" />
      <mesh ref={lamp} position={[0.4, 1.3, 0.46]} material={glowR}><circleGeometry args={[0.05, 12]} /></mesh>
      <B p={[0.1, 1.1, 0.455]} s={[0.3, 0.2, 0.01]} m="blackMetal" cast={false} />
    </group>
  );
}

export function Reactor() {
  const rings = useRef<THREE.Group>(null);
  const core = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }, dt) => {
    const over = world.t >= at('12:59') ? (world.t - at('12:59')) / 60 : 0;
    if (rings.current) rings.current.rotation.y += dt * (0.4 + over * 3);
    const pulse = 0.6 + Math.sin(clock.elapsedTime * (2 + over * 12)) * 0.25;
    const c = new THREE.Color('#ff8a2a').lerp(new THREE.Color('#ff1a10'), Math.min(1, over * 1.5));
    if (core.current) { core.current.emissive.copy(c); core.current.emissiveIntensity = (1.5 + over * 4) * pulse; }
    if (light.current) { light.current.color.copy(c); light.current.intensity = (14 + over * 50) * pulse; }
  });
  return (
    <group>
      <C p={[0, 0.25, 0]} r={2.6} h={0.5} m="plate" seg={32} />
      <C p={[0, 2.4, 0]} r={1.5} h={3.8} m="darkPanel" seg={32} />
      <mesh position={[0, 2.4, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 3.2, 32, 1, true]} />
        <meshStandardMaterial ref={core} color="#200a04" emissive="#ff8a2a" emissiveIntensity={1.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {[0.9, 2.4, 3.9].map((y) => <C key={y} p={[0, y, 0]} r={1.62} h={0.18} m="steel" seg={32} />)}
      <group ref={rings}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <B key={i} p={[Math.cos((i / 6) * Math.PI * 2) * 1.55, 2.4, Math.sin((i / 6) * Math.PI * 2) * 1.55]} r={[0, -(i / 6) * Math.PI * 2, 0]} s={[0.12, 3.6, 0.3]} m="blackMetal" />
        ))}
      </group>
      <C p={[0, 4.7, 0]} r={1.8} rb={1.5} h={0.6} m="darkPanel" seg={32} />
      {[0, 1, 2, 3].map((i) => (
        <C key={i} p={[Math.cos(i * 1.57 + 0.78) * 2.2, 3.5, Math.sin(i * 1.57 + 0.78) * 2.2]} r={0.18} h={7} m="copper" />
      ))}
      <pointLight ref={light} position={[0, 2.4, 2.2]} color="#ff8a2a" intensity={14} distance={16} decay={1.6} />
    </group>
  );
}

export function TemporalCore() {
  const r1 = useRef<THREE.Group>(null);
  const r2 = useRef<THREE.Group>(null);
  const r3 = useRef<THREE.Group>(null);
  const sphere = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }, dt) => {
    const f = world.final;
    const speed = world.frozen ? 0.02 : 1 + f.stage * 0.8;
    if (r1.current) { r1.current.rotation.x += dt * 0.5 * speed; r1.current.rotation.y += dt * 0.2 * speed; }
    if (r2.current) { r2.current.rotation.z += dt * 0.4 * speed; r2.current.rotation.x -= dt * 0.25 * speed; }
    if (r3.current) r3.current.rotation.y -= dt * 0.7 * speed;
    const p = 0.8 + Math.sin(clock.elapsedTime * 2.2) * 0.2;
    const col = f.broken ? new THREE.Color('#ffffff') : new THREE.Color('#6f5cff').lerp(new THREE.Color('#48d8ff'), (Math.sin(clock.elapsedTime * 0.5) + 1) / 2);
    if (sphere.current) { sphere.current.emissive.copy(col); sphere.current.emissiveIntensity = 2.5 * p + f.stage; }
    if (light.current) { light.current.color.copy(col); light.current.intensity = (20 + f.stage * 12) * p; }
  });
  return (
    <group>
      <C p={[0, 0.15, 0]} r={3.2} h={0.3} m="plate" seg={48} />
      <C p={[0, 0.35, 0]} r={2.6} rb={2.8} h={0.2} m="darkPanel" seg={48} />
      {Array.from({ length: 12 }, (_, i) => (
        <B key={i} p={[Math.cos((i / 12) * Math.PI * 2) * 2.4, 1.2, Math.sin((i / 12) * Math.PI * 2) * 2.4]} r={[0, -(i / 12) * Math.PI * 2, 0.15]} s={[0.12, 1.8, 0.2]} m="blackMetal" />
      ))}
      <mesh position={[0, 3.2, 0]}>
        <sphereGeometry args={[0.8, 32, 16]} />
        <meshStandardMaterial ref={sphere} color="#0a0620" emissive="#6f5cff" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <group position={[0, 3.2, 0]}>
        <group ref={r1}><mesh material={getMaterials().steel} castShadow><torusGeometry args={[1.7, 0.07, 10, 64]} /></mesh></group>
        <group ref={r2}><mesh material={getMaterials().brass} castShadow><torusGeometry args={[2.1, 0.05, 10, 64]} /></mesh></group>
        <group ref={r3} rotation={[Math.PI / 2, 0, 0]}><mesh material={getMaterials().steel} castShadow><torusGeometry args={[2.5, 0.09, 10, 64]} /></mesh></group>
      </group>
      <C p={[0, 6.4, 0]} r={0.6} rb={0.25} h={3.2} m="darkPanel" />
      <pointLight ref={light} position={[0, 3.2, 0]} intensity={20} distance={22} decay={1.4} color="#6f5cff" />
    </group>
  );
}

export function CoreConsole() {
  return (
    <group>
      <B p={[0, 0.5, 0]} s={[2.4, 1.0, 0.8]} m="darkPanel" />
      <B p={[0, 1.05, 0.05]} s={[2.5, 0.08, 0.9]} m="blackMetal" r={[-0.25, 0, 0]} />
      <B p={[0, 1.5, -0.3]} s={[1.6, 0.7, 0.06]} m="plastic" />
      <mesh position={[0, 1.5, -0.265]} material={screenMaterial('core')}><planeGeometry args={[1.5, 0.62]} /></mesh>
      {Array.from({ length: 8 }, (_, i) => <C key={i} p={[-0.9 + i * 0.25, 1.1, 0.3]} r={0.03} h={0.04} mat={i % 2 ? glowA : glowG} rot={[-0.25, 0, 0]} />)}
    </group>
  );
}

const glyphTex: Record<string, THREE.Texture> = {};
export function Anchor({ index }: { index: number }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const g = ANCHOR_GLYPH[index];
  if (!glyphTex[g]) glyphTex[g] = textTexture([SYMBOL_GLYPH[g]], { w: 128, h: 128, bg: '#000', fg: '#fff', size: 90 });
  useFrame(({ clock }) => {
    if (!mat.current) return;
    const awake = world.anchors[index];
    const armed = world.final.active;
    const v = awake ? 3 : armed ? 0.6 + Math.sin(clock.elapsedTime * 4 + index) * 0.4 : 0.15;
    mat.current.color.set(awake ? '#ffffff' : '#8a7dff').multiplyScalar(v);
  });
  return (
    <group>
      <B p={[0, 0.1, 0]} s={[1.0, 0.2, 1.0]} m="plate" />
      <B p={[0, 1.35, 0]} s={[0.7, 2.5, 0.7]} m="blackMetal" />
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} position={[Math.sin((k * Math.PI) / 2) * 0.352, 1.7, Math.cos((k * Math.PI) / 2) * 0.352]} rotation={[0, (k * Math.PI) / 2, 0]}>
          <planeGeometry args={[0.45, 0.45]} />
          <meshBasicMaterial ref={k === 0 ? mat : undefined} map={glyphTex[g]} toneMapped={false} transparent blending={THREE.AdditiveBlending} color="#8a7dff" />
        </mesh>
      ))}
    </group>
  );
}

export function Pod() {
  return (
    <group>
      <C p={[0, 0.15, 0]} r={0.75} h={0.3} m="darkPanel" seg={24} />
      <C p={[0, 2.45, 0]} r={0.75} h={0.3} m="darkPanel" seg={24} />
      <mesh position={[0, 1.3, 0]} material={frost}><cylinderGeometry args={[0.68, 0.68, 2.0, 24, 1, true]} /></mesh>
      {/* the body inside */}
      <group position={[0, 0.4, 0]} rotation={[0.1, 0.4, 0.2]}>
        <C p={[0, 0.7, 0]} r={0.2} rb={0.16} h={0.9} m="whitePlastic" />
        <mesh position={[0, 1.3, 0.05]} material={skinCold}><sphereGeometry args={[0.12, 16, 12]} /></mesh>
        <C p={[0.08, 0.1, 0]} r={0.07} h={0.6} m="fabric" />
        <C p={[-0.08, 0.1, 0]} r={0.07} h={0.6} m="fabric" />
      </group>
      <pointLight position={[0, 2.2, 0]} color="#9fe0ff" intensity={2} distance={3} />
      {[0, 1, 2].map((i) => <C key={i} p={[Math.cos(i * 2.1) * 0.72, 1.3, Math.sin(i * 2.1) * 0.72]} r={0.03} h={2} m="steel" />)}
    </group>
  );
}
const frost = new THREE.MeshStandardMaterial({ color: '#cfefff', roughness: 0.2, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, emissive: '#1d3440', emissiveIntensity: 0.4 });
const skinCold = new THREE.MeshStandardMaterial({ color: '#9aa7ad', roughness: 0.6 });

export { Computer };
