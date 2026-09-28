/** Loading screen, main menu, pause menu, settings, achievements, overlays and ending screens. */
import { useEffect, useRef, useState } from 'react';
import { useGame, G } from '../game/core/store';
import { Game } from '../game/Game';
import { Flow } from '../game/systems/Flow';
import { LoopSystem } from '../game/systems/LoopSystem';
import { SaveSystem } from '../game/systems/SaveSystem';
import { Audio } from '../game/audio/AudioEngine';
import { ACHIEVEMENTS, ENDING_BY_ID } from '../game/data/progress';
import { Input } from '../game/core/input';
import { MemoryScreen, Profile } from './MemoryScreen';
import { LOADING_PHRASES } from './constants';
import type { Settings } from '../game/core/types';

export function LoadingScreen() {
  const loading = useGame((s) => s.loading);
  const [i, setI] = useState(0);
  useEffect(() => { const iv = setInterval(() => setI((n) => n + 1), 2200); return () => clearInterval(iv); }, []);
  return (
    <div className="loading">
      <div className="logo">LOOP <span>13</span></div>
      <div className="lbar"><i style={{ width: `${Math.round(loading.progress * 100)}%` }} /></div>
      <div className="lt">{loading.label} {Math.round(loading.progress * 100)}%</div>
      <div className="phrase" key={i}>{LOADING_PHRASES[i % LOADING_PHRASES.length]}</div>
    </div>
  );
}

function MenuParticles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    const ps = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: 0.0002 + Math.random() * 0.0006, r: Math.random() * 1.6 + 0.3, a: Math.random() }));
    const loop = () => {
      c.width = innerWidth; c.height = innerHeight;
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of ps) {
        p.y -= p.v; p.x += Math.sin(p.y * 20 + p.a * 6) * 0.0003;
        if (p.y < 0) { p.y = 1; p.x = Math.random(); }
        ctx.fillStyle = `rgba(210,225,240,${0.15 + 0.35 * Math.abs(Math.sin(p.a + p.y * 8))})`;
        ctx.beginPath(); ctx.arc(p.x * c.width, p.y * c.height, p.r, 0, 7); ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="particles" />;
}

export function MainMenu() {
  const screen = useGame((s) => s.menuScreen);
  const hasSave = useGame((s) => s.hasSave && s.run.started);
  const profile = useGame((s) => s.profile);
  const run = useGame((s) => s.run);
  const [glitch, setGlitch] = useState(false);
  const setScreen = (m: typeof screen) => { Audio.init(); Audio.resume(); Audio.sfx('ui'); useGame.setState({ menuScreen: m }); };
  useEffect(() => {
    const iv = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 260); }, 4200);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    // start ambience on first interaction with the menu
    const f = () => { Audio.init(); Audio.resume(); Audio.setZone('MENU', true); Audio.setMood('MYSTERY'); };
    window.addEventListener('pointerdown', f, { once: true });
    window.addEventListener('keydown', f, { once: true });
    return () => { window.removeEventListener('pointerdown', f); window.removeEventListener('keydown', f); };
  }, []);
  const start = () => { if (hasSave) setScreen('confirm-new'); else { useGame.setState({ menuScreen: 'main' }); Game.newGame(); } };
  if (screen === 'memory') return <MemoryScreen inGame={false} onClose={() => setScreen('main')} />;
  if (screen === 'achievements') return <AchievementsScreen onClose={() => setScreen('main')} />;
  if (screen === 'settings') return <SettingsScreen onClose={() => setScreen('main')} />;
  return (
    <>
      <MenuParticles />
      <div className="menu">
        <div className={`logo ${glitch ? 'glitch' : ''}`}>LOOP <span>13</span></div>
        <div className="tag">ORPHEUS · 12:47 → 13:00</div>
        {screen === 'confirm-new' || screen === 'confirm-ngp' ? (
          <nav>
            <div style={{ fontSize: 18, marginBottom: 12, lineHeight: 1.4 }}>
              {screen === 'confirm-new' ? 'Start a new run? Your current memories will be lost. Achievements, endings and lifetime stats are kept.' : 'Begin New Game+? The loop re-forms. Your memories of this run fade — the facility remembers you.'}
            </div>
            <button className="btn" onClick={() => { useGame.setState({ menuScreen: 'main' }); Game.newGame(screen === 'confirm-ngp'); }}>CONFIRM</button>
            <button className="btn" onClick={() => setScreen('main')}>CANCEL</button>
          </nav>
        ) : (
          <nav>
            <button className="btn" onClick={start}>START</button>
            {hasSave && <button className="btn" onClick={() => { Audio.sfx('ui'); Game.continueGame(); }}>CONTINUE</button>}
            {hasSave && <div className="sub2">LOOP {String(run.loop).padStart(2, '0')}{run.ngPlus ? ` · NG+${run.ngPlus}` : ''} · {run.clues.length} CLUES</div>}
            <button className="btn" onClick={() => setScreen('memory')}>MEMORY</button>
            <button className="btn" onClick={() => setScreen('achievements')}>ACHIEVEMENTS</button>
            <button className="btn" onClick={() => setScreen('settings')}>SETTINGS</button>
            <button className="btn" disabled={!profile.ngPlusUnlocked} title={profile.ngPlusUnlocked ? '' : 'Reach the True Ending to unlock'} onClick={() => setScreen('confirm-ngp')}>
              {profile.ngPlusUnlocked ? 'NEW GAME+' : '🔒 NEW GAME+'}
            </button>
            {!profile.ngPlusUnlocked && <div className="sub2">UNLOCKED BY BREAKING THE LOOP</div>}
          </nav>
        )}
        <div className="ver">ORPHEUS BUILD 13.0 · HEADPHONES RECOMMENDED</div>
      </div>
    </>
  );
}

