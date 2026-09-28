import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Scene } from './Scene';
import { useGame, G } from './game/core/store';
import { installInput, requestPointerLock } from './game/core/input';
import { SaveSystem } from './game/systems/SaveSystem';
import { Audio } from './game/audio/AudioEngine';
import { getMaterials } from './world/materials';
import { Flow, isPlayPhase } from './game/systems/Flow';
import { Hud, Notifications, Subtitles } from './ui/Hud';
import { LoadingScreen, MainMenu, PauseMenu, Overlay, EndingScreen } from './ui/Menus';
import { CctvPanel, CorePanel, DialoguePanel, DocumentPanel, InspectPanel, KeypadPanel, SymbolsPanel, TerminalPanel } from './ui/Panels';
import { MemoryScreen } from './ui/MemoryScreen';
import { DEBUG, formatClock } from './game/core/constants';
import { world } from './game/core/world';

function UI() {
  const phase = useGame((s) => s.phase);
  const panel = useGame((s) => s.panel);
  return (
    <div className="ui">
      {phase === 'LOADING' && <LoadingScreen />}
      {phase === 'MENU' && <MainMenu />}
      <Hud />
      {panel === 'document' && <DocumentPanel />}
      {panel === 'inspect' && <InspectPanel />}
      {panel === 'keypad' && <KeypadPanel />}
      {panel === 'symbols' && <SymbolsPanel />}
      {panel === 'terminal' && <TerminalPanel />}
      {panel === 'cctv' && <CctvPanel />}
      {panel === 'core' && <CorePanel />}
      {panel === 'dialogue' && <DialoguePanel />}
      {phase === 'PAUSED' && panel === 'memory' && <MemoryScreen inGame onClose={() => Flow.unpause()} />}
      {phase === 'PAUSED' && panel === 'none' && <PauseMenu />}
      <Notifications />
      <Subtitles />
      <Overlay />
      {phase === 'ENDING' && <EndingScreen />}
      {DEBUG && <DebugPanel />}
    </div>
  );
}

function DebugPanel() {
  const [, t] = useState(0);
  useEffect(() => { const iv = setInterval(() => t((n) => n + 1), 300); return () => clearInterval(iv); }, []);
  const p = world.player.pos;
  return <div className="debug">{G().phase} · {formatClock(world.t, true)} · loop {G().run.loop} · {p.x.toFixed(1)},{p.z.toFixed(1)} · obs {world.observer.mode} · F6 +30s F7 +5s F8 reset</div>;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const settings = useGame((s) => s.settings);

  useEffect(() => {
    installInput();
    SaveSystem.load();
    Audio.applySettings(G().settings);
    const set = (progress: number, label: string) => useGame.setState({ loading: { progress, label } });
    set(0.05, 'LOADING ORPHEUS');
    // generate textures in a separate tick so the loading screen paints first
    setTimeout(() => {
      set(0.2, 'GENERATING MATERIALS');
      setTimeout(() => {
        getMaterials(G().settings.graphics);
        set(0.5, 'BUILDING FACILITY');
        setReady(true);
      }, 30);
    }, 60);
    // pointer lock lost while playing (ESC) → pause
    const onLock = () => {
      if (!document.pointerLockElement && isPlayPhase(G().phase) && G().panel === 'none') Flow.pause();
    };
    document.addEventListener('pointerlockchange', onLock);
    const onVis = () => { if (document.hidden && isPlayPhase(G().phase)) Flow.pause(); };
    document.addEventListener('visibilitychange', onVis);
    const onUnload = () => SaveSystem.save();
    window.addEventListener('beforeunload', onUnload);
    return () => { document.removeEventListener('pointerlockchange', onLock); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('beforeunload', onUnload); };
  }, []);

  useEffect(() => { Audio.applySettings(settings); SaveSystem.saveSoon(); }, [settings]);

  const dpr: [number, number] = settings.graphics === 'low' ? [0.6, 0.8] : settings.graphics === 'medium' ? [0.8, 1] : [1, 1.5];
  return (
    <div className="app">
      {ready && (
        <Canvas
          shadows={settings.shadows !== 'off' ? { type: THREE.PCFSoftShadowMap } : false}
          dpr={dpr}
          gl={{ antialias: !settings.postprocessing, powerPreference: 'high-performance', stencil: false }}
          camera={{ fov: 62, near: 0.05, far: 120, position: [0, 3, 6] }}
          onPointerDown={() => { if (isPlayPhase(G().phase)) requestPointerLock(); }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}
        >
          <Suspense fallback={null}><Scene /></Suspense>
        </Canvas>
      )}
      <UI />
    </div>
  );
}
