/** Atmospheric particles: dust around the camera, steam jets, Core energy motes. They freeze when time freezes. */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { view } from '../game/core/view';
import { world } from '../game/core/world';
import { dotTexture } from './textures';

const dot = typeof document !== 'undefined' ? dotTexture() : null;

export function Dust({ count }: { count: number }) {
  const [geo, vel] = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const v = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 18; p[i * 3 + 1] = Math.random() * 4; p[i * 3 + 2] = (Math.random() - 0.5) * 18;
      v[i * 3] = (Math.random() - 0.5) * 0.06; v[i * 3 + 1] = (Math.random() - 0.5) * 0.03; v[i * 3 + 2] = (Math.random() - 0.5) * 0.06;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return [g, v];
  }, [count]);
  const mat = useMemo(() => new THREE.PointsMaterial({ size: 0.03, map: dot, transparent: true, depthWrite: false, opacity: 0.55, color: '#d8cdb8', blending: THREE.AdditiveBlending, sizeAttenuation: true }), []);
  const ref = useRef<THREE.Points>(null);
  useFrame(({ clock }, dt) => {
    if (world.frozen) return; // suspended in time
    const p = geo.attributes.position as THREE.BufferAttribute;
    const a = p.array as Float32Array;
    const cx = view.camPos.x, cz = view.camPos.z;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      a[i * 3] += (vel[i * 3] + Math.sin(t * 0.3 + i) * 0.02) * dt;
      a[i * 3 + 1] += vel[i * 3 + 1] * dt;
      a[i * 3 + 2] += (vel[i * 3 + 2] + Math.cos(t * 0.2 + i) * 0.02) * dt;
      // wrap inside a box that follows the camera
      if (a[i * 3] - cx > 9) a[i * 3] -= 18; else if (a[i * 3] - cx < -9) a[i * 3] += 18;
      if (a[i * 3 + 2] - cz > 9) a[i * 3 + 2] -= 18; else if (a[i * 3 + 2] - cz < -9) a[i * 3 + 2] += 18;
      if (a[i * 3 + 1] > 4) a[i * 3 + 1] = 0; else if (a[i * 3 + 1] < 0) a[i * 3 + 1] = 4;
    }
    p.needsUpdate = true;
    mat.opacity = world.light.mode === 'blackout' ? 0.15 : 0.5;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

interface Emitter { pos: [number, number, number]; dir: [number, number, number]; color: string; size: number; rate: number; life: number; }

export function Steam({ quality }: { quality: 'low' | 'medium' | 'high' }) {
  const emitters: Emitter[] = useMemo(() => [
    { pos: [5, 2.7, 18.4], dir: [0, -0.6, 0.5], color: '#bfc7cc', size: 0.5, rate: 1, life: 2.5 },
    { pos: [-14, 2.7, 21.1], dir: [0, -0.5, -0.4], color: '#bfc7cc', size: 0.5, rate: 1, life: 2.5 },
    { pos: [21, 0.3, 21.5], dir: [0, 1, 0], color: '#c9c2b8', size: 0.8, rate: 1, life: 3.5 },
    { pos: [28, 0.3, 14], dir: [0, 1, 0], color: '#c9c2b8', size: 0.8, rate: 1, life: 3.5 },
    { pos: [24.5, 5.2, 18], dir: [0, 0.6, 0], color: '#ffb080', size: 1.0, rate: 1, life: 3 },
  ], []);
  const per = quality === 'low' ? 10 : quality === 'medium' ? 20 : 32;
  const total = emitters.length * per;
  const state = useMemo(() => ({
    pos: new Float32Array(total * 3), age: new Float32Array(total).map((_, i) => (i % per) / per * 3), col: new Float32Array(total * 3),
  }), [total, per]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(state.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(state.col, 3));
    return g;
  }, [state]);
  const mat = useMemo(() => new THREE.PointsMaterial({ size: 0.9, map: dot, transparent: true, depthWrite: false, vertexColors: true, opacity: 0.22 }), []);
  useFrame((_, dt) => {
    if (world.frozen) return;
    for (let e = 0; e < emitters.length; e++) {
      const em = emitters[e];
      for (let k = 0; k < per; k++) {
        const i = e * per + k;
        state.age[i] += dt;
        if (state.age[i] > em.life) state.age[i] = 0;
        const a = state.age[i];
        const f = a / em.life;
        state.pos[i * 3] = em.pos[0] + em.dir[0] * a + Math.sin(i * 13.1 + a) * 0.25 * f;
        state.pos[i * 3 + 1] = em.pos[1] + em.dir[1] * a + a * 0.15;
        state.pos[i * 3 + 2] = em.pos[2] + em.dir[2] * a + Math.cos(i * 7.3 + a) * 0.25 * f;
        const c = new THREE.Color(em.color).multiplyScalar(Math.sin(f * Math.PI));
        state.col[i * 3] = c.r; state.col[i * 3 + 1] = c.g; state.col[i * 3 + 2] = c.b;
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

export function CoreMotes({ count }: { count: number }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);
  const seeds = useMemo(() => Array.from({ length: count }, () => [Math.random() * 6.28, 1.2 + Math.random() * 3, Math.random() * 6, 0.2 + Math.random() * 0.8]), [count]);
  const mat = useMemo(() => new THREE.PointsMaterial({ size: 0.07, map: dot, transparent: true, depthWrite: false, color: new THREE.Color('#9d8cff').multiplyScalar(2), blending: THREE.AdditiveBlending, toneMapped: false }), []);
  const time = useRef(0);
  useFrame((_, dt) => {
    time.current += world.frozen ? dt * 0.02 : dt * (1 + world.final.stage);
    const a = (geo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    seeds.forEach(([ph, r, h, sp], i) => {
      const t = time.current * sp + ph;
      a[i * 3] = 7.5 + Math.cos(t) * r;
      a[i * 3 + 1] = 0.5 + ((h + time.current * 0.3 * sp) % 6);
      a[i * 3 + 2] = -24.5 + Math.sin(t) * r;
    });
    geo.attributes.position.needsUpdate = true;
    mat.color.set(world.final.broken ? '#ffffff' : '#9d8cff').multiplyScalar(2);
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
