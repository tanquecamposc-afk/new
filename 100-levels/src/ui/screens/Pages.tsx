import { useState } from 'react';
import { TopBar, Btn, Bar, Seg } from '../components/Common';
import { useGame } from '../../store/gameStore';
import { useProfile, xpForLevel } from '../../store/profileStore';
import { ACHIEVEMENTS } from '../../data/achievements';
import { LEVELS, TOTAL_SECRETS } from '../../data/levels';
import { WORLDS } from '../../data/worlds';
import { DIFFICULTIES, Difficulty, MUTATIONS, Mutation } from '../../data/modes';
import { GameManager } from '../../core/GameManager';
import { SaveSystem } from '../../save/SaveSystem';
import { formatTime } from '../../core/math';
import { Audio } from '../../audio/AudioManager';

// ─── Profile ────────────────────────────────────────────────────────────────
export function Profile() {
  const setScreen = useGame((s) => s.setScreen);
  const d = useProfile((s) => s.data);
  const setName = useProfile((s) => s.setName);
  const totalStars = useProfile((s) => s.totalStars());
  const [name, setN] = useState(d.profile.name);
  const need = xpForLevel(d.profile.level);
  const completed = Object.values(d.progress.records).filter((r) => r.completions > 0).length;
  const stats: [string, string | number][] = [
    ['LEVELS CLEARED', `${completed}/100`],
    ['STARS', `${totalStars}/${LEVELS.length * 3}`],
    ['SECRETS', `${d.secrets.length}/${TOTAL_SECRETS}`],
    ['ENEMIES DEFEATED', d.stats.kills],
    ['BOSSES DEFEATED', d.stats.bossesDefeated.length],
    ['DEATHS', d.stats.deaths],
    ['COINS EARNED', d.stats.coinsEarned.toLocaleString()],
    ['RACES WON', d.stats.racesWon],
    ['FLAWLESS CLEARS', d.stats.noDamageClears],
    ['CHESTS OPENED', d.stats.chestsOpened],
    ['ACHIEVEMENTS', `${Object.keys(d.achievements).length}/${ACHIEVEMENTS.length}`],
    ['ITEMS OWNED', d.inventory.owned.length],
  ];
  return (
    <div className="screen dim">
      <TopBar title="PROFILE" onBack={() => setScreen('menu')} />
      <div className="page scroll">
        <div className="panel col" style={{ flex: 1, gap: 18 }}>
          <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
            <div className="avatar" style={{ width: 80, height: 80, fontSize: 34 }}>{d.profile.level}</div>
            <div className="col" style={{ gap: 6, flex: 1, minWidth: 240 }}>
              <div className="row">
                <input value={name} maxLength={16} onChange={(e) => setN(e.target.value)} onBlur={() => setName(name)} onKeyDown={(e) => e.key === 'Enter' && setName(name)}
                  style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--line-2)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 20, fontFamily: 'var(--font-display)', width: 260 }} />
              </div>
              <div className="muted">LEVEL {d.profile.level} — {Math.floor(d.profile.xp)} / {need} XP to level {d.profile.level + 1}</div>
              <Bar value={d.profile.xp} max={need} className="xp-bar" />
            </div>
            <div className="coins-pill">💰 {d.profile.coins.toLocaleString()}</div>
          </div>
          <div className="stat-grid">
            {stats.map(([k, v]) => (
              <div key={k} className="result-cell"><div className="k">{k}</div><div className="v">{v}</div></div>
            ))}
          </div>
          <div className="h3">WORLD PROGRESS</div>
          <div className="stat-grid">
            {WORLDS.map((w) => {
              const lv = LEVELS.filter((l) => l.world === w.id);
              const done = lv.filter((l) => (d.progress.records[l.id]?.completions ?? 0) > 0).length;
              const st = lv.reduce((a, l) => a + (d.progress.records[l.id]?.stars.filter(Boolean).length ?? 0), 0);
              return (
                <div key={w.id} className="result-cell" style={{ borderColor: w.color + '55' }}>
                  <div className="k" style={{ color: w.color }}>{w.icon} {w.name}</div>
                  <div className="small">{done}/10 · ⭐ {st}/30</div>
                  <Bar value={done} max={10} color={w.color} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Achievements ───────────────────────────────────────────────────────────
export function Achievements() {
  const setScreen = useGame((s) => s.setScreen);
  const ach = useProfile((s) => s.data.achievements);
  const n = Object.keys(ach).length;
  return (
    <div className="screen dim">
      <TopBar title={`ACHIEVEMENTS ${n}/${ACHIEVEMENTS.length}`} onBack={() => setScreen('menu')} />
      <div className="page">
        <div className="panel scroll" style={{ flex: 1 }}>
          <Bar value={n} max={ACHIEVEMENTS.length} className="xp-bar" />
          <div className="ach-grid" style={{ marginTop: 16 }}>
            {ACHIEVEMENTS.map((a) => {
              const done = !!ach[a.id];
              const hidden = a.hidden && !done;
              return (
                <div key={a.id} className={`ach ${done ? 'done' : ''}`}>
                  <div className="ai">{hidden ? '❓' : a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div className="an">{hidden ? '???' : a.name}</div>
                    <div className="small muted">{hidden ? 'Hidden achievement' : a.desc}</div>
                    <div className="small" style={{ color: done ? 'var(--gold)' : 'var(--muted)' }}>
                      {done ? `✔ Unlocked ${new Date(ach[a.id]).toLocaleDateString()}` : `+${a.xp} XP${a.coins ? ` · +${a.coins} 💰` : ''}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings ───────────────────────────────────────────────────────────────
export function Settings() {
  const g = useGame();
  const st = useProfile((s) => s.data.settings);
  const done = useProfile((s) => s.data.progress.gameCompleted);
  const set = useProfile((s) => s.setSettings);
  const [importCode, setImport] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const update = (p: Parameters<typeof set>[0]) => {
    set(p);
    setTimeout(() => GameManager.applySettings(), 0);
  };
  const back = () => g.setScreen(g.settingsReturn);
  const inGame = g.settingsReturn === 'paused';
  return (
    <div className="screen dim">
      <TopBar title="SETTINGS" onBack={back} />
      <div className="page scroll">
        <div className="panel" style={{ flex: 1, maxWidth: 820, margin: '0 auto', width: '100%' }}>
          <div className="h3" style={{ marginBottom: 6 }}>🔊 AUDIO</div>
          {(['master', 'music', 'sfx'] as const).map((k) => (
            <div key={k} className="setting-row">
              <label>{{ master: 'MASTER VOLUME', music: 'MUSIC VOLUME', sfx: 'SFX VOLUME' }[k]}</label>
              <input type="range" min={0} max={1} step={0.05} value={st[k]} onChange={(e) => update({ [k]: Number(e.target.value) })} onMouseUp={() => Audio.play('coin')} />
              <span style={{ width: 44, textAlign: 'right' }}>{Math.round(st[k] * 100)}%</span>
            </div>
          ))}
          <div className="h3" style={{ margin: '18px 0 6px' }}>🎮 CONTROLS</div>
          <div className="setting-row">
            <label>MOUSE SENSITIVITY</label>
            <input type="range" min={0.2} max={3} step={0.05} value={st.sensitivity} onChange={(e) => update({ sensitivity: Number(e.target.value) })} />
            <span style={{ width: 44, textAlign: 'right' }}>{st.sensitivity.toFixed(2)}</span>
          </div>
          <div className="setting-row">
            <label>INVERT Y</label>
            <Seg value={st.invertY ? 'y' : 'n'} options={[{ v: 'n', label: 'OFF' }, { v: 'y', label: 'ON' }]} onChange={(v) => update({ invertY: v === 'y' })} />
          </div>
          <div className="setting-row">
            <label>TOUCH CONTROLS</label>
            <Seg value={st.touchControls ? 'y' : 'n'} options={[{ v: 'n', label: 'OFF' }, { v: 'y', label: 'ON' }]} onChange={(v) => update({ touchControls: v === 'y' })} />
          </div>
          <div className="h3" style={{ margin: '18px 0 6px' }}>🖥 GRAPHICS</div>
          <div className="setting-row">
            <label>QUALITY</label>
            <Seg value={st.quality} options={[{ v: 'low', label: 'LOW' }, { v: 'medium', label: 'MEDIUM' }, { v: 'high', label: 'HIGH' }]} onChange={(v) => update({ quality: v })} />
          </div>
          <div className="setting-row">
            <label>SCREEN SHAKE</label>
            <input type="range" min={0} max={1} step={0.05} value={st.shake} onChange={(e) => update({ shake: Number(e.target.value) })} />
            <span style={{ width: 44, textAlign: 'right' }}>{Math.round(st.shake * 100)}%</span>
          </div>
          <div className="setting-row">
            <label>SHOW FPS</label>
            <Seg value={st.showFps ? 'y' : 'n'} options={[{ v: 'n', label: 'OFF' }, { v: 'y', label: 'ON' }]} onChange={(v) => update({ showFps: v === 'y' })} />
          </div>
          <div className="h3" style={{ margin: '18px 0 6px' }}>💀 DIFFICULTY {inGame && <span className="small muted">(applies on restart)</span>}</div>
          <div className="setting-row" style={{ flexWrap: 'wrap' }}>
            <Seg
              value={st.difficulty}
              options={(Object.keys(DIFFICULTIES) as Difficulty[]).map((k) => ({ v: k, label: DIFFICULTIES[k].name, disabled: k === 'nightmare' && !done }))}
              onChange={(v) => update({ difficulty: v })}
            />
            <span className="small muted" style={{ flex: 1, minWidth: 200 }}>{DIFFICULTIES[st.difficulty].desc} Rewards ×{DIFFICULTIES[st.difficulty].reward}{!done ? ' · NIGHTMARE unlocks after level 100.' : ''}</span>
          </div>
          {!inGame && (
            <>
              <div className="h3" style={{ margin: '18px 0 6px' }}>💾 SAVE DATA</div>
              <div className="setting-row" style={{ flexWrap: 'wrap' }}>
                <Btn size="sm" onClick={() => {
                  const code = SaveSystem.export(useProfile.getState().data);
                  navigator.clipboard?.writeText(code).catch(() => {});
                  setImport(code);
                  g.notify({ icon: '💾', title: 'EXPORTED', text: 'Save code copied to clipboard' });
                }}>Export</Btn>
                <input value={importCode} onChange={(e) => setImport(e.target.value)} placeholder="Paste save code..." style={{ flex: 1, minWidth: 160, background: 'rgba(255,255,255,.06)', border: '1px solid var(--line-2)', borderRadius: 8, padding: '8px 10px', color: '#fff' }} />
                <Btn size="sm" onClick={() => {
                  const data = SaveSystem.import(importCode);
                  if (data) {
                    useProfile.getState().replaceData(data);
                    g.notify({ icon: '✅', title: 'IMPORTED', text: 'Save loaded' });
                  } else g.notify({ icon: '⛔', title: 'INVALID CODE', text: 'That save code is not valid', color: '#ff4d5e' });
                }}>Import</Btn>
                {!confirmReset ? (
                  <Btn size="sm" variant="danger" onClick={() => setConfirmReset(true)}>Reset progress</Btn>
                ) : (
                  <Btn size="sm" variant="danger" onClick={() => { useProfile.getState().resetAll(); setConfirmReset(false); g.notify({ icon: '🗑', title: 'RESET', text: 'All progress deleted' }); }}>Confirm reset?</Btn>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Speedrun ───────────────────────────────────────────────────────────────
export function Speedrun() {
  const setScreen = useGame((s) => s.setScreen);
  const sr = useGame((s) => s.speedrun);
  const d = useProfile((s) => s.data);
  const done = d.progress.gameCompleted;
  const runs = [{ id: 'full', name: 'FULL GAME — 100 LEVELS', color: '#ffc94d' }, ...WORLDS.map((w) => ({ id: 'world' + w.id, name: `WORLD ${w.id} — ${w.name}`, color: w.color }))];
  return (
    <div className="screen dim">
      <TopBar title="⏱ SPEEDRUN MODE" onBack={() => setScreen('menu')} />
      <div className="page scroll">
        <div className="panel" style={{ flex: 1 }}>
          {!done && <div className="h3" style={{ color: 'var(--red)' }}>🔒 Complete level 100 to unlock Speedrun Mode.</div>}
          {sr && sr.splits.length > 0 && (
            <div className="panel" style={{ padding: 14, marginBottom: 14 }}>
              <div className="h3">LAST RUN — {sr.runId.toUpperCase()}</div>
              <div className="muted">Total: {formatTime(sr.total)} · {sr.splits.length}/{sr.ids.length} levels</div>
            </div>
          )}
          <div className="ach-grid">
            {runs.map((r) => {
              const best = d.speedrun.best[r.id];
              const splits = d.speedrun.bestSplits[r.id];
              return (
                <div key={r.id} className="ach" style={{ borderColor: r.color + '66', flexDirection: 'column', alignItems: 'stretch' }}>
                  <div className="an" style={{ color: r.color }}>{r.name}</div>
                  <div>BEST TIME: <b>{best !== undefined && isFinite(best) ? formatTime(best) : '--:--'}</b></div>
                  {splits && <div className="small muted">Splits: {splits.slice(0, 10).map((s) => formatTime(s, false)).join(' · ')}{splits.length > 10 ? ' …' : ''}</div>}
                  <Btn size="sm" variant="primary" disabled={!done} onClick={() => GameManager.startSpeedrun(r.id)}>Start run</Btn>
                </div>
              );
            })}
          </div>
          <div className="small muted" style={{ marginTop: 14 }}>Total runs: {d.speedrun.runs}. Time from failed attempts counts toward the total.</div>
        </div>
      </div>
    </div>
  );
}

// ─── Level Mutations ────────────────────────────────────────────────────────
export function Mutations() {
  const setScreen = useGame((s) => s.setScreen);
  const st = useProfile((s) => s.data.settings);
  const done = useProfile((s) => s.data.progress.gameCompleted);
  const set = useProfile((s) => s.setSettings);
  const toggle = (m: Mutation) => {
    if (!done) return;
    const has = st.mutations.includes(m);
    set({ mutations: has ? st.mutations.filter((x) => x !== m) : [...st.mutations, m] });
    Audio.play(has ? 'click' : 'powerup');
  };
  const bonus = st.mutations.reduce((a, m) => a + (MUTATIONS.find((x) => x.id === m)?.bonus ?? 0), 0);
  return (
    <div className="screen dim">
      <TopBar title="🧬 LEVEL MUTATIONS" onBack={() => setScreen('menu')} />
      <div className="page scroll">
        <div className="panel" style={{ flex: 1 }}>
          <div className="muted" style={{ marginBottom: 14 }}>Active mutations apply to every level you play. Reward bonus: <b style={{ color: 'var(--gold)' }}>+{Math.round(bonus * 100)}%</b></div>
          <div className="ach-grid">
            {MUTATIONS.map((m) => (
              <div key={m.id} className={`mut-card ${st.mutations.includes(m.id) ? 'on' : ''}`} onClick={() => toggle(m.id)}>
                <div className="mi">{m.icon}</div>
                <div className="an h3">{m.name}</div>
                <div className="small muted">{m.desc}</div>
                <div className="small" style={{ color: 'var(--gold)' }}>+{Math.round(m.bonus * 100)}% rewards</div>
              </div>
            ))}
          </div>
          {st.mutations.length > 0 && <Btn size="sm" style={{ marginTop: 14 }} onClick={() => set({ mutations: [] })}>Clear all</Btn>}
        </div>
      </div>
    </div>
  );
}
