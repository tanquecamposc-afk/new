/** Furniture & room props, modelled from primitives with PBR materials. */
import { useMemo } from 'react';
import * as THREE from 'three';
import { B, C, S } from '../primitives';
import { getMaterials } from '../materials';
import { screenMaterial, type ScreenKind } from '../screens';


export function Desk({ computer, screen = 'terminal' }: { computer?: boolean; screen?: ScreenKind }) {
  return (
    <group>
      <B p={[0, 0.74, 0]} s={[1.6, 0.04, 0.8]} m="wood" />
      <B p={[-0.55, 0.37, 0]} s={[0.45, 0.7, 0.74]} m="blackMetal" />
      {[0.12, 0.34, 0.56].map((y) => <B key={y} p={[-0.55, y, 0.375]} s={[0.4, 0.18, 0.01]} m="steel" />)}
      <B p={[0.76, 0.37, 0]} s={[0.04, 0.72, 0.74]} m="blackMetal" />
      <B p={[0.2, 0.4, -0.37]} s={[1.1, 0.5, 0.02]} m="blackMetal" />
      {computer && <Computer screen={screen} />}
      <B p={[0.45, 0.77, 0.15]} s={[0.21, 0.01, 0.29]} m="paper" cast={false} />
      <C p={[-0.45, 0.8, 0.2]} r={0.04} h={0.1} m="whitePlastic" />
    </group>
  );
}

export function Computer({ screen = 'terminal', x = 0.15, z = -0.1 }: { screen?: ScreenKind; x?: number; z?: number }) {
  return (
    <group position={[x, 0.76, z]}>
      <B p={[0, 0.02, 0]} s={[0.22, 0.02, 0.16]} m="plastic" />
      <B p={[0, 0.14, 0]} s={[0.04, 0.24, 0.04]} m="plastic" />
      <B p={[0, 0.34, 0.02]} s={[0.56, 0.36, 0.04]} m="plastic" />
      <mesh position={[0, 0.34, 0.041]} material={screenMaterial(screen)}><planeGeometry args={[0.52, 0.32]} /></mesh>
      <B p={[0, 0.015, 0.28]} s={[0.46, 0.02, 0.15]} m="plastic" />
      <B p={[0.34, 0.015, 0.28]} s={[0.07, 0.02, 0.1]} m="plastic" />
      <B p={[-0.45, 0.2, -0.05]} s={[0.18, 0.4, 0.42]} m="plastic" />
      <mesh position={[-0.45, 0.3, 0.163]} material={glowGreen}><planeGeometry args={[0.015, 0.015]} /></mesh>
    </group>
  );
}
const glowGreen = new THREE.MeshBasicMaterial({ color: new THREE.Color('#3dff9a').multiplyScalar(3), toneMapped: false });
const glowRed = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3030').multiplyScalar(3), toneMapped: false });
const glowBlue = new THREE.MeshBasicMaterial({ color: new THREE.Color('#58a8ff').multiplyScalar(3), toneMapped: false });

export function Chair() {
  return (
    <group>
      <C p={[0, 0.06, 0]} r={0.28} rb={0.3} h={0.04} m="blackMetal" seg={5} />
      <C p={[0, 0.26, 0]} r={0.03} h={0.36} m="steel" />
      <B p={[0, 0.47, 0]} s={[0.48, 0.08, 0.46]} m="fabric" />
      <B p={[0, 0.78, -0.22]} s={[0.46, 0.5, 0.06]} m="fabric" />
      <B p={[0, 0.6, -0.2]} s={[0.05, 0.25, 0.04]} m="steel" />
    </group>
  );
}

export function Table() {
  return (
    <group>
      <B p={[0, 0.73, 0]} s={[1.8, 0.05, 0.9]} m="whitePlastic" />
      {[[-0.82, -0.38], [0.82, -0.38], [-0.82, 0.38], [0.82, 0.38]].map(([x, z]) => <C key={`${x}${z}`} p={[x, 0.36, z]} r={0.025} h={0.72} m="steel" seg={8} />)}
    </group>
  );
}

export function Bench() {
  return (
    <group>
      <B p={[0, 0.43, 0]} s={[1.8, 0.05, 0.45]} m="wood" />
      <B p={[-0.8, 0.2, 0]} s={[0.05, 0.4, 0.4]} m="blackMetal" />
      <B p={[0.8, 0.2, 0]} s={[0.05, 0.4, 0.4]} m="blackMetal" />
    </group>
  );
}

