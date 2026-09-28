/** Builds ORPHEUS from level data: floors, ceilings, walls, trims, pipes, cables and props, grouped per room for culling. */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PROPS, ROOMS, type PropDef, type RoomDef } from '../game/data/level';
import { WALLS } from '../game/physics/colliders';
import { WALL_T } from '../game/core/constants';
import { FLOOR_MAT, WALL_MAT, getMaterials, worldBox } from './materials';
import { At, B, C } from './primitives';
import { visibleRooms } from './visibility';
import * as F from './props/Furniture';
import * as Mc from './props/Machines';
import { world } from '../game/core/world';

function PropView({ p }: { p: PropDef }) {
  switch (p.type) {
    case 'desk': return <F.Desk computer screen={p.room === 'MEDICAL' ? 'medical' : p.room === 'REACTOR' ? 'reactor' : 'terminal'} />;
    case 'labBench': return <F.LabBench />;
    case 'chair': return <F.Chair />;
    case 'serverRack': return <Mc.ServerRack />;
    case 'shelf': return <F.Shelf seed={Math.round(p.x * 7 + p.z * 3)} />;
    case 'lockerRow': return <LockersMaybeOpen room={p.room} />;
    case 'locker': return <Locker13View />;
    case 'bunk': return <F.Bunk />;
    case 'medBed': return <F.MedBed />;
    case 'filing': return <F.Filing />;
    case 'medCabinet': return <F.MedCabinet />;
    case 'crateStack': return <F.CrateStack />;
    case 'barrel': return <F.Barrel />;
    case 'generator': return <Mc.Generator index={Number(p.id?.split('_')[1] ?? 0)} />;
    case 'reactor': return <Mc.Reactor />;
    case 'temporalCore': return <Mc.TemporalCore />;
    case 'table': return <F.Table />;
    case 'bench': return <F.Bench />;
    case 'pillar': return <F.Pillar h={p.h} />;
    case 'plant': return <F.Plant />;
    case 'fridge': return <F.Fridge />;
    case 'console': return <Mc.SecurityConsole />;
    case 'coreConsole': return <Mc.CoreConsole />;
    case 'reception': return <F.Reception />;
    case 'storage': return <F.Storage />;
    case 'pod': return <Mc.Pod />;
    case 'cot': return <F.Cot />;
    case 'cart': return <F.Cart />;
    case 'ivStand': return <F.IVStand />;
    case 'monitorStand': return <F.MonitorStand />;
    case 'anchor': return <Mc.Anchor index={Number(p.id?.split('_')[1] ?? 0)} />;
    case 'crate': return <F.Crate />;
    case 'toolbox': return <F.Toolbox />;
    case 'rug': return <F.Rug variant={p.variant} />;
  }
}

function LockersMaybeOpen({ room }: { room: string }) {
  const open = room === 'DORM' && world.anomalies.includes('LOCKERS_OPEN');
  return <F.LockerRow open={open} />;
}
function Locker13View() {
  const door = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!door.current) return;
    const tgt = world.flags.has('lockerOpen') ? -1.9 : 0;
    door.current.rotation.y += (tgt - door.current.rotation.y) * Math.min(1, dt * 4);
  });
  return (
    <group>
      <B p={[0, 0.975, 0]} s={[0.55, 1.95, 0.5]} m="darkPanel" />
      <group ref={door} position={[-0.26, 0, 0.26]}>
        <B p={[0.26, 0.975, 0]} s={[0.52, 1.9, 0.02]} m="red" />
        <C p={[0.44, 1.0, 0.02]} r={0.025} h={0.02} m="brass" rot={[Math.PI / 2, 0, 0]} />
      </group>
    </group>
  );
}

