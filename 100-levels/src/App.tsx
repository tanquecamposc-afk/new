import { useEffect, useRef, useState } from 'react';
import { useGame } from './store/gameStore';
import { useProfile } from './store/profileStore';
import { GameManager } from './core/GameManager';
import { Audio } from './audio/AudioManager';
import { Input } from './core/Input';
import { MainMenu } from './ui/screens/MainMenu';
import { Loading, LoadingView } from './ui/screens/Loading';
import { LevelSelect } from './ui/screens/LevelSelect';
import { Shop } from './ui/screens/Shop';
import { Inventory } from './ui/screens/Inventory';
import { Profile, Achievements, Settings, Speedrun, Mutations } from './ui/screens/Pages';
import { Pause, Victory, Death, Ending } from './ui/screens/Results';
import { HUD, Overlays, TouchControls } from './ui/hud/HUD';

const BOOT_TIPS = ['Every level hides a secret.', "Don't trust the darkness.", 'Level 100 is waiting.'];

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const screen = useGame((s) => s.screen);
  const touch = useProfile((s) => s.data.settings.touchControls);
  const [boot, setBoot] = useState(0);
  const [tip] = useState(() => BOOT_TIPS[Math.floor(Math.random() * BOOT_TIPS.length)]);

  useEffect(() => {
    useProfile.getState().load();
    useProfile.getState().checkAchievements();
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    if (coarse && !useProfile.getState().data.settings.touchControls) useProfile.getState().setSettings({ touchControls: true });
    // Staged boot so the loading bar reflects real work
    let cancelled = false;
    (async () => {
      const step = (p: number) => new Promise<void>((r) => setTimeout(() => { if (!cancelled) setBoot(p); r(); }, 60));
      await step(0.15);
      GameManager.init(host.current!);
      await step(0.55);
      await document.fonts?.ready.catch(() => undefined);
      await step(0.85);
      await step(1);
      setTimeout(() => !cancelled && useGame.getState().setScreen('menu'), 350);
    })();
    // Audio can only start after a user gesture
    const unlock = () => {
      Audio.init();
      GameManager.applySettings();
      if (!GameManager.session) Audio.playMusic('menu');
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      cancelled = true;
    };
  }, []);

  // Input only active while actually playing
  useEffect(() => {
    Input.enabled = screen === 'playing';
  }, [screen]);

  // Clicking the canvas during gameplay captures the mouse
  const onCanvasClick = () => {
    if (useGame.getState().screen === 'playing' && !useGame.getState().craftOpen) Input.requestPointerLock();
  };

  return (
    <div className="app">
      <div className="canvas-host" ref={host} onClick={onCanvasClick} />
      <div className="ui-layer">
        {screen === 'boot' && <LoadingView progress={boot * 100} label="Initialising engine" tip={tip} />}
        {screen === 'menu' && <MainMenu />}
        {screen === 'levels' && <LevelSelect />}
        {screen === 'shop' && <Shop />}
        {screen === 'inventory' && <Inventory />}
        {screen === 'profile' && <Profile />}
        {screen === 'achievements' && <Achievements />}
        {screen === 'settings' && <Settings />}
        {screen === 'speedrun' && <Speedrun />}
        {screen === 'mutations' && <Mutations />}
        {(screen === 'playing' || screen === 'paused') && <HUD />}
        {screen === 'playing' && touch && <TouchControls />}
        {screen === 'paused' && <Pause />}
        {screen === 'victory' && <Victory />}
        {screen === 'dead' && <Death />}
        {screen === 'ending' && <Ending />}
        {screen === 'loading' && <Loading />}
        <Overlays />
      </div>
    </div>
  );
}