export function Reception() {
  return (
    <group>
      <B p={[0, 0.5, 0.1]} s={[2.8, 1.0, 0.1]} m="panel" />
      <B p={[0, 1.05, 0.12]} s={[2.9, 0.06, 0.34]} m="wood" />
      <B p={[0, 0.74, -0.2]} s={[2.8, 0.04, 0.6]} m="wood" />
      <B p={[-1.35, 0.37, -0.2]} s={[0.06, 0.74, 0.6]} m="blackMetal" />
      <B p={[1.35, 0.37, -0.2]} s={[0.06, 0.74, 0.6]} m="blackMetal" />
      <group rotation={[0, Math.PI, 0]}><Computer screen="hub" x={-0.6} z={0.2} /></group>
      {/* phone */}
      <group position={[1.4, 0.76, -0.25]}>
        <B p={[0, 0.03, 0]} s={[0.2, 0.06, 0.16]} m="plastic" />
        <B p={[0, 0.08, 0]} s={[0.2, 0.04, 0.05]} m="plastic" />
      </group>
      <B p={[0.3, 0.77, -0.2]} s={[0.3, 0.01, 0.22]} m="paper" cast={false} />
    </group>
  );
}

export function Pillar({ h = 4 }: { h?: number }) {
  return (
    <group>
      <B p={[0, h / 2, 0]} s={[0.7, h, 0.7]} m="concrete" />
      <B p={[0, 0.1, 0]} s={[0.78, 0.2, 0.78]} m="blackMetal" />
      <B p={[0, 1.2, 0]} s={[0.72, 0.06, 0.72]} m="yellow" />
      <B p={[0, h - 0.15, 0]} s={[0.8, 0.3, 0.8]} m="darkPanel" />
    </group>
  );
}

export function Plant() {
  const leaves = useMemo(() => Array.from({ length: 9 }, (_, i) => i), []);
  return (
    <group>
      <C p={[0, 0.25, 0]} r={0.22} rb={0.17} h={0.5} m="concreteDark" />
      {leaves.map((i) => (
        <mesh key={i} position={[Math.cos(i * 2.4) * 0.1, 0.75 + (i % 3) * 0.12, Math.sin(i * 2.4) * 0.1]} rotation={[Math.cos(i) * 0.6, i, Math.sin(i) * 0.6 + 0.3]} material={deadLeaf} castShadow>
          <coneGeometry args={[0.05, 0.6, 4]} />
        </mesh>
      ))}
    </group>
  );
}
const deadLeaf = new THREE.MeshStandardMaterial({ color: '#4a4a2a', roughness: 0.9 });

export function Bunk() {
  return (
    <group>
      {[-0.95, 0.95].map((x) => [-0.42, 0.42].map((z) => <B key={`${x}${z}`} p={[x, 0.87, z]} s={[0.05, 1.74, 0.05]} m="steel" />))}
      {[0.35, 1.3].map((y) => (
        <group key={y}>
          <B p={[0, y, 0]} s={[1.95, 0.06, 0.9]} m="steel" />
          <B p={[0, y + 0.1, 0]} s={[1.9, 0.14, 0.86]} m="mattress" />
          <B p={[-0.75, y + 0.22, 0]} s={[0.3, 0.1, 0.55]} m="whitePlastic" />
          <B p={[0.2, y + 0.18, 0.05]} s={[1.1, 0.04, 0.82]} m="fabric" />
        </group>
      ))}
    </group>
  );
}

export function MedBed() {
  return (
    <group>
      <B p={[0, 0.3, 0]} s={[2.0, 0.08, 0.9]} m="steel" />
      {[-0.9, 0.9].map((x) => [-0.38, 0.38].map((z) => <C key={`${x}${z}`} p={[x, 0.18, z]} r={0.025} h={0.36} m="steel" seg={8} />))}
      <B p={[0, 0.45, 0]} s={[2.0, 0.18, 0.88]} m="mattress" />
      <B p={[-0.82, 0.62, 0]} s={[0.36, 0.12, 0.6]} m="whitePlastic" />
      <B p={[0.25, 0.56, 0]} s={[1.2, 0.05, 0.9]} m="fabric" />
      <B p={[-1.02, 0.7, 0]} s={[0.05, 0.6, 0.9]} m="whitePlastic" />
      <B p={[0, 0.72, 0.45]} s={[1.2, 0.04, 0.03]} m="steel" />
    </group>
  );
}

