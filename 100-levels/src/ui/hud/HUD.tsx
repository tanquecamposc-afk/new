import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../store/gameStore';
import { useProfile } from '../../store/profileStore';
import { Bar } from '../components/Common';
import { formatTime } from '../../core/math';
import { itemById } from '../../data/items';
import { GameManager } from '../../core/GameManager';
import { Input } from '../../core/Input';
import { Audio } from '../../audio/AudioManager';

export function HUD() {
  const h = useGame((s) => s.hud);
  const screen = useGame((s) => s.screen);
  const craftOpen = useGame((s) => s.craftOpen);
  const showFps = useProfile((s) => s.data.settings.showFps);
  const fps = useGame((s) => s.fps);
  const [comboKey, setComboKey] = useState(0);
  const lastCombo = useRef(0);
  useEffect(() => {
    if (h.combo > lastCombo.current) setComboKey((k) => k + 1);
    lastCombo.current = h.combo;
  }, [h.combo]);
  const flash = GameManager.session?.hudFlash;
  useEffect(() => {
    if (GameManager.session) GameManager.session.hudFlash = null;
  });
  if (screen !== 'playing' && screen !== 'paused') return null;
  const timeLeft = h.timeLimit !== null ? Math.max(0, h.timeLimit - h.time) : null;
  const vehicle = !!h.race;
  return (
    <div className="hud pass">
      {!vehicle && (
        <div className="hud-tl">
          <div className="stat"><span className="ic">❤️</span><Bar value={h.hp} max={h.maxHp} className="hp-bar" lag /><span className="val">{Math.ceil(h.hp)}</span></div>
          <div className="stat"><span className="ic">⚡</span><Bar value={h.stamina} className="st-bar thin" /><span className="val">{Math.round(h.stamina)}</span></div>
          <div className="stat"><span className="ic">🔥</span><Bar value={h.energy} className={`en-bar thin ${flash === 'energy' ? 'flash' : ''}`} /><span className="val">{Math.round(h.energy)}</span></div>
        </div>
      )}
      <div className="hud-tr">
        <div className={`hud-pill ${timeLeft !== null && timeLeft < 15 ? 'warn' : ''}`}>⏱️ {timeLeft !== null ? formatTime(timeLeft) : formatTime(h.time)}</div>
        <div className="hud-pill">💰 {h.coins}{h.totalCoins > 0 ? ` / ${h.totalCoins}` : ''}</div>
        <div className="hud-pill" title="Stars available">⭐ {h.noDamage ? '3' : '2'} possible</div>
        {h.secretsInLevel > 0 && <div className="hud-pill">🗝 {h.secretsFoundInLevel}/{h.secretsInLevel}</div>}
      </div>
      {h.objective && (
        <div className="hud-obj" style={vehicle ? { top: 20 } : undefined}>
          🎯 {h.objective}
          {h.progress && <div className="p">{h.progress}</div>}
        </div>
      )}
      {h.boss && (
        <div className="boss-bar">
          <div className="name">{h.boss.name}</div>
          {h.boss.subtitle && <div className="sub">{h.boss.subtitle}</div>}
          <Bar value={h.boss.hp} max={h.boss.maxHp} className={h.boss.shield ? 'shield' : ''} lag />
          <div className="phases">{Array.from({ length: h.boss.phases }, (_, i) => <i key={i} className={i < h.boss!.phase ? 'on' : ''} />)}</div>
        </div>
      )}
      <div className="hud-extra">
        {h.stealth && (
          <div className="hud-pill detect col" style={{ alignItems: 'stretch', gap: 4 }}>
            <span className="small">{h.stealth.alarm ? '🚨 ALARM' : '👁 ' + h.stealth.state}</span>
            <Bar value={h.stealth.detection} />
          </div>
        )}
        {h.survival && (
          <div className="hud-pill col" style={{ alignItems: 'stretch', gap: 4, width: 230 }}>
            <span className="small">{h.survival.night ? '🌙' : '☀️'} {h.survival.clock}</span>
            <div className="stat"><span className="ic">🍖</span><Bar value={h.survival.hunger} className="thin" color="#ffa040" /></div>
            <div className="stat"><span className="ic">💧</span><Bar value={h.survival.thirst} className="thin" color="#40b0ff" /></div>
            <div className="stat"><span className="ic">🔥</span><Bar value={h.survival.warmth} className="thin" color="#ff6040" /></div>
            <span className="small">🪵 {h.survival.wood} · 🪨 {h.survival.stone} · 🍓 {h.survival.food}</span>
            <span className="small muted">[TAB] Craft</span>
          </div>
        )}
        {h.precision && (
          <div className="hud-pill col" style={{ alignItems: 'flex-end', gap: 2 }}>
            <span style={{ fontSize: 26 }}>{h.precision.score}</span>
            <span className="small">🎯 {h.precision.hits}/{h.precision.shots} · {h.precision.shots ? Math.round((h.precision.hits / h.precision.shots) * 100) : 100}%</span>
            {h.precision.streak > 1 && <span className="small" style={{ color: 'var(--gold)' }}>STREAK ×{h.precision.streak}</span>}
            {h.precision.stage && <span className="small muted">{h.precision.stage}</span>}
          </div>
        )}
        {h.horror && (
          <div className="hud-pill col" style={{ alignItems: 'stretch', gap: 4, width: 190 }}>
            <div className="stat"><span className="ic">💓</span><Bar value={h.horror.fear} className="thin" color="#ff3040" /></div>
            <div className="stat"><span className="ic">🔦</span><Bar value={h.horror.battery} className="thin" color="#ffe066" /></div>
          </div>
        )}
      </div>
      {h.race && (
        <>
          <div style={{ position: 'absolute', left: 24, top: 90 }}>
            <div className="race-pos">{h.race.pos}<small>/{h.race.total}</small></div>
            <div className="hud-pill" style={{ marginTop: 8 }}>LAP {Math.min(h.race.lap, h.race.laps)}/{h.race.laps}</div>
            <div className="hud-pill" style={{ marginTop: 6 }}>CP {h.race.checkpoint}/{h.race.checkpoints}</div>
          </div>
          <div className="speedo">
            <div className="v">{Math.round(h.race.speed)}</div>
            <div className="u">KM/H</div>
            <Bar value={h.race.boost} color="linear-gradient(90deg,#34d4ff,#b48cff)" />
            <div className="small muted">BOOST [SPACE]</div>
          </div>
        </>
      )}
      {h.crosshair && (
        <div className="crosshair"><div className="dot" /></div>
      )}
      {h.prompt && <div className="hud-prompt">{h.prompt}</div>}
      {flash === 'locked' && <div className="hud-prompt" style={{ borderColor: '#ff4d5e' }}>🔒 Exit locked — complete the objective</div>}
      {!vehicle && (h.weapons.length > 0 || h.abilityName) && (
        <div className="hud-bottom">
          {h.weapons.map((w, i) => (
            <div key={w} className={`weapon-slot ${w === h.weapon ? 'active' : ''}`}><span className="k">{i + 1}</span>{itemById(w)?.icon ?? '⚔'}</div>
          ))}
          {h.abilityName && (
            <div className={`weapon-slot ability-slot ${h.energy >= h.abilityCost ? 'ready' : ''}`}>
              <div className="cd" style={{ height: `${Math.min(100, (h.energy / (h.abilityCost || 1)) * 100)}%` }} />
              <span className="k">Q</span>
              <span style={{ position: 'relative' }}>{h.abilityName}</span>
            </div>
          )}
          {h.potions > 0 && <div className="weapon-slot"><span className="k">R</span>🧪<span className="small" style={{ position: 'absolute', bottom: 2, right: 5 }}>{h.potions}</span></div>}
        </div>
      )}
      {h.damageDir !== null && (
        <div className="damage-dir" style={{ transform: `rotate(${-h.damageDir}rad)` }}><i /></div>
      )}
      {h.combo > 2 && <div key={comboKey} className="combo">{h.combo} HITS</div>}
      {craftOpen && <CraftPanel />}
      {showFps && <div className="fps">{fps} FPS</div>}
    </div>
  );
}