export function AchievementsScreen({ onClose }: { onClose: () => void }) {
  const got = useGame((s) => s.profile.achievements);
  return (
    <div className="screen">
      <header><h1>ACHIEVEMENTS</h1><div style={{ fontFamily: 'var(--mono)', color: 'var(--dim)' }}>{got.length}/{ACHIEVEMENTS.length}</div><button className="btn" onClick={onClose}>BACK</button></header>
      <main>
        <div className="grid2">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.id} className={`card ${got.includes(a.id) ? '' : 'locked'}`}>
              <div className="n" style={{ color: got.includes(a.id) ? 'var(--gold)' : undefined }}>{got.includes(a.id) ? '★ UNLOCKED' : 'LOCKED'}</div>
              <div className="h">{a.title}</div>
              <div className="d">{a.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 30 }}><Profile /></div>
      </main>
    </div>
  );
}

function Slider({ label, k, min = 0, max = 1, step = 0.05, fmt }: { label: string; k: keyof Settings; min?: number; max?: number; step?: number; fmt?: (v: number) => string }) {
  const v = useGame((s) => s.settings[k]) as number;
  return (
    <div className="setting">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => G().setSettings({ [k]: Number(e.target.value) } as Partial<Settings>)} />
      <span className="v">{fmt ? fmt(v) : Math.round(v * 100)}</span>
    </div>
  );
}
function Seg<T extends string>({ label, k, opts }: { label: string; k: keyof Settings; opts: T[] }) {
  const v = useGame((s) => s.settings[k]) as unknown as T;
  return (
    <div className="setting"><span>{label}</span>
      <div className="seg">{opts.map((o) => <button key={o} className={`btn ${o === v ? 'sel' : ''}`} onClick={() => { Audio.sfx('ui'); G().setSettings({ [k]: o } as Partial<Settings>); }}>{o.toUpperCase()}</button>)}</div>
      <span />
    </div>
  );
}
function Toggle({ label, k }: { label: string; k: keyof Settings }) {
  const v = useGame((s) => s.settings[k]) as boolean;
  return (
    <div className="setting"><span>{label}</span>
      <div className="seg"><button className={`btn ${v ? 'sel' : ''}`} onClick={() => G().setSettings({ [k]: true } as Partial<Settings>)}>ON</button><button className={`btn ${!v ? 'sel' : ''}`} onClick={() => G().setSettings({ [k]: false } as Partial<Settings>)}>OFF</button></div>
      <span />
    </div>
  );
}

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  useEffect(() => () => SaveSystem.save(), []);
  return (
    <div className="screen">
      <header><h1>SETTINGS</h1><button className="btn" onClick={onClose}>BACK</button></header>
      <main style={{ maxWidth: 820 }}>
        <Slider label="MASTER VOLUME" k="master" />
        <Slider label="MUSIC VOLUME" k="music" />
        <Slider label="SFX VOLUME" k="sfx" />
        <Seg label="GRAPHICS QUALITY" k="graphics" opts={['low', 'medium', 'high']} />
        <Seg label="SHADOW QUALITY" k="shadows" opts={['off', 'low', 'high']} />
        <Seg label="PARTICLE QUALITY" k="particles" opts={['low', 'medium', 'high']} />
        <Toggle label="POST PROCESSING" k="postprocessing" />
        <Slider label="CAMERA SENSITIVITY" k="cameraSensitivity" min={0.3} max={2.5} step={0.05} fmt={(v) => v.toFixed(2)} />
        <Slider label="MOUSE SENSITIVITY" k="mouseSensitivity" min={0.3} max={2.5} step={0.05} fmt={(v) => v.toFixed(2)} />
        <Slider label="FIELD OF VIEW" k="fov" min={50} max={85} step={1} fmt={(v) => `${v}°`} />
        <Toggle label="INVERT Y" k="invertY" />
        <Toggle label="SUBTITLES" k="subtitles" />
        <Toggle label="A-13 VOICE (SPEECH)" k="aiVoice" />
        <div style={{ marginTop: 26, color: 'var(--dim)', fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.9, letterSpacing: '.08em' }}>
          CONTROLS — WASD move · SHIFT run (hold to sprint) · SPACE jump · CTRL or C crouch · E interact (hold for machines) · F flashlight · TAB memory/inventory · ESC pause · MOUSE look · WHEEL zoom
        </div>
      </main>
    </div>
  );
}