export function MonitorStand() {
  return (
    <group>
      <C p={[0, 0.6, 0]} r={0.02} h={1.2} m="steel" />
      <C p={[0, 0.02, 0]} r={0.2} h={0.04} m="blackMetal" seg={5} />
      <B p={[0, 1.35, 0]} s={[0.36, 0.28, 0.12]} m="plastic" />
      <mesh position={[0.061, 1.35, 0]} rotation={[0, Math.PI / 2, 0]} material={screenMaterial('medical')}><planeGeometry args={[0.32, 0.22]} /></mesh>
    </group>
  );
}

export function IVStand() {
  return (
    <group>
      <C p={[0, 0.9, 0]} r={0.015} h={1.8} m="steel" />
      <C p={[0, 0.02, 0]} r={0.25} h={0.03} m="steel" seg={5} />
      <B p={[0, 1.6, 0]} s={[0.12, 0.2, 0.04]} m="glass" cast={false} />
    </group>
  );
}

export function Cart() {
  return (
    <group>
      {[0.3, 0.88].map((y) => <B key={y} p={[0, y, 0]} s={[0.7, 0.03, 0.45]} m="steel" />)}
      {[[-0.32, -0.2], [0.32, -0.2], [-0.32, 0.2], [0.32, 0.2]].map(([x, z]) => <C key={`${x}${z}`} p={[x, 0.45, z]} r={0.012} h={0.9} m="steel" seg={6} />)}
      <C p={[0.2, 0.92, 0.1]} r={0.03} h={0.08} m="whitePlastic" />
    </group>
  );
}

export function MedCabinet() {
  return (
    <group>
      <B p={[0, 0.95, 0]} s={[1.2, 1.9, 0.45]} m="whitePlastic" />
      <B p={[-0.3, 1.2, 0.23]} s={[0.56, 1.3, 0.02]} m="glass" cast={false} />
      <B p={[0.3, 1.2, 0.23]} s={[0.56, 1.3, 0.02]} m="glass" cast={false} />
      {[0.8, 1.2, 1.6].map((y) => <B key={y} p={[0, y, 0.02]} s={[1.1, 0.02, 0.38]} m="whitePlastic" />)}
      {[0.85, 1.25, 1.65].map((y) => [-0.4, -0.2, 0.1, 0.35].map((x) => <C key={`${x}${y}`} p={[x, y + 0.06, 0.05]} r={0.035} h={0.12} m="whitePlastic" seg={8} />))}
      <B p={[0, 0.3, 0.23]} s={[1.15, 0.5, 0.02]} m="whitePlastic" />
      <mesh position={[0, 1.75, 0.235]} material={glowRed}><planeGeometry args={[0.12, 0.12]} /></mesh>
    </group>
  );
}

export function LabBench() {
  return (
    <group>
      <B p={[0, 0.9, 0]} s={[3.0, 0.05, 0.9]} m="blackMetal" />
      <B p={[0, 0.44, 0]} s={[2.9, 0.84, 0.8]} m="labPanel" />
      {[-1, 0, 1].map((x) => <B key={x} p={[x, 0.5, 0.405]} s={[0.9, 0.6, 0.01]} m="whitePlastic" />)}
      {/* glassware */}
      {[-1.2, -1.05, -0.9].map((x, i) => <C key={x} p={[x, 0.99, 0.2]} r={0.04} rb={0.06} h={0.14 + i * 0.03} mat={getMaterials().glass} cast={false} />)}
      {/* microscope */}
      <group position={[0.9, 0.93, 0.1]}>
        <B p={[0, 0.03, 0]} s={[0.2, 0.05, 0.28]} m="whitePlastic" />
        <B p={[0, 0.2, -0.08]} s={[0.06, 0.34, 0.06]} m="whitePlastic" />
        <C p={[0, 0.32, 0.02]} r={0.025} h={0.22} m="blackMetal" rot={[0.5, 0, 0]} />
      </group>
      <B p={[0, 1.4, -0.4]} s={[3.0, 0.03, 0.3]} m="steel" />
      <C p={[1.35, 1.15, -0.4]} r={0.015} h={0.5} m="steel" />
      <C p={[-1.35, 1.15, -0.4]} r={0.015} h={0.5} m="steel" />
      <Computer screen="lab" x={-0.2} z={-0.1} />
    </group>
  );
}

