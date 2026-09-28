/**
 * GameManager: top-level state machine. Switches between the menu scene and
 * level sessions, drives loading, pause, restart, next level and speedruns.
 */
import { Engine } from './Engine';
import { MenuScene } from './MenuScene';
import { Input } from './Input';
import { Session } from '../levels/Session';
import { getLevel, nextLevelId, LEVELS } from '../data/levels';
import { useGame, emptyHud, Screen } from '../store/gameStore';
import { useProfile } from '../store/profileStore';
import { Audio } from '../audio/AudioManager';
import { setFoundCheck } from '../entities/Pickups';

const TIPS = [
  'Every level hides a secret.',
  "Don't trust the darkness.",
  'Level 100 is waiting.',
  'Dodge (F) makes you briefly invulnerable.',
  'Heavy attacks (right click) break guards and walls.',
  'Q uses your ability — it changes in every world.',
  'Crouch (CTRL) in tall grass to vanish from guards.',
  'Three stars need speed AND skill.',
  'Chests found in levels are yours only if you finish.',
  'Boost (SPACE) in races — but mind the corners.',
  'The Watcher cannot be killed. Only escaped.',
  'Potions (R) restore 50 HP.',
];

class GameManagerImpl {
  engine: Engine | null = null;
  menu: MenuScene | null = null;
  session: Session | null = null;
  private loadingToken = 0;

  init(container: HTMLElement) {
    if (this.engine) return;
    const prof = useProfile.getState();
    this.engine = new Engine(container);
    this.engine.setQuality(prof.data.settings.quality);
    this.engine.onFps = (fps) => useGame.getState().set({ fps });
    this.menu = new MenuScene(this.engine);
    this.menu.activate();
    this.syncMenuCharacter();
    this.engine.updater = { update: (dt) => this.menu!.update(dt) };
    this.engine.start();
    Input.onPause = () => this.togglePause();
    setFoundCheck((id) => useProfile.getState().data.secrets.includes(id));
    // React to profile changes (equip in shop/inventory updates the hero)
    useProfile.subscribe(() => this.syncMenuCharacter());
  }

  syncMenuCharacter() {
    const eq = useProfile.getState().data.inventory.equipped;
    this.menu?.setCharacter(eq.skin, eq.weapon);
  }

  applySettings() {
    const st = useProfile.getState().data.settings;
    Audio.setVolumes(st.master, st.music, st.sfx);
    this.engine?.setQuality(st.quality);
    if (this.session) {
      this.session.rig.sensitivity = st.sensitivity;
      this.session.rig.invertY = st.invertY;
      this.session.rig.shakeScale = st.shake;
    }
  }

  setMenuFocus(f: 'wide' | 'character') {
    if (this.menu) this.menu.focus = f;
  }

  /** Load and start a level (async with loading screen). */
  async startLevel(id: string) {
    const meta = getLevel(id);
    if (!meta || !this.engine) return;
    const prof = useProfile.getState();
    if (!prof.isUnlocked(id)) return;
    const token = ++this.loadingToken;
    Audio.init();
    const g = useGame.getState();
    g.set({ currentLevel: id, hud: emptyHud(), summary: null, death: null, banner: null, craftOpen: false, subtitle: null });
    g.set({ loading: { progress: 0, label: 'Preparing', tip: TIPS[Math.floor(Math.random() * TIPS.length)] } });
    g.setScreen('loading');
    Input.reset();
    this.disposeSession();
    Audio.stopMusic(0.6);
    Audio.stopAllLoops();
    const d = prof.data;
    const session = new Session(this.engine, {
      meta,
      equip: { ...d.inventory.equipped },
      owned: d.inventory.owned,
      potions: d.inventory.potions,
      revives: d.inventory.revives,
      difficulty: d.settings.difficulty,
      mutations: d.settings.mutations,
      speedrun: !!g.speedrun?.active,
      quality: d.settings.quality,
      shake: d.settings.shake,
      sensitivity: d.settings.sensitivity,
      invertY: d.settings.invertY,
    });
    try {
      await session.build((p, label) => {
        if (token === this.loadingToken) useGame.getState().set({ loading: { ...useGame.getState().loading, progress: p, label } });
      });
    } catch (e) {
      console.error('Level build failed', e);
      session.dispose();
      if (token === this.loadingToken) this.toMenu();
      return;
    }
    if (token !== this.loadingToken) {
      session.dispose();
      return;
    }
    await new Promise((r) => setTimeout(r, 250));
    if (token !== this.loadingToken) {
      session.dispose();
      return;
    }
    this.session = session;
    this.engine.updater = { update: (dt, raw) => session.update(dt, raw) };
    // First visit of a world is remembered (world intro banner shown once per visit anyway)
    useGame.getState().setScreen('playing');
    session.start();
  }

  restart() {
    const id = useGame.getState().currentLevel;
    if (id) this.startLevel(id);
  }

  nextLevel() {
    const g = useGame.getState();
    const id = g.currentLevel;
    if (!id) return;
    const n = nextLevelId(id);
    if (n) this.startLevel(n);
    else this.toMenu('levels');
  }

  togglePause() {
    const g = useGame.getState();
    if (g.screen === 'playing' && this.session && (this.session.state === 'playing' || this.session.state === 'intro' || this.session.state === 'cutscene')) {
      g.setScreen('paused');
      g.set({ craftOpen: false });
      Audio.setPaused(true);
      Input.exitPointerLock();
      Input.reset();
    } else if (g.screen === 'paused') {
      this.resume();
    } else if (g.screen === 'settings' && g.settingsReturn === 'paused') {
      g.setScreen('paused');
    }
  }

  resume() {
    const g = useGame.getState();
    if (g.screen !== 'paused') return;
    g.setScreen('playing');
    Audio.setPaused(false);
    Input.reset();
    Input.requestPointerLock();
  }

  toMenu(screen: Screen = 'menu') {
    this.loadingToken++;
    this.disposeSession();
    Input.exitPointerLock();
    Input.reset();
    Audio.setPaused(false);
    Audio.stopAllLoops();
    Audio.playMusic('menu');
    const g = useGame.getState();
    g.set({ currentLevel: null, speedrun: screen === 'speedrun' ? g.speedrun : null, hud: emptyHud(), banner: null });
    if (this.engine && this.menu) {
      this.menu.activate();
      this.syncMenuCharacter();
      this.engine.updater = { update: (dt) => this.menu!.update(dt) };
    }
    g.setScreen(screen);
  }

  private disposeSession() {
    if (this.session) {
      this.session.dispose();
      this.session = null;
    }
  }

  // ── Speedrun ──────────────────────────────────────────────────────────────
  startSpeedrun(runId: string) {
    let ids: string[];
    if (runId === 'full') ids = LEVELS.map((l) => l.id);
    else {
      const w = Number(runId.replace('world', ''));
      ids = LEVELS.filter((l) => l.world === w).map((l) => l.id);
    }
    useGame.getState().set({ speedrun: { active: true, runId, ids, index: 0, splits: [], total: 0 } });
    this.startLevel(ids[0]);
  }

  /** Called from the victory screen during a speedrun. */
  speedrunNext() {
    const g = useGame.getState();
    const sr = g.speedrun;
    if (!sr) return;
    const next = sr.index + 1;
    if (next >= sr.ids.length) {
      this.toMenu('speedrun');
      return;
    }
    g.set({ speedrun: { ...sr, index: next } });
    this.startLevel(sr.ids[next]);
  }
}

export const GameManager = new GameManagerImpl();