/** Pipes and cable runs along the ceiling of each room (instanced). */
function Dressing({ room }: { room: RoomDef }) {
  const [x0, z0, x1, z1] = room.rect;
  const h = room.height;
  const long = x1 - x0 >= z1 - z0 ? 'x' : 'z';
  const m = getMaterials();
  const pipes = useMemo(() => {
    const out: { p: [number, number, number]; len: number; r: number; mat: THREE.Material; axis: 'x' | 'z' }[] = [];
    const len = long === 'x' ? x1 - x0 - 0.6 : z1 - z0 - 0.6;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const side = long === 'x' ? z0 + WALL_T + 0.25 : x0 + WALL_T + 0.25;
    const industrial = ['dark', 'concrete'].includes(room.wall) || room.corridor;
    const radii = industrial ? [0.12, 0.07, 0.05] : [0.06];
    radii.forEach((r, i) => {
      const off = side + i * 0.28;
      const y = h - 0.25 - (i % 2) * 0.15;
      out.push({ p: long === 'x' ? [cx, y, off] : [off, y, cz], len, r, mat: i === 0 ? m.steel : i === 1 ? m.copper : m.blackMetal, axis: long });
    });
    if (industrial) {
      const off2 = long === 'x' ? z1 - WALL_T - 0.2 : x1 - WALL_T - 0.2;
      out.push({ p: long === 'x' ? [cx, h - 0.3, off2] : [off2, h - 0.3, cz], len, r: 0.09, mat: m.yellow, axis: long });
    }
    return out;
  }, [room, long, x0, x1, z0, z1, h, m]);
  const cables = useMemo(() => {
    // sagging cable bundles between hangers
    const pts: THREE.Vector3[] = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const along = long === 'x' ? x0 + 0.4 + t * (x1 - x0 - 0.8) : z0 + 0.4 + t * (z1 - z0 - 0.8);
      const sag = Math.abs(Math.sin(t * Math.PI * 4)) * 0.18;
      const y = h - 0.15 - sag;
      const other = long === 'x' ? z1 - WALL_T - 0.5 : x1 - WALL_T - 0.5;
      pts.push(long === 'x' ? new THREE.Vector3(along, y, other) : new THREE.Vector3(other, y, along));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return [0, 1, 2].map((k) => new THREE.TubeGeometry(curve, 80, 0.02 + k * 0.006, 5).translate(0, -k * 0.035, k * 0.02));
  }, [long, x0, x1, z0, z1, h]);
  return (
    <group>
      {pipes.map((p, i) => (
        <mesh key={i} position={p.p} rotation={p.axis === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]} material={p.mat} castShadow>
          <cylinderGeometry args={[p.r, p.r, p.len, 12]} />
        </mesh>
      ))}
      {pipes.length > 1 && Array.from({ length: Math.floor((long === 'x' ? x1 - x0 : z1 - z0) / 2.5) }, (_, i) => {
        const a = (long === 'x' ? x0 : z0) + 1 + i * 2.5;
        const off = long === 'x' ? z0 + WALL_T + 0.3 : x0 + WALL_T + 0.3;
        return <B key={i} p={long === 'x' ? [a, h - 0.3, off] : [off, h - 0.3, a]} s={long === 'x' ? [0.06, 0.4, 0.7] : [0.7, 0.4, 0.06]} m="blackMetal" cast={false} />;
      })}
      {cables.map((g, i) => <mesh key={`c${i}`} geometry={g} material={i === 2 ? m.red : m.rubber} />)}
    </group>
  );
}

