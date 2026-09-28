/** A full procedural human rig: head, torso, arms, hands, legs, feet, with smoothly blended animation. */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { computePose, emptyPose, JOINTS, type Joint } from './poses';
import type { AnimName } from '../game/core/world';

export interface Look {
  skin: string; suit: string; suit2: string; shoes: string;
  hair?: string | null; bun?: boolean; coat?: string | null; glasses?: boolean; band?: boolean; stripe?: string;
  observer?: boolean; limb?: number; thin?: number;
}

export interface RigState { anim: AnimName; speed: number; headYaw?: number; flashlight?: boolean; opacity?: number; glitch?: number; }

const capCache = new Map<string, THREE.CapsuleGeometry>();
function cap(r: number, len: number) {
  const k = `${r}|${len}`;
  let g = capCache.get(k);
  if (!g) { g = new THREE.CapsuleGeometry(r, len, 6, 12); capCache.set(k, g); }
  return g;
}
const sph = new THREE.SphereGeometry(1, 20, 14);
const box = new THREE.BoxGeometry(1, 1, 1);

export function Humanoid({ look, state }: { look: Look; state: () => RigState }) {
  const L = look.limb ?? 1;
  const T = look.thin ?? 1;
  const mats = useMemo(() => {
    const mk = (c: string, r = 0.8, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, transparent: !!look.observer, ...(look.observer ? { emissive: look.skin === '#050506' ? '#0d1018' : '#303844', emissiveIntensity: 1 } : {}), ...extra });
    return {
      skin: mk(look.skin, look.observer ? 1 : 0.55),
      suit: mk(look.suit, 0.85),
      suit2: mk(look.suit2, 0.8),
      shoes: mk(look.shoes, 0.6),
      hair: mk(look.hair ?? '#222', 0.9),
      coat: mk(look.coat ?? '#ddd', 0.75, { side: THREE.DoubleSide }),
      eye: new THREE.MeshStandardMaterial({ color: look.observer ? '#000' : '#15110e', roughness: 0.2, transparent: !!look.observer }),
      band: mk('#f2f2f2', 0.4),
      stripe: mk(look.stripe ?? '#c55a11', 0.6),
      lens: new THREE.MeshStandardMaterial({ color: '#223', metalness: 0.8, roughness: 0.1, transparent: true, opacity: 0.5 }),
      void: new THREE.MeshBasicMaterial({ color: '#000', transparent: true }),
      pale: new THREE.MeshBasicMaterial({ color: new THREE.Color('#d8e4ff').multiplyScalar(3), transparent: true, toneMapped: false }),
    };
  }, [look]);

  const refs = useRef<Partial<Record<Joint, THREE.Group>>>({});
  const root = useRef<THREE.Group>(null);
  const flash = useRef<THREE.Group>(null);
  const cur = useRef(emptyPose());
  const tgt = useRef(emptyPose());
  const phase = useRef(Math.random() * 6);
  const setRef = (k: Joint) => (g: THREE.Group | null) => { if (g) refs.current[k] = g; };

  useFrame(({ clock }, dt) => {
    const s = state();
    const d = Math.min(dt, 0.05);
    const t = clock.elapsedTime;
    const stride = s.anim === 'sprint' ? 1.9 : s.anim === 'run' ? 1.7 : s.anim === 'crouchWalk' ? 0.9 : 1.25;
    phase.current += d * Math.max(s.speed, s.anim === 'walk' ? 1.2 : 0) * (Math.PI / stride);
    computePose(s.anim, phase.current, t, tgt.current);
    if (s.flashlight && ['idle', 'walk', 'run', 'crouchIdle', 'crouchWalk', 'sprint', 'talk'].includes(s.anim)) {
      tgt.current.j.rUpper[0] = -1.2; tgt.current.j.rUpper[2] = -0.05; tgt.current.j.rFore[0] = -0.2;
    }
    if (s.headYaw) tgt.current.j.head[1] += s.headYaw;
    if (look.observer) { tgt.current.j.neck[2] += 0.32; tgt.current.j.head[0] += 0.12; tgt.current.j.spine[0] += 0.08; }
    const k = 1 - Math.exp(-d * (s.anim === 'death' ? 4 : 11));
    for (const j of JOINTS) {
      const c = cur.current.j[j], g = tgt.current.j[j];
      c[0] += (g[0] - c[0]) * k; c[1] += (g[1] - c[1]) * k; c[2] += (g[2] - c[2]) * k;
      const obj = refs.current[j];
      if (obj) {
        let jx = 0, jz = 0;
        if (s.glitch && Math.random() < s.glitch * 0.15) { jx = (Math.random() - 0.5) * 0.8; jz = (Math.random() - 0.5) * 0.8; }
        obj.rotation.set(c[0] + jx, c[1], c[2] + jz);
      }
    }
    cur.current.rootY += (tgt.current.rootY - cur.current.rootY) * k;
    cur.current.rootPitch += (tgt.current.rootPitch - cur.current.rootPitch) * (1 - Math.exp(-d * (s.anim === 'death' ? 3 : 8)));
    if (root.current) {
      root.current.position.y = cur.current.rootY;
      root.current.rotation.x = cur.current.rootPitch;
      if (s.glitch && Math.random() < s.glitch * 0.2) root.current.position.x = (Math.random() - 0.5) * 0.25;
      else root.current.position.x = 0;
    }
    if (flash.current) flash.current.visible = !!s.flashlight;
    if (look.observer) {
      const o = s.opacity ?? 1;
      const flicker = s.glitch && Math.random() < s.glitch * 0.1 ? 0.2 : 1;
      Object.values(mats).forEach((m) => { (m as THREE.Material).opacity = o * flicker; });
      if (root.current) root.current.visible = o > 0.02;
    }
  });

  const hipY = 0.95 * L;
  const thighLen = 0.3 * L, shinLen = 0.3 * L, upperLen = 0.2 * L, foreLen = 0.18 * L;
  const kneeY = -(thighLen + 0.15), ankleY = -(shinLen + 0.13);
  const elbowY = -(upperLen + 0.1), wristY = -(foreLen + 0.1);
  const M = mats;

  const arm = (side: 1 | -1) => (
    <group position={[0.2 * side * T, 0.2, 0]} ref={setRef(side === 1 ? 'lUpper' : 'rUpper')}>
      <mesh geometry={sph} material={M.suit} scale={0.072 * T} castShadow />
      <mesh geometry={cap(0.052 * T, upperLen)} material={M.suit} position={[0, elbowY / 2, 0]} castShadow />
      <group position={[0, elbowY, 0]} ref={setRef(side === 1 ? 'lFore' : 'rFore')}>
        <mesh geometry={cap(0.045 * T, foreLen)} material={M.suit} position={[0, wristY / 2, 0]} castShadow />
        {look.band && side === 1 && <mesh geometry={cap(0.05, 0.03)} material={M.band} position={[0, wristY + 0.05, 0]} />}
        <mesh geometry={box} material={M.skin} position={[0, wristY - 0.03, 0.005]} scale={[0.055 * T, 0.1 * L, 0.03]} castShadow />
        <mesh geometry={box} material={M.skin} position={[-0.03 * side, wristY - 0.01, 0.02]} scale={[0.02, 0.05, 0.02]} rotation={[0, 0, 0.5 * side]} />
        {side === -1 && (
          <group ref={flash} position={[0, wristY - 0.05, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh geometry={cap(0.022, 0.16)} material={M.shoes} />
            <mesh position={[0, 0.11, 0]}><cylinderGeometry args={[0.032, 0.025, 0.05, 12]} /><meshBasicMaterial color={new THREE.Color('#fff4d6').multiplyScalar(3)} toneMapped={false} /></mesh>
          </group>
        )}
      </group>
    </group>
  );

  const leg = (side: 1 | -1) => (
    <group position={[0.095 * side * T, -0.02, 0]} ref={setRef(side === 1 ? 'lThigh' : 'rThigh')}>
      <mesh geometry={cap(0.078 * T, thighLen)} material={M.suit} position={[0, kneeY / 2, 0]} castShadow />
      <group position={[0, kneeY, 0]} ref={setRef(side === 1 ? 'lShin' : 'rShin')}>
        <mesh geometry={cap(0.062 * T, shinLen)} material={M.suit2} position={[0, ankleY / 2, 0]} castShadow />
        <group position={[0, ankleY, 0]} ref={setRef(side === 1 ? 'lFoot' : 'rFoot')}>
          <mesh geometry={box} material={M.shoes} position={[0, -0.04, 0.05]} scale={[0.1, 0.075, 0.25]} castShadow />
        </group>
      </group>
    </group>
  );

  return (
    <group ref={root}>
      <group position={[0, hipY, 0]}>
        {/* pelvis */}
        <mesh geometry={cap(0.15 * T, 0.06)} material={M.suit2} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.75]} castShadow />
        {leg(1)}
        {leg(-1)}
        <group ref={setRef('spine')} position={[0, 0.06, 0]}>
          <mesh geometry={cap(0.14 * T, 0.12)} material={M.suit} position={[0, 0.1, 0]} scale={[1, 1, 0.75]} castShadow />
          {look.coat && (
            <mesh material={M.coat} position={[0, -0.18, 0]} castShadow>
              <cylinderGeometry args={[0.19 * T, 0.27 * T, 0.95 * L, 14, 1, true]} />
            </mesh>
          )}
          <group ref={setRef('chest')} position={[0, 0.2, 0]}>
            <mesh geometry={cap(0.165 * T, 0.2)} material={look.coat ? M.suit2 : M.suit} position={[0, 0.1, 0]} scale={[1.08, 1, 0.72]} castShadow />
            {look.coat && <mesh material={M.coat} position={[0, 0.1, 0]} scale={[1.12, 1, 0.8]}><cylinderGeometry args={[0.2, 0.19, 0.46, 14, 1, true]} /></mesh>}
            {look.stripe && <mesh geometry={box} material={M.stripe} position={[0, 0.15, 0.12]} scale={[0.34, 0.035, 0.02]} />}
            {arm(1)}
            {arm(-1)}
            <group ref={setRef('neck')} position={[0, 0.33, 0]}>
              <mesh geometry={cap(0.048 * T, 0.06)} material={M.skin} position={[0, 0.03, 0]} />
              <group ref={setRef('head')} position={[0, 0.1, 0]}>
                {look.observer ? (
                  <>
                    <mesh geometry={sph} material={M.skin} position={[0, 0.1, 0]} scale={[0.1, 0.15, 0.11]} castShadow />
                    <mesh geometry={sph} material={M.void} position={[0, 0.09, 0.03]} scale={[0.085, 0.12, 0.1]} />
                    <mesh geometry={sph} material={M.pale} position={[0.03, 0.12, 0.1]} scale={0.011} />
                    <mesh geometry={sph} material={M.pale} position={[-0.035, 0.115, 0.1]} scale={0.008} />
                    <mesh material={M.skin} position={[0, 0.13, -0.02]} castShadow><coneGeometry args={[0.15, 0.4, 12, 1, true]} /></mesh>
                  </>
                ) : (
                  <>
                    <mesh geometry={sph} material={M.skin} position={[0, 0.1, 0]} scale={[0.095, 0.12, 0.105]} castShadow />
                    <mesh geometry={sph} material={M.skin} position={[0, 0.04, 0.03]} scale={[0.07, 0.06, 0.08]} />
                    <mesh geometry={box} material={M.skin} position={[0, 0.09, 0.105]} scale={[0.022, 0.04, 0.025]} />
                    <mesh geometry={sph} material={M.eye} position={[0.035, 0.12, 0.092]} scale={0.012} />
                    <mesh geometry={sph} material={M.eye} position={[-0.035, 0.12, 0.092]} scale={0.012} />
                    <mesh geometry={sph} material={M.skin} position={[0.097, 0.1, 0]} scale={[0.015, 0.03, 0.02]} />
                    <mesh geometry={sph} material={M.skin} position={[-0.097, 0.1, 0]} scale={[0.015, 0.03, 0.02]} />
                    {look.hair && <mesh geometry={sph} material={M.hair} position={[0, 0.13, -0.02]} scale={[0.102, 0.108, 0.112]} castShadow />}
                    {look.bun && <mesh geometry={sph} material={M.hair} position={[0, 0.17, -0.1]} scale={0.05} />}
                    {look.glasses && (
                      <>
                        <mesh material={M.lens} position={[0.036, 0.12, 0.1]}><boxGeometry args={[0.045, 0.028, 0.004]} /></mesh>
                        <mesh material={M.lens} position={[-0.036, 0.12, 0.1]}><boxGeometry args={[0.045, 0.028, 0.004]} /></mesh>
                      </>
                    )}
                  </>
                )}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

export const LOOKS: Record<'player' | 'kane' | 'maya' | 'observer' | 'observerNG', Look> = {
  player: { skin: '#c89a7c', suit: '#3a4046', suit2: '#2c3136', shoes: '#141414', hair: '#2a1f18', band: true, stripe: '#c55a11' },
  kane: { skin: '#d2a88a', suit: '#39414a', suit2: '#2a2d33', shoes: '#1b120c', hair: '#8a8a88', coat: '#dcdcd6', glasses: true },
  maya: { skin: '#9a6a4c', suit: '#4a3a44', suit2: '#2a2226', shoes: '#101010', hair: '#140e0a', bun: true, coat: '#e4e6e8' },
  observer: { skin: '#050506', suit: '#16181d', suit2: '#101216', shoes: '#08080a', observer: true, limb: 1.22, thin: 0.72 },
  observerNG: { skin: '#cfd6e0', suit: '#b8c0cc', suit2: '#a8b0bc', shoes: '#909aa6', observer: true, limb: 1.22, thin: 0.72 },
};
