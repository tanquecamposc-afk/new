/**
 * Wall fixtures, interactive props, pickups, documents, loop-to-loop variations,
 * anomalies and CCTV-only apparitions.
 */
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { world } from '../game/core/world';
import { G } from '../game/core/store';
import { CCTV } from '../game/data/level';
import { RELAY_POS, GENERATOR_POS } from '../game/systems/PuzzleSystem';
import { at, SYMBOL_GLYPH, SYMBOL_SEQUENCE } from '../game/core/constants';
import { mugState, loopN } from '../game/systems/Progression';
import { ARC_POS, arcActive } from '../game/systems/AnomalySystem';
import { B, C, S } from './primitives';
import { getMaterials, glow } from './materials';
import { textTexture } from './textures';
import { screenMaterial } from './screens';

type V3 = [number, number, number];
const m = () => getMaterials();
const gGreen = glow('#38ff8c', 3), gRed = glow('#ff2a20', 3), gAmber = glow('#ffb020', 2.5);

/** Wall-mounted item: `face` = direction it faces (rot quarter turns like props). */
function Wall({ p, face, children }: { p: V3; face: number; children: ReactNode }) {
  return <group position={p} rotation={[0, (face * Math.PI) / 2, 0]}>{children}</group>;
}

function Sign({ p, face, lines, w = 1.6, h = 0.4, fg, bg, stripes, glowy }: { p: V3; face: number; lines: string[]; w?: number; h?: number; fg?: string; bg?: string; stripes?: boolean; glowy?: boolean }) {
  const mat = useMemo(() => {
    const t = textTexture(lines, { w: 512, h: Math.round((512 * h) / w), fg, bg, stripes });
    return glowy ? new THREE.MeshBasicMaterial({ map: t, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 });
  }, [lines, w, h, fg, bg, stripes, glowy]);
  return <Wall p={p} face={face}><mesh material={mat}><planeGeometry args={[w, h]} /></mesh></Wall>;
}

function useVisible(ref: React.RefObject<THREE.Object3D | null>, fn: () => boolean) {
  useFrame(() => { if (ref.current) ref.current.visible = fn(); });
}

function OnLayer({ layer, children }: { layer: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => { ref.current?.traverse((o) => o.layers.set(layer)); });
  return <group ref={ref}>{children}</group>;
}

// ───────────────────────── puzzle fixtures ─────────────────────────
function RelayPanel({ id, face }: { id: 'A' | 'B' | 'C'; face: number }) {
  const lever = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const on = world.relays[id];
    if (lever.current) lever.current.rotation.x += ((on ? -0.9 : 0.9) - lever.current.rotation.x) * 0.15;
    if (lamp.current) lamp.current.material = on ? gGreen : Math.sin(clock.elapsedTime * 3) > 0 ? gAmber : gRed;
  });
  const [x, y, z] = RELAY_POS[id];
  return (
    <Wall p={[x, y, z]} face={face}>
      <B p={[0, 0, 0.06]} s={[0.7, 0.9, 0.12]} m="darkPanel" />
      <B p={[0, 0.38, 0.13]} s={[0.66, 0.1, 0.01]} m="yellow" cast={false} />
      <group ref={lever} position={[0, -0.05, 0.14]}>
        <C p={[0, 0.14, 0]} r={0.025} h={0.3} m="steel" />
        <S p={[0, 0.3, 0]} r={0.05} m="red" />
      </group>
      <mesh ref={lamp} position={[0.24, 0.22, 0.125]} material={gRed}><circleGeometry args={[0.04, 12]} /></mesh>
      <Sign p={[0, -0.34, 0.125]} face={0} lines={[`RELAY ${id}`]} w={0.5} h={0.12} />
    </Wall>
  );
}

function Keypad({ p, face, solved }: { p: V3; face: number; solved: () => boolean }) {
  const lamp = useRef<THREE.Mesh>(null);
  useFrame(() => { if (lamp.current) lamp.current.material = solved() ? gGreen : gRed; });
  return (
    <Wall p={p} face={face}>
      <B p={[0, 0, 0.03]} s={[0.22, 0.32, 0.06]} m="blackMetal" />
      {Array.from({ length: 12 }, (_, i) => <B key={i} p={[-0.06 + (i % 3) * 0.06, 0.06 - Math.floor(i / 3) * 0.05, 0.065]} s={[0.045, 0.035, 0.01]} m="steel" cast={false} />)}
      <mesh ref={lamp} position={[0, 0.12, 0.062]} material={gRed}><planeGeometry args={[0.12, 0.03]} /></mesh>
    </Wall>
  );
}