export function CraftPanel() {
  const logic = GameManager.session?.logic;
  const [, force] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => force((x) => x + 1), 250);
    return () => clearInterval(iv);
  }, []);
  if (!logic?.recipes) return null;
  const list = logic.recipes();
  return (
    <div className="panel craft-panel" style={{ pointerEvents: 'auto' }}>
      <div className="h3">🔨 CRAFTING</div>
      <div className="small muted">Click a recipe · TAB to close</div>
      {list.map((r) => (
        <div
          key={r.id}
          className={`craft-item ${r.can ? '' : 'no'}`}
          onClick={() => {
            if (!r.can) return Audio.play('error');
            logic.craft?.(r.id);
            force((x) => x + 1);
          }}
        >
          <span style={{ fontSize: 26 }}>{r.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{r.name}</div>
            <div className="small muted">{r.cost}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Overlays() {
  const banner = useGame((s) => s.banner);
  const toasts = useGame((s) => s.toasts);
  const subtitle = useGame((s) => s.subtitle);
  return (
    <div className="pass" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {banner && (
        <div key={banner.id} className={`banner ${banner.big ? 'big' : ''}`} style={{ ['--bc' as string]: banner.color }}>
          <div className="t">{banner.title}</div>
          <div className="s">{banner.subtitle}</div>
          <div className="line" />
        </div>
      )}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="panel toast" style={{ ['--tc' as string]: t.color }}>
            <span className="ti">{t.icon}</span>
            <div>
              <div className="tt">{t.title}</div>
              <div className="tx">{t.text}</div>
            </div>
          </div>
        ))}
      </div>
      {subtitle && <div className="subtitle">{subtitle}</div>}
    </div>
  );
}

/** On-screen controls for tablets / touch screens. */
export function TouchControls() {
  const knob = useRef<HTMLDivElement>(null);
  const stickId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });
  const center = useRef({ x: 0, y: 0 });
  const btn = (a: Parameters<typeof Input.setTouch>[0], label: string) => (
    <button
      className="tbtn"
      onPointerDown={(e) => { e.preventDefault(); Input.setTouch(a, true); }}
      onPointerUp={() => Input.setTouch(a, false)}
      onPointerLeave={() => Input.setTouch(a, false)}
      onPointerCancel={() => Input.setTouch(a, false)}
    >
      {label}
    </button>
  );
  return (
    <div className="touch">
      <div
        className="stick"
        onPointerDown={(e) => {
          stickId.current = e.pointerId;
          const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (stickId.current !== e.pointerId) return;
          let dx = (e.clientX - center.current.x) / 60, dy = (e.clientY - center.current.y) / 60;
          const l = Math.hypot(dx, dy);
          if (l > 1) { dx /= l; dy /= l; }
          Input.touchMove.x = dx;
          Input.touchMove.y = -dy;
          if (knob.current) knob.current.style.transform = `translate(${dx * 45}px, ${dy * 45}px)`;
        }}
        onPointerUp={() => {
          stickId.current = null;
          Input.touchMove.x = Input.touchMove.y = 0;
          if (knob.current) knob.current.style.transform = '';
        }}
      >
        <div ref={knob} className="knob" />
      </div>
      <div
        className="look"
        onPointerDown={(e) => { lookId.current = e.pointerId; lookLast.current = { x: e.clientX, y: e.clientY }; }}
        onPointerMove={(e) => {
          if (lookId.current !== e.pointerId) return;
          Input.addLook((e.clientX - lookLast.current.x) * 1.4, (e.clientY - lookLast.current.y) * 1.4);
          lookLast.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => (lookId.current = null)}
      />
      <div className="tbtns">
        {btn('ability', 'Q')}
        {btn('interact', 'E')}
        {btn('heavy', 'HVY')}
        {btn('dodge', 'ROLL')}
        {btn('attack', 'ATK')}
        {btn('jump', 'JUMP')}
        {btn('crouch', 'DUCK')}
        {btn('sprint', 'RUN')}
        {btn('potion', 'POT')}
      </div>
      <button className="btn sm tpause" onClick={() => GameManager.togglePause()}>❚❚</button>
    </div>
  );
}
