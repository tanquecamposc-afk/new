import { useEffect, useState } from 'react';
import { Btn, useAnimatedNumber } from '../components/Common';
import { useGame } from '../../store/gameStore';
import { useProfile } from '../../store/profileStore';
import { GameManager } from '../../core/GameManager';
import { getLevel, nextLevelId } from '../../data/levels';
import { formatTime } from '../../core/math';
import { Audio } from '../../audio/AudioManager';

export function Pause() {
  const g = useGame();
  const meta = g.currentLevel ? getLevel(g.currentLevel) : null;
  return (
    <div className="screen dim">
      <div className="panel modal">
        <div className="title-xl">PAUSED</div>
        {meta && <div className="muted">LEVEL {meta.num > 100 ? meta.id : meta.num} — {meta.name}</div>}
        {meta && <div className="small muted" style={{ marginTop: 6 }}>★ Under {formatTime(meta.parTime, false)} · ★ {meta.challengeText}</div>}
        <div className="modal-buttons">
          <Btn variant="primary" onClick={() => GameManager.resume()}>▶ Resume</Btn>
          <Btn onClick={() => GameManager.restart()}>↻ Restart</Btn>
          <Btn onClick={() => { g.set({ settingsReturn: 'paused' }); g.setScreen('settings'); }}>⚙ Settings</Btn>
          <Btn onClick={() => GameManager.toMenu('levels')}>🗺 Level select</Btn>
          <Btn variant="danger" onClick={() => GameManager.toMenu()}>⌂ Main menu</Btn>
        </div>
      </div>
    </div>
  );
}

export function Victory() {
  const s = useGame((st) => st.summary);
  const sr = useGame((st) => st.speedrun);
  const [shown, setShown] = useState(0);
  const xp = useAnimatedNumber(shown >= 3 ? s?.xp ?? 0 : 0, 4);
  const coins = useAnimatedNumber(shown >= 3 ? s?.coins ?? 0 : 0, 4);
  useEffect(() => {
    if (!s) return;
    const timers = [0, 1, 2, 3].map((i) =>
      setTimeout(() => {
        setShown(i + 1);
        if (i < 3 && s.stars[i]) Audio.play('coin', { pitch: 1 + i * 0.25 });
        if (i === 3 && s.levelUps > 0) Audio.play('levelup');
      }, 350 + i * 380),
    );
    return () => timers.forEach(clearTimeout);
  }, [s]);
  if (!s) return null;
  const next = nextLevelId(s.levelId);
  const speed = s.speedrun;
  return (
    <div className="screen dim">
      <div className="panel modal" style={{ maxWidth: 640 }}>
        <div className="title-xl gold-text">LEVEL COMPLETE</div>
        <div className="muted">{s.levelName}</div>
        <div className="stars-big">
          {[0, 1, 2].map((i) => (
            <span key={i} className={shown > i && s.stars[i] ? 'star-on' : 'star-off'} style={{ animationDelay: `${0.35 + i * 0.38}s` }}>★</span>
          ))}
        </div>
        {s.extra.map((e) => <div key={e} className="chip" style={{ margin: 3, color: 'var(--gold)' }}>{e}</div>)}
        <div className="result-grid">
          <div className="result-cell"><div className="k">TIME</div><div className="v">{formatTime(s.time)}</div></div>
          <div className="result-cell"><div className="k">BEST TIME</div><div className="v">{formatTime(s.bestTime)}{s.newBest ? ' 🏅' : ''}</div></div>
          <div className="result-cell"><div className="k">XP EARNED</div><div className="v" style={{ color: '#7ab0ff' }}>+{Math.round(xp)}</div></div>
          <div className="result-cell"><div className="k">COINS EARNED</div><div className="v" style={{ color: 'var(--gold)' }}>+{Math.round(coins)}</div></div>
        </div>
        {speed && (
          <div className="result-grid">
            <div className="result-cell"><div className="k">SPLIT</div><div className="v">{formatTime(speed.split)}</div></div>
            <div className="result-cell"><div className="k">RUN TOTAL</div><div className="v">{formatTime(speed.total)}</div></div>
            <div className="result-cell"><div className="k">BEST RUN</div><div className="v">{isFinite(speed.best) ? formatTime(speed.best) : '--'}{speed.newRecord ? ' 🏆' : ''}</div></div>
          </div>
        )}
        {s.rewards.length > 0 && (
          <>
            <div className="h3" style={{ marginTop: 14 }}>REWARDS</div>
            <div className="rewards">{s.rewards.map((r) => <span key={r} className="chip">{r}</span>)}</div>
          </>
        )}
        <div className="modal-buttons row">
          {sr?.active ? (
            speed?.finished ? <Btn variant="primary" onClick={() => GameManager.toMenu('speedrun')}>🏁 Finish run</Btn> : <Btn variant="primary" onClick={() => GameManager.speedrunNext()}>▶ Next level</Btn>
          ) : (
            next && <Btn variant="primary" onClick={() => GameManager.nextLevel()}>▶ Next level</Btn>
          )}
          <Btn onClick={() => GameManager.restart()}>↻ Replay</Btn>
          <Btn onClick={() => GameManager.toMenu('levels')}>🗺 Level select</Btn>
        </div>
      </div>
    </div>
  );
}