function SymbolPanel() {
  const glyphs = useMemo(() => textTexture(['△ ○ ◇', '✕ □ ∿'], { w: 256, h: 256, bg: '#05060a', fg: '#9a8cff', size: 60 }), []);
  const lamp = useRef<THREE.Mesh>(null);
  useFrame(() => { if (lamp.current) lamp.current.material = world.symbolSolved ? gGreen : gRed; });
  return (
    <Wall p={[7.72, 1.4, -12.8]} face={3}>
      <B p={[0, 0, 0.04]} s={[0.5, 0.6, 0.08]} m="blackMetal" />
      <mesh position={[0, 0, 0.085]}><planeGeometry args={[0.42, 0.42]} /><meshBasicMaterial map={glyphs} toneMapped={false} /></mesh>
      <mesh ref={lamp} position={[0, 0.26, 0.085]} material={gRed}><planeGeometry args={[0.3, 0.03]} /></mesh>
    </Wall>
  );
}

function RelayBoard() {
  const lamps = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    (['A', 'B', 'C'] as const).forEach((k, i) => { const l = lamps.current[i]; if (l) l.material = world.relays[k] ? gGreen : gRed; });
    const l = lamps.current[3]; if (l) l.material = world.symbolSolved ? gGreen : gRed;
  });
  return (
    <Wall p={[3.28, 1.8, -11]} face={1}>
      <B p={[0, 0, 0.03]} s={[1.2, 0.7, 0.06]} m="blackMetal" />
      <Sign p={[0, 0.22, 0.065]} face={0} lines={['CORE LOCKS']} w={0.9} h={0.14} />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(r) => { lamps.current[i] = r; }} position={[-0.39 + i * 0.26, -0.08, 0.065]} material={gRed}><circleGeometry args={[0.06, 16]} /></mesh>
      ))}
      <Sign p={[0, -0.24, 0.065]} face={0} lines={['A      B      C      ⌘']} w={1.0} h={0.12} />
    </Wall>
  );
}

function SecurityCam({ p, target }: { p: V3; target: V3 }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => { ref.current?.lookAt(new THREE.Vector3(...target)); });
  return (
    <group position={p}>
      <B p={[0, 0.12, 0]} s={[0.12, 0.2, 0.12]} m="blackMetal" />
      <group ref={ref}>
        <B p={[0, 0, 0.08]} s={[0.14, 0.12, 0.28]} m="whitePlastic" />
        <C p={[0, 0, 0.23]} r={0.045} h={0.04} m="blackMetal" rot={[Math.PI / 2, 0, 0]} />
        <mesh position={[0.05, 0.05, 0.22]} material={gRed}><sphereGeometry args={[0.012, 6, 6]} /></mesh>
      </group>
    </group>
  );
}

function WallClock({ p, face, wrongAnomaly }: { p: V3; face: number; wrongAnomaly?: boolean }) {
  const hh = useRef<THREE.Mesh>(null), mm = useRef<THREE.Mesh>(null), ss = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const wrong = wrongAnomaly && world.anomalies.includes('WRONG_CLOCK');
    const secs = wrong ? 3 * 3600 + 13 * 60 - clock.elapsedTime : 12 * 3600 + 47 * 60 + world.t;
    const s = secs % 60, mi = (secs / 60) % 60, h = (secs / 3600) % 12;
    if (ss.current) ss.current.rotation.z = -(s / 60) * Math.PI * 2;
    if (mm.current) mm.current.rotation.z = -(mi / 60) * Math.PI * 2;
    if (hh.current) hh.current.rotation.z = -(h / 12) * Math.PI * 2;
  });
  return (
    <Wall p={p} face={face}>
      <C p={[0, 0, 0.03]} r={0.3} h={0.06} m="blackMetal" rot={[Math.PI / 2, 0, 0]} seg={32} />
      <mesh position={[0, 0, 0.061]}><circleGeometry args={[0.27, 32]} /><meshStandardMaterial color="#e8e4da" roughness={0.6} /></mesh>
      {Array.from({ length: 12 }, (_, i) => <B key={i} p={[Math.sin((i / 12) * Math.PI * 2) * 0.23, Math.cos((i / 12) * Math.PI * 2) * 0.23, 0.063]} s={[0.012, 0.04, 0.004]} r={[0, 0, -(i / 12) * Math.PI * 2]} m="blackMetal" cast={false} />)}
      <mesh ref={hh} position={[0, 0, 0.066]}><planeGeometry args={[0.02, 0.28]} /><meshBasicMaterial color="#111" /></mesh>
      <mesh ref={mm} position={[0, 0, 0.068]}><planeGeometry args={[0.014, 0.42]} /><meshBasicMaterial color="#111" /></mesh>
      <mesh ref={ss} position={[0, 0, 0.07]}><planeGeometry args={[0.006, 0.46]} /><meshBasicMaterial color="#b01010" /></mesh>
    </Wall>
  );
}