export function PauseMenu() {
  const [sub, setSub] = useState<'main' | 'settings' | 'memory' | 'quit'>('main');
  useEffect(() => Input.onKey((c) => { if (c === 'Escape' && sub === 'main') Flow.unpause(); }), [sub]);
  if (sub === 'settings') return <SettingsScreen onClose={() => setSub('main')} />;
  if (sub === 'memory') return <MemoryScreen inGame onClose={() => setSub('main')} />;
  return (
    <div className="menu" style={{ background: 'rgba(0,0,0,.72)' }}>
      <div className="logo" style={{ fontSize: 'clamp(40px,6vw,72px)' }}>PAUSED</div>
      <div className="tag">TIME DOES NOT STOP. IT WAITS.</div>
      {sub === 'quit' ? (
        <nav>
          <div style={{ fontSize: 17, marginBottom: 10 }}>Return to the menu? Knowledge is saved. The current loop will restart at 12:47.</div>
          <button className="btn" onClick={() => LoopSystem.quitToMenu()}>QUIT TO MENU</button>
          <button className="btn" onClick={() => setSub('main')}>CANCEL</button>
        </nav>
      ) : (
        <nav>
          <button className="btn" onClick={() => Flow.unpause()}>RESUME</button>
          <button className="btn" onClick={() => setSub('memory')}>MEMORY</button>
          <button className="btn" onClick={() => setSub('settings')}>SETTINGS</button>
          <button className="btn" onClick={() => setSub('quit')}>QUIT TO MENU</button>
        </nav>
      )}
    </div>
  );
}

export function Overlay() {
  const o = useGame((s) => s.overlay);
  const phase = useGame((s) => s.phase);
  const loopIntro = useGame((s) => s.run.loop);
  return (
    <>
      <div className="fade" style={{ opacity: o.black }} />
      <div className="flash" style={{ opacity: o.flash }} />
      {o.letterbox && <div className="letterbox" />}
      {o.glitch > 0.1 && <div className="scanlines" style={{ opacity: o.glitch }} />}
      {o.title && (
        <div className="bigtitle">
          <h1 className={o.title === 'YOU DIED' ? 'died' : ''}>{o.title}</h1>
          {o.subtitle && <h2>{o.subtitle}</h2>}
        </div>
      )}
      {phase === 'CUTSCENE' && loopIntro > 1 && <div className="skip">[SPACE] SKIP</div>}
    </>
  );
}

export function EndingScreen() {
  const id = useGame((s) => s.ending);
  const [shown, setShown] = useState(0);
  const [stats, setStats] = useState(false);
  const e = id ? ENDING_BY_ID[id] : null;
  useEffect(() => {
    if (!e) return;
    setShown(0); setStats(false);
    const iv = setInterval(() => setShown((n) => { if (n >= e.lines.length) { clearInterval(iv); setTimeout(() => setStats(true), 1500); return n; } return n + 1; }), 3200);
    return () => clearInterval(iv);
  }, [e]);
  if (!e) return null;
  return (
    <div className={`ending ${e.id === 'TRUE' ? 'true' : ''}`}>
      <div className="en">ENDING {e.n} / 4</div>
      <h1>{e.title}</h1>
      <div className="s">{e.subtitle}</div>
      <div style={{ marginTop: 30 }}>{e.lines.slice(0, shown).map((l, i) => <p key={i}>{l}</p>)}</div>
      {stats && (
        <div style={{ marginTop: 24, animation: 'fadein 1s forwards' }}>
          {e.id === 'TRUE' && <div style={{ fontFamily: 'var(--mono)', color: 'var(--gold)', letterSpacing: '.3em', marginBottom: 14 }}>NEW GAME+ UNLOCKED</div>}
          <button className="btn" onClick={() => LoopSystem.quitToMenu()}>RETURN TO MENU</button>
        </div>
      )}
      {!stats && <button className="btn" style={{ position: 'fixed', bottom: 24, right: 24, fontSize: 12 }} onClick={() => { setShown(e.lines.length); setStats(true); }}>SKIP</button>}
    </div>
  );
}
