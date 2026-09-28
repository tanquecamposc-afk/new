/** Minimal HUD: the clock (the most important element), interaction prompt, warnings, notifications, subtitles. */
import { useEffect, useState } from 'react';
import { useGame } from '../game/core/store';
import { isPlayPhase } from '../game/systems/Flow';
import { requestPointerLock } from '../game/core/input';
import { NOTIFY_SECONDS } from './constants';

export function Hud() {
  const hud = useGame((s) => s.hud);
  const phase = useGame((s) => s.phase);
  const loop = useGame((s) => s.run.loop);
  const knowsTruth = useGame((s) => s.run.clues.includes('NOT_FIRST_LOOP'));
  const [locked, setLocked] = useState(true);
  const [now, setNow] = useState(performance.now());
  useEffect(() => {
    const f = () => setLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', f);
    const iv = setInterval(() => setNow(performance.now()), 250);
    return () => { document.removeEventListener('pointerlockchange', f); clearInterval(iv); };
  }, []);
  const play = isPlayPhase(phase);
  const [hh, mm] = hud.clock.split(':').map(Number);
  const late = hh === 12 && mm >= 57;
  const loopLabel = knowsTruth && Math.floor(now / 1500) % 4 === 0 ? `LOOP ${4210 + loop}` : `LOOP ${String(loop).padStart(2, '0')}`;
  if (!play && phase !== 'DIALOGUE' && phase !== 'PUZZLE' && phase !== 'CUTSCENE') return null;
  return (
    <div className="passive">
      {phase !== 'CUTSCENE' && (
        <div className={`hud-clock ${late ? 'late' : ''} ${hud.timeFrozen ? 'frozen' : ''}`}>
          <div className="time">{hud.clock}<small>:{hud.seconds}</small></div>
          <div className="loop">{hud.fastForward ? '▶▶ WAITING' : loopLabel}</div>
        </div>
      )}
      {play && <div className="hud-area">{hud.area}</div>}
      {play && hud.prompt && (
        <div className={`hud-prompt ${hud.promptDisabled ? 'disabled' : ''}`}>
          <span className="key">E{hud.hold > 0 && (
            <svg className="hold-ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="none" stroke="#9fd6ff" strokeWidth="2.5" strokeDasharray={`${hud.hold * 100.5} 100.5`} transform="rotate(-90 18 18)" /></svg>
          )}</span>
          <span>— {hud.prompt}</span>
        </div>
      )}
      {play && hud.anomalyUntil > now && <div className="hud-warn">⚠ ANOMALY DETECTED</div>}
      {play && hud.danger && <div className="hud-warn" style={{ top: 140 }}>⚠ {hud.danger}</div>}
      {play && (
        <div className="hud-bars">
          {hud.hasFlashlight && <div>FLASHLIGHT {hud.flashlight ? 'ON' : 'OFF'}<div className="bar"><i style={{ width: `${hud.battery}%`, background: hud.battery < 20 ? 'var(--warn)' : undefined }} /></div></div>}
          {hud.stamina < 0.99 && <div>STAMINA<div className="bar"><i style={{ width: `${hud.stamina * 100}%` }} /></div></div>}
          {hud.health < 100 && <div>VITALS<div className="bar"><i style={{ width: `${hud.health}%`, background: 'var(--warn)' }} /></div></div>}
        </div>
      )}
      {play && hud.health < 60 && <div className="vign-hurt" style={{ opacity: (60 - hud.health) / 60 }} />}
      {play && !locked && <div className="hud-hint" style={{ pointerEvents: 'auto' }} onClick={() => requestPointerLock()}>CLICK TO CONTROL THE CAMERA</div>}
      {play && locked && <div className="crosshair" />}
    </div>
  );
}

export function Notifications() {
  const notes = useGame((s) => s.notifications);
  const dismiss = useGame((s) => s.dismissNotification);
  const phase = useGame((s) => s.phase);
  useEffect(() => {
    if (!notes.length) return;
    const oldest = notes[0];
    const t = setTimeout(() => dismiss(oldest.id), Math.max(200, NOTIFY_SECONDS * 1000 - (performance.now() - oldest.time)));
    return () => clearTimeout(t);
  }, [notes, dismiss]);
  if (phase === 'MENU' || phase === 'LOADING' || phase === 'ENDING') return null;
  return (
    <div className="notes passive">
      {notes.map((n) => (
        <div key={n.id} className={`note ${n.kind}`}><div className="t">{n.title}</div><div className="x">{n.text}</div></div>
      ))}
    </div>
  );
}

export function Subtitles() {
  const subs = useGame((s) => s.subtitles);
  const on = useGame((s) => s.settings.subtitles);
  const [, tick] = useState(0);
  useEffect(() => { const iv = setInterval(() => tick((n) => n + 1), 300); return () => clearInterval(iv); }, []);
  if (!on) return null;
  const now = performance.now();
  return (
    <div className="subs passive">
      {subs.filter((s) => s.until > now).map((s) => (
        <div key={s.id} className={`sub ${s.speaker === 'A-13' ? 'A13' : s.speaker === 'THE OBSERVER' ? 'OBS' : ''}`}><b>{s.speaker}</b>{s.text}</div>
      ))}
    </div>
  );
}