function VentFan({ p, face }: { p: V3; face: number }) {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (blades.current) blades.current.rotation.z += dt * 6 * world.light.power; });
  return (
    <Wall p={p} face={face}>
      <B p={[0, 0, 0.04]} s={[0.8, 0.8, 0.08]} m="darkPanel" />
      <mesh position={[0, 0, 0.085]}><circleGeometry args={[0.33, 24]} /><meshStandardMaterial color="#050505" /></mesh>
      <group ref={blades} position={[0, 0, 0.09]}>
        {[0, 1, 2, 3, 4, 5].map((i) => <B key={i} p={[Math.cos((i * Math.PI) / 3) * 0.15, Math.sin((i * Math.PI) / 3) * 0.15, 0]} r={[0.4, 0, (i * Math.PI) / 3]} s={[0.26, 0.07, 0.01]} m="steel" cast={false} />)}
      </group>
      {[-0.24, -0.08, 0.08, 0.24].map((y) => <B key={y} p={[0, y, 0.1]} s={[0.72, 0.02, 0.02]} m="blackMetal" cast={false} />)}
    </Wall>
  );
}

function ArcPanel() {
  const spark = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const on = arcActive() && !world.frozen;
    if (spark.current) {
      spark.current.visible = on;
      spark.current.children.forEach((c) => { c.rotation.z = Math.random() * 6; c.scale.setScalar(0.4 + Math.random()); });
    }
    if (light.current) light.current.intensity = on ? 6 + Math.random() * 10 : 0;
  });
  return (
    <group>
      <Wall p={[ARC_POS.x, 1.3, 18.27]} face={0}>
        <B p={[0, 0, 0.1]} s={[0.9, 1.2, 0.2]} m="darkPanel" />
        <B p={[0.2, 0.1, 0.21]} r={[0, 0.8, 0]} s={[0.35, 0.8, 0.02]} m="panel" />
        <Sign p={[-0.2, 0.45, 0.205]} face={0} lines={['DANGER', 'HIGH VOLTAGE']} w={0.4} h={0.2} stripes bg="#111" />
      </Wall>
      <group ref={spark} position={[ARC_POS.x, 1.2, 18.7]}>
        {[0, 1, 2, 3].map((i) => <mesh key={i} material={glow('#9fd8ff', 6)}><planeGeometry args={[0.02, 0.9]} /></mesh>)}
      </group>
      <pointLight ref={light} position={[ARC_POS.x, 1.2, 18.9]} color="#9fd8ff" intensity={0} distance={6} />
    </group>
  );
}

// ───────────────────────── pickups & documents ─────────────────────────
function Pickup({ id, p, children, rotY = 0 }: { id: string; p: V3; children: ReactNode; rotY?: number }) {
  const ref = useRef<THREE.Group>(null);
  useVisible(ref, () => !!world.pickups[id]);
  return <group ref={ref} position={p} rotation={[0, rotY, 0]}>{children}</group>;
}

