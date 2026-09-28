/**
 * Lighting: instanced ceiling fixtures (emissive, flicker per lamp) + a fixed
 * pool of real point lights reassigned every frame to the nearest visible lamps
 * (no shader recompiles), fake volumetric cones, mode-driven colour grading.
 */
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LAMPS } from '../game/data/level';
import { world } from '../game/core/world';
import { lampFactor } from '../game/systems/LightingSystem';
import { view } from '../game/core/view';
import { visibleRooms } from './visibility';
import { coneTexture } from './textures';


const RED = new THREE.Color('#ff2410');
const EMERG = new THREE.Color('#ff3a1a');
const tmp = new THREE.Color();

export function Lighting({ pool, shadowCount }: { pool: number; shadowCount: number }) {
  const { scene } = useThree();
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const baseColors = useMemo(() => LAMPS.map((l) => new THREE.Color(l.color)), []);

  const [housing, panels, cones] = useMemo(() => {
    const hGeo = new THREE.BoxGeometry(1.2, 0.08, 0.34);
    const pGeo = new THREE.PlaneGeometry(1.1, 0.24);
    pGeo.rotateX(Math.PI / 2);
    const cGeo = new THREE.ConeGeometry(1.5, 2.6, 20, 1, true);
    cGeo.translate(0, -1.3, 0);
    const h = new THREE.InstancedMesh(hGeo, new THREE.MeshStandardMaterial({ color: '#2a2d30', metalness: 0.7, roughness: 0.4 }), LAMPS.length);
    const p = new THREE.InstancedMesh(pGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), LAMPS.length);
    const c = new THREE.InstancedMesh(cGeo, new THREE.MeshBasicMaterial({ map: coneTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.05 }), LAMPS.length);
    const o = new THREE.Object3D();
    LAMPS.forEach((l, i) => {
      o.position.set(l.x, l.y, l.z);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      h.setMatrixAt(i, o.matrix);
      o.position.y = l.y - 0.045;
      o.updateMatrix();
      p.setMatrixAt(i, o.matrix);
      p.setColorAt(i, baseColors[i]);
      o.position.y = l.y - 0.05;
      const k = Math.min(1.2, (l.y + 0.1) / 3.2);
      o.scale.set(k, k, k);
      o.updateMatrix();
      c.setMatrixAt(i, o.matrix);
      c.setColorAt(i, baseColors[i]);
    });
    h.receiveShadow = true;
    return [h, p, c];
  }, [baseColors]);

  const hemi = useRef<THREE.HemisphereLight>(null);
  const frame = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const L = world.light;
    const mode = L.mode;
    const alarmPulse = 0.55 + 0.45 * Math.sin(t * 5);
    // fixture emissive colours
    for (let i = 0; i < LAMPS.length; i++) {
      const lamp = LAMPS[i];
      const f = lampFactor(lamp.id, t);
      tmp.copy(baseColors[i]);
      if (mode === 'alarm') tmp.lerp(RED, 0.65 * alarmPulse);
      if (mode === 'final') tmp.set('#ffffff');
      const k = mode === 'blackout' ? 0.02 : f * (lamp.room === 'UNKNOWN' ? 1.5 : 2.2);
      panels.setColorAt(i, tmp.clone().multiplyScalar(k));
      cones.setColorAt(i, tmp.clone().multiplyScalar(mode === 'blackout' ? 0 : f * (lamp.room === 'CORE' ? 0.9 : 0.55)));
    }
    if (panels.instanceColor) panels.instanceColor.needsUpdate = true;
    if (cones.instanceColor) cones.instanceColor.needsUpdate = true;

    // light pool: nearest visible lamps to the camera (re-sorted every 3rd frame)
    frame.current++;
    const cam = view.camPos;
    if (frame.current % 3 === 0 || !lights.current[0]?.userData.lamp) {
      const cands = LAMPS.map((l, i) => ({ i, d: (l.x - cam.x) ** 2 + (l.z - cam.z) ** 2 + (visibleRooms.has(l.room) ? 0 : 1e6) }))
        .sort((a, b) => a.d - b.d).slice(0, pool);
      cands.forEach((c, k) => { const li = lights.current[k]; if (li) li.userData.lamp = c.i; });
    }
    lights.current.forEach((li) => {
      if (!li) return;
      const idx = li.userData.lamp as number | undefined;
      if (idx === undefined) { li.intensity = 0; return; }
      const lamp = LAMPS[idx];
      const f = lampFactor(lamp.id, t);
      li.position.set(lamp.x, lamp.y - 0.35, lamp.z);
      if (mode === 'blackout') {
        li.color.copy(EMERG);
        li.intensity = idx % 3 === 0 ? 2.2 * (0.8 + 0.2 * Math.sin(t * 2)) : 0;
        li.distance = 7;
      } else {
        li.color.copy(baseColors[idx]);
        if (mode === 'alarm') li.color.lerp(RED, 0.7 * alarmPulse);
        if (mode === 'final') li.color.set('#ffffff');
        li.intensity = lamp.intensity * 2.6 * f * (mode === 'final' ? 3 : 1);
        li.distance = lamp.room === 'CORE' || lamp.room === 'REACTOR' ? 16 : 10;
      }
    });
    if (hemi.current) {
      hemi.current.intensity = mode === 'blackout' ? 0.04 : mode === 'final' ? 1.2 : 0.18;
    }
    const fog = scene.fog as THREE.FogExp2 | null;
    if (fog) {
      const target = mode === 'alarm' ? tmp.set('#1a0606') : mode === 'core' ? tmp.set('#0b0820') : mode === 'final' ? tmp.set('#cfd6e0') : mode === 'blackout' ? tmp.set('#020203') : tmp.set('#0a0d10');
      fog.color.lerp(target, 0.05);
      const dens = mode === 'final' ? 0.02 : world.player.room === 'UNKNOWN' ? 0.06 : world.player.room === 'REACTOR' || world.player.room === 'MAINT' ? 0.055 : 0.035;
      fog.density += (dens - fog.density) * 0.05;
    }
  });

  return (
    <group>
      <hemisphereLight ref={hemi} args={['#9fb4c8', '#1a1510', 0.18]} />
      <primitive object={housing} />
      <primitive object={panels} />
      <primitive object={cones} />
      {Array.from({ length: pool }, (_, i) => (
        <pointLight
          key={i}
          ref={(r) => { lights.current[i] = r; }}
          intensity={0}
          distance={10}
          decay={1.7}
          castShadow={i < shadowCount}
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-bias={-0.004}
          shadow-camera-near={0.3}
          shadow-camera-far={12}
        />
      ))}
    </group>
  );
}
