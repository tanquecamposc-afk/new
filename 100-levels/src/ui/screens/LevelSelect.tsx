import { useState } from 'react';
import { TopBar, Btn, Stars } from '../components/Common';
import { useGame } from '../../store/gameStore';
import { useProfile } from '../../store/profileStore';
import { GameManager } from '../../core/GameManager';
import { LEVELS, SECRET_LEVELS, SECRET_UNLOCKS, TOTAL_SECRETS, LevelMeta } from '../../data/levels';
import { WORLDS, worldOf } from '../../data/worlds';
import { formatTime } from '../../core/math';

const GENRE_ICON: Record<string, string> = {
  parkour: '🏃', puzzle: '🧩', combat: '⚔️', racing: '🏎️', horror: '👁️', stealth: '🥷', precision: '🎯', survival: '🌋', bossrush: '👹', chaos: '🌀', final: '👑', secret: '❓',
};

export function LevelSelect() {
  const setScreen = useGame((s) => s.setScreen);
  const d = useProfile((s) => s.data);
  const isUnlocked = useProfile((s) => s.isUnlocked);
  const [world, setWorld] = useState(() => (d.progress.unlocked > 100 ? 10 : worldOf(d.progress.unlocked).id));
  const [sel, setSel] = useState<LevelMeta | null>(null);
  const isSecret = world === 0;
  const w = isSecret ? { id: 0, name: 'SECRET LEVELS', color: '#ffe066', setting: 'Hidden dimensions', subtitle: `Unlocked by finding secret relics (${d.secrets.length}/${TOTAL_SECRETS})` } : WORLDS[world - 1];
  const levels = isSecret ? SECRET_LEVELS : LEVELS.filter((l) => l.world === world);
  const worldStars = (wid: number) => LEVELS.filter((l) => l.world === wid).reduce((a, l) => a + (d.progress.records[l.id]?.stars.filter(Boolean).length ?? 0), 0);

  return (
    <div className="screen dim">
      <TopBar title="LEVEL SELECT" onBack={() => setScreen('menu')} />
      <div className="levels-wrap">
        <div className="world-list scroll">
          {WORLDS.map((wd) => {
            const locked = d.progress.unlocked < wd.first;
            return (
              <div key={wd.id} className={`world-item ${world === wd.id ? 'active' : ''} ${locked ? 'locked' : ''}`} style={{ ['--wc' as string]: wd.color }} onClick={() => { setWorld(wd.id); setSel(null); }}>
                <div className="wname">{wd.icon} {wd.id}. {wd.name}</div>
                <div className="wsub">{locked ? '🔒 Locked' : `⭐ ${worldStars(wd.id)}/30 · ${wd.setting}`}</div>
              </div>
            );
          })}
          <div className={`world-item ${isSecret ? 'active' : ''}`} style={{ ['--wc' as string]: '#ffe066' }} onClick={() => { setWorld(0); setSel(null); }}>
            <div className="wname">❓ SECRETS</div>
            <div className="wsub">🗝 {d.secrets.length}/{TOTAL_SECRETS} relics</div>
          </div>
        </div>
        <div className="panel world-view" style={{ ['--wc' as string]: w.color }}>
          <div className="world-header">
            <div>
              <div className="small muted">{isSecret ? '' : `WORLD ${w.id} · LEVELS ${(w as typeof WORLDS[0]).first}-${(w as typeof WORLDS[0]).last}`}</div>
              <div className="big">{w.name}</div>
              <div className="muted">{w.setting} — {w.subtitle}</div>
            </div>
          </div>
          <div className="level-grid scroll" style={{ flex: 1, alignContent: 'start' }}>
            {levels.map((l, i) => {
              const unlocked = isUnlocked(l.id);
              const rec = d.progress.records[l.id];
              return (
                <div
                  key={l.id}
                  className={`level-card ${unlocked ? '' : 'locked'}`}
                  style={{ ['--wc' as string]: w.color, animationDelay: `${i * 0.03}s` }}
                  onClick={() => unlocked && setSel(l)}
                  onDoubleClick={() => unlocked && GameManager.startLevel(l.id)}
                >
                  <span className="badge">{unlocked ? (l.boss ? '💀' : GENRE_ICON[l.genre]) : '🔒'}</span>
                  <div className="num">{isSecret ? l.id : l.num}</div>
                  <div className="lname">{l.name}</div>
                  <Stars stars={rec?.stars ?? [false, false, false]} />
                  <div className="best">{rec && isFinite(rec.bestTime) ? `⏱ ${formatTime(rec.bestTime)}` : unlocked ? 'Not completed' : isSecret ? `Find ${SECRET_UNLOCKS[i]} relics` : 'Locked'}</div>
                </div>
              );
            })}
          </div>
          {sel && (
            <div className="panel level-detail" style={{ ['--wc' as string]: w.color }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="h3" style={{ color: w.color }}>{sel.boss ? '💀 BOSS · ' : ''}LEVEL {sel.num > 100 ? sel.id : sel.num} — {sel.name}</div>
                <div className="muted">{sel.blurb}</div>
                <div className="star-reqs">
                  <span><span className="star-on">★</span> Complete the level</span>
                  <span><span className="star-on">★</span> Finish under {formatTime(sel.parTime, false)}</span>
                  <span><span className="star-on">★</span> {sel.challengeText}</span>
                </div>
              </div>
              <div className="col" style={{ alignItems: 'flex-end' }}>
                <div className="chip">{GENRE_ICON[sel.genre]} {sel.genre.toUpperCase()}</div>
                <div className="muted small">Best: {formatTime(d.progress.records[sel.id]?.bestTime ?? Infinity)}</div>
                <Btn variant="primary" size="lg" onClick={() => GameManager.startLevel(sel.id)}>▶ Play</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