function Paper({ p, when, rot = 0 }: { p: V3; when?: () => boolean; rot?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useVisible(ref, when ?? (() => true));
  return <mesh ref={ref} position={p} rotation={[-Math.PI / 2, 0, rot]} material={paperMat} receiveShadow><planeGeometry args={[0.24, 0.32]} /></mesh>;
}
const paperMat = new THREE.MeshStandardMaterial({ color: '#ebe5d2', roughness: 0.9, side: THREE.DoubleSide, emissive: '#2a2618', emissiveIntensity: 0.3 });

function Mug() {
  const intact = useRef<THREE.Group>(null), broken = useRef<THREE.Group>(null), note = useRef<THREE.Mesh>(null), dbl = useRef<THREE.Group>(null);
  useFrame(() => {
    const s = mugState();
    if (intact.current) intact.current.visible = s === 'intact';
    if (broken.current) broken.current.visible = s === 'broken' || s === 'note';
    if (note.current) note.current.visible = s === 'note';
    if (dbl.current) dbl.current.visible = world.anomalies.includes('DOUBLE_MUG') && s !== 'gone';
  });
  const mug = <><C p={[0, 0.055, 0]} r={0.045} h={0.11} m="whitePlastic" /><mesh position={[0.05, 0.055, 0]} rotation={[0, 0, Math.PI / 2]} material={m().whitePlastic}><torusGeometry args={[0.028, 0.009, 6, 12, Math.PI]} /></mesh><mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.04, 12]} /><meshStandardMaterial color="#2a1608" roughness={0.2} /></mesh></>;
  return (
    <group position={[0.3, 0.755, 0.1]}>
      <group ref={intact}>{mug}</group>
      <group ref={broken}>
        <mesh position={[0, 0.02, 0]} rotation={[0.2, 0, 1.4]} material={m().whitePlastic}><cylinderGeometry args={[0.045, 0.045, 0.06, 10, 1, true, 0, 2]} /></mesh>
        <mesh position={[0.08, 0.02, 0.05]} rotation={[1.4, 0.3, 0]} material={m().whitePlastic}><cylinderGeometry args={[0.045, 0.045, 0.05, 10, 1, true, 0, 2]} /></mesh>
        <mesh position={[-0.06, 0.015, 0.06]} rotation={[1.2, 0, 0.5]} material={m().whitePlastic}><cylinderGeometry args={[0.045, 0.045, 0.04, 10, 1, true, 0, 2]} /></mesh>
      </group>
      <mesh ref={note} position={[-0.2, 0.002, 0.05]} rotation={[-Math.PI / 2, 0, 0.3]} material={paperMat}><planeGeometry args={[0.12, 0.16]} /></mesh>
      <group ref={dbl} position={[-0.5, 0, -0.15]}>{mug}</group>
    </group>
  );
}

// ───────────────────────── anomalies & apparitions ─────────────────────────
function Anomalies() {
  const chair = useRef<THREE.Group>(null), door = useRef<THREE.Group>(null), papers = useRef<THREE.Group>(null), shadow = useRef<THREE.Mesh>(null), stop = useRef<THREE.Mesh>(null);
  const stopMat = useMemo(() => new THREE.MeshStandardMaterial({ map: textTexture(['STOP RESETTING'], { w: 1024, h: 160, bg: '#000', fg: '#fff', font: '700', size: 120 }), transparent: true, opacity: 0.8, blending: THREE.MultiplyBlending, premultipliedAlpha: true, color: '#1a1a1a' }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const a = world.anomalies;
    if (chair.current) { chair.current.visible = a.includes('FLOATING_CHAIR'); chair.current.position.y = 1.2 + Math.sin(t * 0.8) * 0.15; chair.current.rotation.set(Math.sin(t * 0.3) * 0.4, t * 0.2, Math.cos(t * 0.25) * 0.3); }
    if (door.current) door.current.visible = a.includes('IMPOSSIBLE_DOOR');
    if (papers.current) { papers.current.visible = a.includes('FLOATING_PAPERS'); papers.current.children.forEach((c, i) => { c.position.y = 1.2 + Math.sin(t * 0.5 + i) * 0.4 + i * 0.12; c.rotation.set(t * 0.2 + i, t * 0.1, i); }); }
    if (shadow.current) shadow.current.visible = a.includes('SHADOW');
    if (stop.current) stop.current.visible = loopN() >= 12;
  });
  return (
    <group>
      <group ref={chair} position={[2.6, 1.2, -2.2]}><group position={[0, -0.5, 0]}><ChairMini /></group></group>
      <group ref={door} position={[-9.73, 0, -5.8]} rotation={[0, Math.PI / 2, 0]}>
        <B p={[-0.55, 1.1, 0]} s={[0.1, 2.2, 0.1]} m="blackMetal" /><B p={[0.55, 1.1, 0]} s={[0.1, 2.2, 0.1]} m="blackMetal" /><B p={[0, 2.25, 0]} s={[1.2, 0.1, 0.1]} m="blackMetal" />
        <B p={[0, 1.1, 0.02]} s={[1.0, 2.15, 0.04]} m="wood" />
        <S p={[0.38, 1.05, 0.06]} r={0.035} m="brass" />
      </group>
      <group ref={papers} position={[-6.5, 0, -13]}>
        {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[Math.cos(i) * 1.2, 1.2, Math.sin(i * 1.3) * 0.8]} material={paperMat}><planeGeometry args={[0.21, 0.29]} /></mesh>)}
      </group>
      <mesh ref={shadow} position={[-9.73, 1.1, 12]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.9, 2.1]} /><meshBasicMaterial map={silhouette()} transparent opacity={0.75} depthWrite={false} color="#000" /></mesh>
      <mesh ref={stop} position={[-6.5, 1.7, -7.74]} material={stopMat}><planeGeometry args={[3.4, 0.55]} /></mesh>
    </group>
  );
}

