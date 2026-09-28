/** Everything inside the WebGL canvas. */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { Game } from './game/Game';
import { useGame } from './game/core/store';
import { Level } from './world/Level';
import { Doors } from './world/Doors';
import { Details } from './world/Details';
import { Lighting } from './world/Lighting';
import { Dust, Steam, CoreMotes } from './world/Particles';
import { Player, NPC, Observer, DuplicateKane, Crates } from './entities/Characters';
import { CameraRig } from './camera/CameraRig';
import { PostFX } from './fx/PostFX';
import { updateScreens } from './world/screens';
import { updateVisibility } from './world/visibility';

function GameLoop() {
  const acc = useRef(0);
  const { scene } = useThree();
  useEffect(() => { (window as unknown as Record<string, unknown>).__scene = scene; }, [scene]);
  useFrame(({ clock }, dt) => {
    Game.update(dt);
    acc.current += dt;
    if (acc.current > 0.25) { acc.current = 0; updateScreens(clock.elapsedTime); }
  }, -2);
  return null;
}

/** Compiles every shader once so the first frames of play don't hitch, then hands over to the menu. */
function Warmup() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let cancelled = false;
    const set = (progress: number, label: string) => useGame.setState({ loading: { progress, label } });
    set(0.7, 'COMPILING SHADERS');
    requestAnimationFrame(() => {
      updateVisibility(true);
      const vis: THREE.Object3D[] = [];
      scene.traverse((o) => { if (!o.visible) { vis.push(o); o.visible = true; } });
      try { gl.compile(scene, camera); } catch { /* compile is best-effort */ }
      vis.forEach((o) => { o.visible = false; });
      set(0.95, 'SYNCHRONIZING RELAYS');
      setTimeout(() => {
        if (cancelled) return;
        set(1, 'READY');
        setTimeout(() => { if (!cancelled && useGame.getState().phase === 'LOADING') { useGame.setState({ phase: 'MENU' }); useGame.getState().setOverlay({ black: 0 }); } }, 400);
      }, 300);
    });
    return () => { cancelled = true; };
  }, [gl, scene, camera]);
  return null;
}

export function Scene() {
  const s = useGame((st) => st.settings);
  const pool = s.graphics === 'low' ? 5 : s.graphics === 'medium' ? 7 : 9;
  const shadowCount = s.shadows === 'high' ? 1 : 0;
  const dust = s.particles === 'low' ? 250 : s.particles === 'medium' ? 600 : 1200;
  return (
    <>
      <color attach="background" args={['#030405']} />
      <fogExp2 attach="fog" args={['#0a0d10', 0.035]} />
      <Environment frames={1} resolution={64}>
        <Lightformer intensity={0.6} color="#bcd4ff" position={[0, 4, 0]} scale={[10, 10, 1]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer intensity={0.25} color="#ffcf9a" position={[5, 1, 5]} scale={[4, 2, 1]} />
        <Lightformer intensity={0.2} color="#9a8cff" position={[-5, 1, -5]} scale={[4, 2, 1]} />
      </Environment>
      <GameLoop />
      <CameraRig />
      <Level />
      <Doors />
      <Details />
      <Lighting key={`${pool}-${shadowCount}`} pool={pool} shadowCount={shadowCount} />
      <Player shadows={s.shadows !== 'off'} />
      <NPC id="kane" />
      <NPC id="maya" />
      <DuplicateKane />
      <Observer />
      <Crates />
      <Dust count={dust} />
      <Steam quality={s.particles} />
      <CoreMotes count={s.particles === 'low' ? 60 : 180} />
      {s.postprocessing && <PostFX quality={s.graphics} />}
      <Warmup />
    </>
  );
}