export function Fridge() {
  return (
    <group>
      <B p={[0, 0.95, 0]} s={[0.9, 1.9, 0.7]} m="whitePlastic" />
      <B p={[0, 1.2, 0.355]} s={[0.84, 1.2, 0.02]} m="glass" cast={false} />
      <B p={[0.38, 1.2, 0.38]} s={[0.03, 0.5, 0.04]} m="steel" />
      {[0.8, 1.2, 1.55].map((y) => <B key={y} p={[0, y, 0]} s={[0.8, 0.02, 0.6]} m="steel" />)}
      {[-0.2, 0, 0.2].map((x) => <C key={x} p={[x, 1.28, 0.1]} r={0.025} h={0.14} mat={vialMat} cast={false} />)}
      <mesh position={[0, 1.85, 0.356]} material={glowBlue}><planeGeometry args={[0.3, 0.04]} /></mesh>
    </group>
  );
}
const vialMat = new THREE.MeshStandardMaterial({ color: '#b8f3ff', emissive: '#4fd7ff', emissiveIntensity: 0.8, transparent: true, opacity: 0.8 });

export function Shelf({ seed = 1 }: { seed?: number }) {
  const books = useMemo(() => {
    const out: { x: number; y: number; w: number; h: number; c: string }[] = [];
    let r = (Math.abs(seed) * 9301 + 17) % 233280;
    const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    for (const y of [0.12, 0.64, 1.16, 1.68]) {
      let x = -1.12;
      while (x < 1.1) {
        const w = 0.05 + rnd() * 0.07;
        if (rnd() < 0.12) { x += 0.15; continue; }
        out.push({ x: x + w / 2, y, w, h: 0.28 + rnd() * 0.16, c: ['#3a2a22', '#2d3a44', '#5a4632', '#6b6b5a', '#1f2a2a', '#4a2222'][Math.floor(rnd() * 6)] });
        x += w + 0.005;
      }
    }
    return out;
  }, [seed]);
  const inst = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
    const im = new THREE.InstancedMesh(geo, mat, books.length);
    const o = new THREE.Object3D();
    books.forEach((b, i) => {
      o.position.set(b.x, b.y + b.h / 2, 0.02);
      o.scale.set(b.w, b.h, 0.36);
      o.rotation.z = (i % 11 === 0) ? 0.15 : 0;
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
      im.setColorAt(i, new THREE.Color(b.c));
    });
    im.castShadow = true; im.receiveShadow = true;
    im.computeBoundingSphere();
    return im;
  }, [books]);
  return (
    <group>
      {[0.1, 0.62, 1.14, 1.66, 2.18].map((y) => <B key={y} p={[0, y, 0]} s={[2.4, 0.03, 0.5]} m="steel" />)}
      {[-1.19, 1.19].map((x) => <B key={x} p={[x, 1.1, 0]} s={[0.03, 2.2, 0.52]} m="blackMetal" />)}
      <B p={[0, 1.1, -0.24]} s={[2.4, 2.2, 0.02]} m="blackMetal" />
      <primitive object={inst} />
    </group>
  );
}

export function Filing() {
  return (
    <group>
      <B p={[0, 0.65, 0]} s={[0.5, 1.3, 0.62]} m="darkPanel" />
      {[0.2, 0.52, 0.84, 1.16].map((y) => (
        <group key={y}>
          <B p={[0, y, 0.315]} s={[0.44, 0.28, 0.01]} m="steel" />
          <B p={[0, y + 0.06, 0.33]} s={[0.12, 0.02, 0.02]} m="brass" />
        </group>
      ))}
    </group>
  );
}