let silTex: THREE.Texture | null = null;
function silhouette(): THREE.Texture {
  if (silTex) return silTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const x = c.getContext('2d')!;
  x.filter = 'blur(6px)';
  x.fillStyle = '#fff';
  x.beginPath(); x.ellipse(64, 40, 20, 26, 0, 0, 7); x.fill();
  x.beginPath(); x.moveTo(30, 70); x.lineTo(98, 70); x.lineTo(90, 170); x.lineTo(80, 250); x.lineTo(48, 250); x.lineTo(38, 170); x.fill();
  x.fillRect(18, 75, 14, 110); x.fillRect(96, 75, 14, 110);
  silTex = new THREE.CanvasTexture(c);
  return silTex;
}

function ChairMini() {
  return (<group><B p={[0, 0.47, 0]} s={[0.48, 0.08, 0.46]} m="fabric" /><B p={[0, 0.78, -0.22]} s={[0.46, 0.5, 0.06]} m="fabric" /><C p={[0, 0.26, 0]} r={0.03} h={0.36} m="steel" /></group>);
}

/** Only visible through the security cameras (layer 1). */
function CctvApparitions() {
  const symbols = useRef<(THREE.Mesh | null)[]>([]);
  const body = useRef<THREE.Group>(null);
  const tex = useMemo(() => SYMBOL_SEQUENCE.map((s) => textTexture([SYMBOL_GLYPH[s]], { w: 128, h: 128, bg: '#000', fg: '#fff', size: 100 })), []);
  useFrame(({ clock }) => {
    const on = world.t >= at('12:55') && world.t < at('12:56:30');
    symbols.current.forEach((s, i) => {
      if (!s) return;
      s.visible = on && world.observer.symbolsDrawn > i;
      (s.material as THREE.MeshBasicMaterial).color.setScalar(1.5 + Math.sin(clock.elapsedTime * 6 + i) * 0.5);
    });
    if (body.current) body.current.visible = loopN() >= 6;
  });
  return (
    <OnLayer layer={1}>
      {tex.map((t, i) => (
        <mesh key={i} ref={(r) => { symbols.current[i] = r; }} position={[-9.72, 2.55, -17.5 - i * 0.62]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshBasicMaterial map={t} transparent blending={THREE.AdditiveBlending} toneMapped={false} color="#ffffff" />
        </mesh>
      ))}
      <group ref={body} position={[-19.4, 0.48, -6.25]}>
        <C p={[0.1, 0.12, 0]} r={0.17} h={0.9} rot={[0, 0, Math.PI / 2]} m="fabric" />
        <S p={[-0.55, 0.14, 0]} r={0.11} m="mattress" />
      </group>
    </OnLayer>
  );
}

/** Blinking emergency beacons that spin during the alarm. */
function Beacons() {
  const pts: V3[] = [[-9.6, 3.9, -7.6], [9.6, 3.9, -7.6], [-9.6, 3.9, 7.6], [13.8, 2.8, 1.3], [-12.8, 2.8, -1.3], [30.6, 5.6, 25.6], [17.3, 2.8, 21.2], [-18.8, 2.8, 21.2], [7.8, 3.2, -8.3]];
  const refs = useRef<(THREE.Group | null)[]>([]);
  const mats = useMemo(() => pts.map(() => new THREE.MeshBasicMaterial({ color: '#300', toneMapped: false })), []); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(({ clock }, dt) => {
    const alarm = world.light.alarm || world.flags.has('blackout');
    refs.current.forEach((r, i) => {
      if (!r) return;
      r.rotation.y += dt * (alarm ? 6 : 0);
      mats[i].color.set(alarm ? '#ff1a0a' : '#220000').multiplyScalar(alarm ? 3 + Math.sin(clock.elapsedTime * 10) : 1);
    });
  });
  return (
    <group>
      {pts.map((p, i) => (
        <group key={i} position={p}>
          <C p={[0, 0, 0]} r={0.09} h={0.16} mat={mats[i]} />
          <group ref={(r) => { refs.current[i] = r; }}><B p={[0.06, 0, 0]} s={[0.02, 0.14, 0.12]} m="steel" cast={false} /></group>
        </group>
      ))}
    </group>
  );
}

function Mirror() {
  return (
    <Wall p={[-6.5, 1.55, 17.74]} face={2}>
      <B p={[0, 0, 0.02]} s={[0.9, 1.1, 0.04]} m="steel" />
      <mesh position={[0, 0, 0.045]}><planeGeometry args={[0.8, 1.0]} /><meshStandardMaterial color="#8a949a" metalness={1} roughness={0.04} /></mesh>
      <B p={[0, -0.62, 0.1]} s={[0.7, 0.05, 0.2]} m="whitePlastic" />
    </Wall>
  );
}

function Whiteboard() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.3, map: textTexture(['∮ Ψ(t) dt = 0   13:00 → 12:47', 'RELAYS  A 12:5_  B 12:5_  C 12:5_', 'ask K. while he is in Security', '(fold stable only with anchor)'], { w: 1024, h: 512, bg: '#e9eeee', fg: '#1b3a7a', font: '500', align: 'left' }) }), []);
  return <Wall p={[-2.73, 1.6, 11.5]} face={1}><B p={[0, 0, 0.02]} s={[2.2, 1.1, 0.04]} m="steel" /><mesh position={[0, 0, 0.045]} material={mat}><planeGeometry args={[2.1, 1.0]} /></mesh></Wall>;
}

