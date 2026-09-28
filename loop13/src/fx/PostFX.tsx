/** Post-processing: bloom, chromatic aberration, grain, vignette, grading, glitch, depth of field — all driven by game state. */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, BrightnessContrast, ChromaticAberration, DepthOfField, EffectComposer, Glitch, HueSaturation, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode, type ChromaticAberrationEffect, type GlitchEffect, type HueSaturationEffect, type BrightnessContrastEffect, type DepthOfFieldEffect, type VignetteEffect } from 'postprocessing';
import * as THREE from 'three';
import { world } from '../game/core/world';
import { useGame } from '../game/core/store';
import { view } from '../game/core/view';

export function PostFX({ quality }: { quality: 'low' | 'medium' | 'high' }) {
  const ca = useRef<ChromaticAberrationEffect>(null);
  const gl = useRef<GlitchEffect>(null);
  const hs = useRef<HueSaturationEffect>(null);
  const bc = useRef<BrightnessContrastEffect>(null);
  const dof = useRef<DepthOfFieldEffect>(null);
  const vig = useRef<VignetteEffect>(null);
  const offset = useRef(new THREE.Vector2(0.0006, 0.0006));

  useFrame(() => {
    const ov = useGame.getState().overlay;
    const d = Math.max(world.distortion, ov.glitch * 0.8);
    const hurt = world.player.health < 40 ? (40 - world.player.health) / 40 : 0;
    const k = 0.0006 + d * 0.006 + hurt * 0.002 + (world.observer.mode === 'HUNTING' ? 0.0015 : 0);
    if (ca.current) ca.current.offset.set(k, k * 0.7);
    if (gl.current) gl.current.mode = ov.glitch > 0.45 || world.distortion > 0.7 ? GlitchMode.CONSTANT_MILD : GlitchMode.DISABLED;
    if (hs.current) {
      const mode = world.light.mode;
      hs.current.saturation = mode === 'final' ? -0.4 : mode === 'blackout' ? -0.5 : world.frozen && world.final.active ? -0.8 : -0.12 - hurt * 0.4;
      hs.current.hue = d * 0.08;
    }
    if (bc.current) bc.current.contrast = 0.12 + d * 0.1;
    if (vig.current) vig.current.darkness = 0.62 + hurt * 0.3 + (world.observer.mode === 'HUNTING' ? 0.15 : 0);
    if (dof.current) {
      dof.current.bokehScale = view.shot?.dof ? 3 : 0;
      dof.current.cocMaterial.focusDistance = 0.02;
    }
  });

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom intensity={quality === 'low' ? 0.5 : 0.75} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
      {quality === 'high' ? <DepthOfField ref={dof} focusDistance={0.02} focalLength={0.05} bokehScale={0} /> : <></>}
      <ChromaticAberration ref={ca} offset={offset.current} radialModulation modulationOffset={0.3} />
      <HueSaturation ref={hs} saturation={-0.12} />
      <BrightnessContrast ref={bc} brightness={0.0} contrast={0.12} />
      <Glitch ref={gl} mode={GlitchMode.DISABLED} delay={new THREE.Vector2(0.1, 0.5)} duration={new THREE.Vector2(0.05, 0.2)} strength={new THREE.Vector2(0.1, 0.3)} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.35} />
      <Vignette ref={vig} offset={0.3} darkness={0.62} />
    </EffectComposer>
  );
}