export function LockerRow({ n = 5, open = false }: { n?: number; open?: boolean }) {
  const w = 2.5 / n;
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <group key={i} position={[-1.25 + w * (i + 0.5), 0, 0]}>
          <B p={[0, 0.975, 0]} s={[w - 0.02, 1.95, 0.5]} m="darkPanel" />
          <group position={[-(w - 0.04) / 2, 0, 0.255]} rotation={[0, open ? -1.6 + (i % 2) * 0.4 : 0, 0]}>
            <B p={[(w - 0.04) / 2, 0.975, 0]} s={[w - 0.04, 1.9, 0.02]} m="panel" />
            {[1.6, 1.64, 1.68].map((y) => <B key={y} p={[(w - 0.04) / 2, y, 0.012]} s={[w * 0.5, 0.012, 0.005]} m="blackMetal" cast={false} />)}
            <B p={[w - 0.1, 1.0, 0.02]} s={[0.03, 0.12, 0.03]} m="steel" />
          </group>
        </group>
      ))}
    </group>
  );
}

export function Locker13({ open }: { open: boolean }) {
  return (
    <group>
      <B p={[0, 0.975, 0]} s={[0.55, 1.95, 0.5]} m="darkPanel" />
      <group position={[-0.26, 0, 0.26]} rotation={[0, open ? -1.9 : 0, 0]}>
        <B p={[0.26, 0.975, 0]} s={[0.52, 1.9, 0.02]} m="red" />
        <C p={[0.44, 1.0, 0.02]} r={0.025} h={0.02} m="brass" rot={[Math.PI / 2, 0, 0]} />
      </group>
    </group>
  );
}

export function Cot() {
  return (
    <group>
      <B p={[0, 0.3, 0]} s={[1.9, 0.05, 0.8]} m="fabric" />
      {[-0.9, 0.9].map((x) => <B key={x} p={[x, 0.15, 0]} s={[0.04, 0.3, 0.78]} m="steel" />)}
      <B p={[-0.7, 0.36, 0]} s={[0.35, 0.08, 0.5]} m="mattress" />
    </group>
  );
}

export function Rug({ variant = 0 }: { variant?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow material={variant ? rug2 : rug1}>
      <planeGeometry args={[variant ? 3.2 : 4.2, variant ? 2.2 : 2.8]} />
    </mesh>
  );
}
const rug1 = new THREE.MeshStandardMaterial({ color: '#2a2f33', roughness: 1 });
const rug2 = new THREE.MeshStandardMaterial({ color: '#3a2a24', roughness: 1 });

export function Storage() {
  return (
    <group>
      <B p={[0, 1.1, 0]} s={[1.0, 2.2, 0.7]} m="darkPanel" />
      <B p={[-0.25, 1.1, 0.355]} s={[0.47, 2.1, 0.02]} m="panel" />
      <B p={[0.25, 1.1, 0.355]} s={[0.47, 2.1, 0.02]} m="panel" />
      <B p={[0, 2.21, 0]} s={[0.3, 0.01, 0.2]} m="paper" cast={false} />
    </group>
  );
}

export function Crate({ size = 1.1 }: { size?: number }) {
  const s = size;
  return (
    <group>
      <B p={[0, s / 2, 0]} s={[s, s, s]} m="wood" uv={1.2} />
      {[-1, 1].map((k) => <B key={k} p={[0, s / 2, k * (s / 2 + 0.005)]} s={[s * 0.98, 0.08, 0.02]} m="wood" />)}
      <S p={[0, 0, 0]} r={0.001} m="wood" />
    </group>
  );
}

export function CrateStack() {
  return (
    <group>
      <Crate size={0.75} />
      <group position={[0, 0.75, 0]} rotation={[0, 0.1, 0]}><Crate size={0.72} /></group>
    </group>
  );
}

export function Barrel() {
  return (
    <group>
      <C p={[0, 0.475, 0]} r={0.3} h={0.95} m="yellow" seg={20} />
      {[0.2, 0.75].map((y) => <C key={y} p={[0, y, 0]} r={0.31} h={0.04} m="blackMetal" seg={20} />)}
      <C p={[0.1, 0.96, 0.1]} r={0.04} h={0.02} m="blackMetal" />
    </group>
  );
}

export function Toolbox() {
  return (
    <group>
      <B p={[0, 0.12, 0]} s={[0.5, 0.24, 0.25]} m="red" />
      <B p={[0, 0.28, 0]} s={[0.3, 0.03, 0.03]} m="blackMetal" />
    </group>
  );
}