function TallyWall() {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, map: textTexture(['4211', 'YOU HAVE BEEN HERE BEFORE'], { w: 1024, h: 512, bg: 'rgba(0,0,0,0)', fg: '#2a0d08', font: '700' }), color: '#ffffff' }), []);
  return <mesh position={[24.27, 1.6, -3.5]} rotation={[0, Math.PI / 2, 0]} material={mat}><planeGeometry args={[3, 1.5]} /></mesh>;
}

function Badge() {
  const ref = useRef<THREE.Group>(null);
  useVisible(ref, () => !world.flags.has('badgeTaken'));
  return <group ref={ref} position={[31.2, 0.01, -2.4]} rotation={[0, 0.6, 0]}><B p={[0, 0.005, 0]} s={[0.09, 0.01, 0.13]} m="whitePlastic" /><B p={[0, 0.012, -0.02]} s={[0.06, 0.002, 0.04]} m="blackMetal" cast={false} /></group>;
}

export function Details() {
  return (
    <group>
      {/* puzzle fixtures */}
      <RelayPanel id="A" face={1} />
      <RelayPanel id="B" face={3} />
      <RelayPanel id="C" face={2} />
      <Keypad p={[8.2, 1.4, 7.74]} face={2} solved={() => world.keypadSolved} />
      <Keypad p={[2.95, 1.3, 17.74]} face={2} solved={() => world.doors.d_lab_maint.unlocked} />
      <Keypad p={[13.74, 1.4, 1.5]} face={3} solved={() => world.generators.every(Boolean)} />
      <Keypad p={[-4.2, 1.4, -7.74]} face={0} solved={() => world.t >= at('12:50')} />
      <Keypad p={[1.55, 1.3, -7.74]} face={0} solved={() => world.generators.every(Boolean)} />
      <SymbolPanel />
      <RelayBoard />
      {CCTV.map((c) => <SecurityCam key={c.id} p={c.pos} target={c.target} />)}
      {GENERATOR_POS.map((_, i) => <Sign key={i} p={[GENERATOR_POS[i][0], 1.9, i === 2 ? 23.9 : 21.24]} face={i === 2 ? 3 : 2} lines={[`AUX GENERATOR G${i + 1}`]} w={1.1} h={0.18} />)}
      <ArcPanel />
      {/* clocks, vents, signs */}
      <WallClock p={[3, 3.1, -7.74]} face={0} wrongAnomaly />
      <WallClock p={[-13.26, 2.3, 3]} face={3} />
      <VentFan p={[-9.74, 3.1, 4]} face={1} />
      <VentFan p={[-10, 2.3, 21.24]} face={2} />
      <VentFan p={[30.74, 4.5, 16]} face={3} />
      <VentFan p={[6, 2.4, 15.74]} face={2} />
      <Sign p={[0, 3.55, -7.74]} face={0} lines={['ORPHEUS']} w={3.2} h={0.6} fg="#cfe2ff" bg="#0a0e14" glowy />
      <Sign p={[0, 3.55, 7.74]} face={2} lines={['CENTRAL HUB · LEVEL −3']} w={3} h={0.4} />
      <Sign p={[-2.6, 1.8, -7.74]} face={0} lines={['FACILITY MAP', 'HUB · MED · LAB · SEC · ARCH', 'DORM · CORE · RESTRICTED · ▒▒']} w={1.6} h={1.0} bg="#0c1a24" fg="#8fd0ff" />
      <Sign p={[-9.74, 1.5, 2.5]} face={1} lines={['NOTICE', 'TEMPORAL HAZARD', 'PROTOCOL']} w={0.7} h={0.9} bg="#e8e2cc" fg="#222" />
      <Sign p={[26, 4.2, 25.74]} face={2} lines={['⚠ RADIATION ⚠']} w={2.4} h={0.5} stripes bg="#111" fg="#ffcc00" />
      <Sign p={[5.5, 2.95, -13.74]} face={0} lines={['TEMPORAL CORE — DIRECTOR ONLY']} w={2.8} h={0.28} fg="#b8acff" />
      <Sign p={[-16.3, 2.4, -6.74]} face={0} lines={['DORMITORY — QUIET HOURS']} w={2} h={0.3} />
      <Sign p={[-13.4, 1.4, 21.24]} face={2} lines={['GENERATOR MANUAL', 'G1 · G2 · G3']} w={0.5} h={0.4} bg="#e8e2cc" fg="#222" />
      <Sign p={[-0.8, 2.3, 8.26]} face={0} lines={['LABORATORY 2']} w={1.4} h={0.3} />
      <Sign p={[19.5, 2.6, -7.74]} face={0} lines={['OFFICE OF THE DIRECTOR']} w={2} h={0.3} />
      <Mirror />
      <Whiteboard />
      <TallyWall />
      {/* screens on walls */}
      <Wall p={[7, 2.25, 15.74]} face={2}><B p={[0, 0, 0.04]} s={[2.4, 1.1, 0.08]} m="blackMetal" /><mesh position={[0, 0, 0.085]} material={screenMaterial('security')}><planeGeometry args={[2.3, 1.0]} /></mesh></Wall>
      <Wall p={[3.28, 2.4, -2]} face={1}><B p={[0, 0, 0.03]} s={[1.3, 0.8, 0.06]} m="blackMetal" /><mesh position={[0, 0, 0.065]} material={screenMaterial('hub')}><planeGeometry args={[1.2, 0.7]} /></mesh></Wall>
      <Wall p={[17.26, 2.2, 16]} face={1}><B p={[0, 0, 0.03]} s={[1.6, 0.9, 0.06]} m="blackMetal" /><mesh position={[0, 0, 0.065]} material={screenMaterial('reactor')}><planeGeometry args={[1.5, 0.8]} /></mesh></Wall>
      {/* pickups */}
      <Pickup id="med_flashlight" p={[-7.2, 0.93, 12.05]} rotY={0.5}><C p={[0, 0.03, 0]} r={0.025} rb={0.02} h={0.22} m="blackMetal" rot={[0, 0, Math.PI / 2]} /><C p={[0.12, 0.03, 0]} r={0.035} h={0.05} m="steel" rot={[0, 0, Math.PI / 2]} /></Pickup>
      {[['lab_battery', [-1.6, 0.94, 13.1]], ['dorm_battery', [-18.2, 0.78, 0.2]], ['maint_battery', [14.2, 0.97, 20.9]]].map(([id, p]) => (
        <Pickup key={id as string} id={id as string} p={p as V3}><C p={[0, 0.04, 0]} r={0.018} h={0.07} m="copper" /><mesh position={[0, 0.08, 0]} material={gGreen}><sphereGeometry args={[0.006, 6, 6]} /></mesh></Pickup>
      ))}
      <Pickup id="lab_tool" p={[2.4, 0.935, 13.1]} rotY={0.8}><B p={[0, 0.015, 0]} s={[0.32, 0.025, 0.04]} m="steel" /><C p={[0.17, 0.015, 0]} r={0.045} h={0.025} m="steel" /></Pickup>
      <Pickup id="sec_keycard" p={[4.75, 0.77, 10.6]} rotY={0.3}><B p={[0, 0.003, 0]} s={[0.055, 0.004, 0.085]} m="whitePlastic" /><B p={[0, 0.006, 0.02]} s={[0.045, 0.002, 0.02]} m="red" cast={false} /></Pickup>
      <Pickup id="res_accesscard" p={[20.1, 0.77, -7.0]} rotY={-0.4}><B p={[0, 0.003, 0]} s={[0.055, 0.004, 0.085]} m="brass" /></Pickup>
      <Pickup id="arch_datadrive" p={[-2.7, 0.77, -18.05]}><B p={[0, 0.01, 0]} s={[0.08, 0.02, 0.05]} m="blackMetal" /><mesh position={[0.02, 0.021, 0]} rotation={[-Math.PI / 2, 0, 0]} material={gAmber}><planeGeometry args={[0.01, 0.01]} /></mesh></Pickup>
      <Pickup id="unk_strangekey" p={[26, 0.37, -5.2]} rotY={1}><B p={[0, 0.005, 0]} s={[0.1, 0.008, 0.02]} m="brass" /><mesh position={[-0.06, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m().brass}><torusGeometry args={[0.02, 0.006, 6, 12]} /></mesh></Pickup>
      <Pickup id="maint_medkit" p={[-15.2, 1.1, 20.6]}><B p={[0, 0.07, 0]} s={[0.35, 0.14, 0.24]} m="whitePlastic" /><B p={[0, 0.141, 0]} s={[0.12, 0.002, 0.04]} m="red" cast={false} /><B p={[0, 0.141, 0]} s={[0.04, 0.002, 0.12]} m="red" cast={false} /></Pickup>
      {/* documents lying around */}
      <Paper p={[-8.0, 1.08, -4.9]} rot={1.5} />
      <Paper p={[-1.6, 0.93, 11.1]} rot={0.2} />
      <Paper p={[-3.7, 0.765, 16.1]} rot={1.3} />
      <Paper p={[-19.4, 0.56, -6.1]} rot={0.4} />
      <Paper p={[-22.6, 0.56, 6.1]} rot={-0.4} when={() => loopN() >= 3 || G().run.ngPlus > 0} />
      <Paper p={[-8.6, 0.62, 16.3]} rot={0.9} when={() => (loopN() >= 3 && loopN() % 2 === 0) || G().run.clues.includes('MAYA_WARNING')} />
      <Paper p={[-2.7, 0.765, -18.95]} rot={1.2} />
      <Paper p={[18.8, 0.765, 0.5]} rot={0.1} />
      <Paper p={[17.7, 0.765, 13]} rot={1.6} />
      <Paper p={[27.2, 0.765, 3.3]} rot={0.3} />
      <Paper p={[27.9, 0.765, 3.3]} rot={-0.2} />
      <Paper p={[4.75, 0.765, 9.7]} rot={1.5} />
      <Paper p={[-0.4, 0.757, -0.2]} rot={0.7} when={() => G().run.ngPlus > 0} />
      <Paper p={[9.4, 2.215, -6.9]} rot={0.2} />
      <Mug />
      <Badge />
      {/* radio */}
      <group position={[-6.6, 1.1, 20.65]}><B p={[0, 0.1, 0]} s={[0.36, 0.2, 0.14]} m="wood" /><mesh position={[-0.07, 0.1, 0.071]}><circleGeometry args={[0.06, 16]} /><meshStandardMaterial color="#111" /></mesh><mesh position={[0.1, 0.12, 0.071]} material={gAmber}><planeGeometry args={[0.1, 0.03]} /></mesh></group>
      <Anomalies />
      <CctvApparitions />
      <Beacons />
    </group>
  );
}