export function Death() {
  const d = useGame((s) => s.death);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyR' || e.code === 'Enter') GameManager.restart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!d) return null;
  return (
    <div className="screen died-bg">
      <div className="panel modal died">
        <div className="title-xl">YOU DIED</div>
        <div className="muted">{d.reason}</div>
        <div className="result-grid" style={{ marginTop: 16 }}>
          <div className="result-cell"><div className="k">LEVEL</div><div className="v" style={{ fontSize: 16 }}>{d.levelName}</div></div>
          <div className="result-cell"><div className="k">TIME</div><div className="v">{formatTime(d.time)}</div></div>
          <div className="result-cell"><div className="k">COINS</div><div className="v">{d.coins}</div></div>
        </div>
        <div className="modal-buttons">
          <Btn variant="primary" size="lg" onClick={() => GameManager.restart()}>↻ Retry (R)</Btn>
          <Btn onClick={() => GameManager.toMenu('levels')}>🗺 Level select</Btn>
          <Btn onClick={() => GameManager.toMenu()}>⌂ Menu</Btn>
        </div>
      </div>
    </div>
  );
}

export function Ending() {
  const s = useGame((st) => st.summary);
  const stars = useProfile((st) => st.totalStars());
  const [stage, setStage] = useState(0);
  useEffect(() => {
    Audio.playMusic('ending');
    const t1 = setTimeout(() => setStage(1), 1800);
    const t2 = setTimeout(() => setStage(2), 4200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  return (
    <div className="screen ending">
      <div className="title-xl gold-text">YOU COMPLETED<br />100 LEVELS</div>
      {stage >= 1 && (
        <div className="reveal col" style={{ alignItems: 'center' }}>
          <div className="h2">THE 100TH HAS FALLEN</div>
          <div className="muted">Time: {s ? formatTime(s.time) : '--'} · Total stars: {stars} · +{s?.xp ?? 0} XP · +{s?.coins ?? 0} coins</div>
          <div className="rewards">
            {(s?.rewards ?? []).map((r) => <span key={r} className="chip">{r}</span>)}
            {(s?.extra ?? []).map((r) => <span key={r} className="chip" style={{ color: 'var(--gold)' }}>🔓 {r}</span>)}
          </div>
        </div>
      )}
      {stage >= 2 && (
        <>
          <div className="credits">
            <div className="roll">
              <div className="h3">100 LEVELS</div>
              <div>Design · Code · Worlds</div><div>Built with React, TypeScript & Three.js</div>
              <div>Procedural audio · Procedural textures</div><div>&nbsp;</div>
              <div>World 1 — Parkour</div><div>World 2 — Puzzle</div><div>World 3 — Combat</div><div>World 4 — Racing</div>
              <div>World 5 — Horror</div><div>World 6 — Stealth</div><div>World 7 — Precision</div><div>World 8 — Survival</div>
              <div>World 9 — Boss Rush</div><div>World 10 — Chaos</div><div>&nbsp;</div>
              <div>Nightmare difficulty, Level Mutations and Speedrun Mode are now unlocked.</div>
              <div>Thank you for playing.</div>
            </div>
          </div>
          <div className="row">
            <Btn variant="primary" onClick={() => useGame.getState().setScreen('victory')}>View results</Btn>
            <Btn onClick={() => GameManager.toMenu()}>⌂ Main menu</Btn>
          </div>
        </>
      )}
    </div>
  );
}
