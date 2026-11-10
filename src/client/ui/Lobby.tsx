import { formatTicks } from '../../core/meta/save.js';
import { TRAINING_GROUNDS_ID } from '../../core/maps/trainingGrounds.js';
import { ControlsList } from './ControlsList.js';
import { useApp, useGame, useT } from './hooks.js';

/** Systems that are planned but not built yet. Shown locked so nothing pretends to work. */
const ROADMAP: ReadonlyArray<{ key: string; phase: number }> = [
  { key: 'roadmap.combat', phase: 2 },
  { key: 'roadmap.royale', phase: 3 },
  { key: 'roadmap.modes', phase: 4 },
  { key: 'roadmap.meta', phase: 5 },
  { key: 'roadmap.creative', phase: 6 },
];

export function Lobby() {
  const game = useGame();
  const t = useT();
  const profile = useApp((s) => s.save.profile);
  const storageBlocked = useApp((s) => s.storageBlocked);
  const best = profile.bestCourseTicks[TRAINING_GROUNDS_ID];

  return (
    <div className="lobby" data-testid="lobby">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1 className="brand-name">{t('app.title')}</h1>
            <p className="brand-tag">{t('app.tagline')}</p>
          </div>
        </div>
        <span className="chip chip-outline">{t('app.build')}</span>
        <span className="spacer" />
        <button type="button" className="btn" onClick={() => game.openSettings()} data-testid="open-settings">
          {t('lobby.settings')}
        </button>
      </header>

      <main className="lobby-main">
        <section className="panel mode-card" aria-labelledby="mode-title">
          <span className="chip chip-turq">{t('mode.training.tag')}</span>
          <h2 id="mode-title" className="mode-title">
            {t('mode.training.name')}
          </h2>
          <p className="mode-map">{t('map.training_grounds')}</p>
          <p className="mode-description">{t('mode.training.description')}</p>

          <dl className="stat-row">
            <div>
              <dt>{t('lobby.best')}</dt>
              <dd data-testid="best-time">{best !== undefined ? formatTicks(best) : t('lobby.noBest')}</dd>
            </div>
            <div>
              <dt>{t('lobby.runs')}</dt>
              <dd>{profile.coursesCompleted}</dd>
            </div>
          </dl>

          <button type="button" className="btn btn-primary btn-play" autoFocus onClick={() => game.startTraining()} data-testid="play">
            {t('lobby.play')}
          </button>
        </section>

        <section className="panel roadmap" aria-labelledby="roadmap-title">
          <h3 id="roadmap-title" className="section-title">
            {t('lobby.roadmap')}
          </h3>
          <ul>
            {ROADMAP.map((item) => (
              <li key={item.key} aria-disabled="true">
                <span className="lock" aria-hidden="true" />
                <span className="roadmap-name">{t(item.key)}</span>
                <span className="chip chip-muted">
                  {t('roadmap.phase', { n: item.phase })} · {t('lobby.soon')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <aside className="panel lobby-controls" aria-labelledby="controls-title">
        <h3 id="controls-title" className="section-title">
          {t('lobby.controls')}
        </h3>
        <ControlsList />
      </aside>

      <footer className="lobby-footer">{storageBlocked ? '⚠ ' : ''}{t('app.localProgress')}</footer>
    </div>
  );
}