function Room({ room }: { room: RoomDef }) {
  const ref = useRef<THREE.Group>(null);
  const [x0, z0, x1, z1] = room.rect;
  const w = x1 - x0, d = z1 - z0;
  const m = getMaterials();
  const floorMat = m[FLOOR_MAT[room.floor]];
  const wallMat = m[WALL_MAT[room.wall]];
  const walls = useMemo(() => WALLS.filter((s) => s.room === room.id), [room.id]);
  const props = useMemo(() => PROPS.filter((p) => p.room === room.id), [room.id]);
  useFrame(() => { if (ref.current) ref.current.visible = visibleRooms.has(room.id); });
  const floorGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, d);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const sc = room.floor === 'grate' ? 1.5 : 2.5;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / sc, (uv.getY(i) * d) / sc);
    return g;
  }, [w, d, room.floor]);
  return (
    <group ref={ref}>
      <mesh geometry={floorGeo} material={floorMat} rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]} receiveShadow />
      <mesh geometry={floorGeo} material={room.id === 'CORE' || room.id === 'REACTOR' ? m.darkPanel : m.ceiling} rotation={[Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, room.height, (z0 + z1) / 2]} receiveShadow />
      {walls.map((s, i) => {
        const b = s.box;
        const sw = b.maxX - b.minX, sh = b.maxY - b.minY, sd = b.maxZ - b.minZ;
        const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2, cz = (b.minZ + b.maxZ) / 2;
        const inward = s.side === 'n' ? [0, 0, 1] : s.side === 's' ? [0, 0, -1] : s.side === 'w' ? [1, 0, 0] : [-1, 0, 0];
        const along = s.side === 'n' || s.side === 's' ? sw : sd;
        const surf = (off: number) => [cx + inward[0] * (WALL_T / 2 + off), cz + inward[2] * (WALL_T / 2 + off)];
        const [bx, bz] = surf(0.015);
        const isX = s.side === 'n' || s.side === 's';
        return (
          <group key={i}>
            <mesh geometry={worldBox(sw, sh, sd, 2.4)} material={wallMat} position={[cx, cy, cz]} castShadow receiveShadow />
            {!s.lintel && along > 0.3 && (
              <>
                <mesh geometry={worldBox(isX ? along : 0.03, 0.14, isX ? 0.03 : along, 2)} material={m.blackMetal} position={[bx, 0.07, bz]} />
                {room.height > 3 && <mesh geometry={worldBox(isX ? along : 0.02, 0.06, isX ? 0.02 : along, 2)} material={room.wall === 'lab' ? m.plastic : m.yellow} position={[bx, 1.1, bz]} />}
              </>
            )}
          </group>
        );
      })}
      {/* ceiling beams */}
      {Array.from({ length: Math.max(1, Math.floor((w >= d ? w : d) / 3)) }, (_, i) => {
        const a = (w >= d ? x0 : z0) + 1.5 + i * 3;
        return w >= d
          ? <B key={`bm${i}`} p={[a, room.height - 0.12, (z0 + z1) / 2]} s={[0.2, 0.24, d - 0.5]} m="darkPanel" cast={false} />
          : <B key={`bm${i}`} p={[(x0 + x1) / 2, room.height - 0.12, a]} s={[w - 0.5, 0.24, 0.2]} m="darkPanel" cast={false} />;
      })}
      {room.id !== 'ELEVATOR' && <Dressing room={room} />}
      {props.map((p, i) => (
        <At key={i} x={p.x} y={p.y ?? 0} z={p.z} rot={p.rot ?? 0}><PropView p={p} /></At>
      ))}
      {room.id === 'REACTOR' && <ReactorCatwalk />}
      {room.id === 'CORE' && <CoreRoomDetail />}
    </group>
  );
}

function ReactorCatwalk() {
  return (
    <group>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <C key={i} p={[24.5 + Math.cos(a) * 3.3, 0.55, 18 + Math.sin(a) * 3.3]} r={0.03} h={1.1} m="yellow" />;
      })}
      <mesh position={[24.5, 1.08, 18]} rotation={[Math.PI / 2, 0, 0]} material={getMaterials().yellow}><torusGeometry args={[3.3, 0.035, 6, 48]} /></mesh>
      {[[18.5, 5.5, 18], [30.5, 5.5, 18]].map((p, i) => <B key={i} p={p as [number, number, number]} s={[0.4, 0.3, 15]} m="blackMetal" />)}
    </group>
  );
}

function CoreRoomDetail() {
  return (
    <group>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const len = 5;
        return <mesh key={i} position={[7.5 + Math.cos(a) * 5.7, 0.05, -24.5 + Math.sin(a) * 5.7]} rotation={[0, -a, Math.PI / 2]} material={getMaterials().rubber}><cylinderGeometry args={[0.06, 0.06, len, 6]} /></mesh>;
      })}
      <mesh position={[7.5, 0.02, -24.5]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[3.4, 3.55, 64]} /><meshBasicMaterial color={new THREE.Color('#6f5cff').multiplyScalar(2)} toneMapped={false} /></mesh>
      <mesh position={[7.5, 0.02, -24.5]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[7.2, 7.3, 64]} /><meshBasicMaterial color={new THREE.Color('#6f5cff').multiplyScalar(1.2)} toneMapped={false} /></mesh>
    </group>
  );
}

export function Level() {
  return <group>{ROOMS.map((r) => <Room key={r.id} room={r} />)}</group>;
}
