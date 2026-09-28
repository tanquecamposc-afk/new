import { Btn, Bar } from '../components/Common';
import { useGame } from '../../store/gameStore';
import { useProfile, xpForLevel } from '../../store/profileStore';
import { GameManager } from '../../core/GameManager';
import { getLevel, LEVELS, TOTAL_SECRETS } from '../../data/levels';
import { worldOf } from '../../data/worlds';
import { DIFFICULTIES } from '../../data/modes';

export function MainMenu() {
  const setScreen = useGame((s) => s.setScreen);
  const d = useProfile((s) => s.data);
  const totalStars = useProfile((s) => s.totalStars());
  const next = Math.min(100, d.progress.unlocked);
  const nextMeta = getLevel(String(next))!;
  const w = worldOf(next);
  const completed = d.progress.gameCompleted;
  const items: [string, string, () => void, boolean?][] = [
    ['▶', 'Play', () => GameManager.startLevel(String(next))],
    ['🗺', 'Levels', () => setScreen('levels')],
    ['🛒', 'Shop', () => setScreen('shop')],
    ['🎒', 'Inventory', () => setScreen('inventory')],
    ['👤', 'Profile', () => setScreen('profile')],
    ['🏆', 'Achievements', () => setScreen('achievements')],
    ['⚙', 'Settings', () => { useGame.getState().set({ settingsReturn: 'menu' }); setScreen('settings'); }],
    ['⏱', 'Speedrun', () => setScreen('speedrun'), !completed],
  ];
  if (completed) items.splice(7, 0, ['🧬', 'Mutations', () => setScreen('mutations')]);
  return (
    <div className="screen main-menu">
      <div className="title-xl gold-text logo">
        100 LEVELS
        <small>ULTRA · 10 WORLDS · 1 LEGEND</small>
      </div>
      <div className="menu-buttons">
        {items.map(([ico, label, fn, locked], i) => (
          <Btn key={label} className={`menu-btn ${locked ? 'locked' : ''} ${i === 0 ? 'primary' : ''}`} style={{ animationDelay: `${0.05 * i}s` }} onClick={fn} tip={locked ? 'Complete level 100 to unlock' : undefined}>
            <span className="ico">{locked ? '🔒' : ico}</span> {label}
          </Btn>
        ))}
      </div>
      <div className="panel continue-card">
        <div className="small muted">NEXT UP · WORLD {w.id} {w.name}</div>
        <div className="h3" style={{ color: w.color, marginTop: 4 }}>
          LEVEL {nextMeta.num} — {nextMeta.name}
        </div>
      </div>
      <ProfileCard />
      <div className="menu-footer">
        <span>⭐ {totalStars} / {LEVELS.length * 3}</span>
        <span>🗝 SECRET ITEMS FOUND: {d.secrets.length}/{TOTAL_SECRETS}</span>
        <span style={{ color: DIFFICULTIES[d.settings.difficulty].color }}>◆ {DIFFICULTIES[d.settings.difficulty].name}</span>
        {d.settings.mutations.length > 0 && <span style={{ color: '#ff2d55' }}>🧬 {d.settings.mutations.join(', ').toUpperCase()}</span>}
        <div className="spacer" />
        <span>WASD move · Mouse look · SPACE jump · SHIFT sprint · F dodge · Q ability · E interact · ESC pause</span>
      </div>
    </div>
  );
}

function ProfileCard() {
  const p = useProfile((s) => s.data.profile);
  const need = xpForLevel(p.level);
  return (
    <div className="panel profile-card">
      <div className="avatar">{p.level}</div>
      <div style={{ flex: 1 }}>
        <div className="h3">{p.name}</div>
        <div className="small muted">LEVEL {p.level} · {Math.floor(p.xp)} / {need} XP</div>
        <Bar value={p.xp} max={need} className="xp-bar" />
      </div>
      <div className="coins-pill" style={{ padding: '6px 12px' }}>💰 {p.coins.toLocaleString()}</div>
    </div>
  );
}
