import { formatTicks, PLAYABLE_MODES, SKIRMISH_BOT_OPTIONS, SKIRMISH_DIFFICULTIES, type PlayableMode } from '../../core/meta/save.js';
import { TRAINING_GROUNDS_ID } from '../../core/maps/trainingGrounds.js';
import { ControlsList } from './ControlsList.js';
import { useApp, useGame, useT } from './hooks.js';

/** Systems that are planned but not built yet. Shown locked so nothing pretends to work. */
const ROADMAP: ReadonlyArray<{ key: string; phase: number }> = [
  { key: 'roadmap.royale', phase: 3 },
  { key: 'roadmap.modes', phase: 4 },
  { key: 'roadmap.meta', phase: 5 },
  { key: 'roadmap.creative', phase: 6 },
];

/** Text keys and map of each playable mode. */
const MODE_INFO: Readonly<Record<PlayableMode, { key: string; mapKey: string; chip: string }>> = {
  course: { key: 'mode.training', mapKey: 'map.training_grounds', chip: 'chip-turq' },
  range: { key: 'mode.range', mapKey: 'map.firing_range', chip: 'chip-turq' },
  skirmish: { key: 'mode.skirmish', mapKey: 'map.quarry_arena', chip: 'chip-amber' },
};

export function Lobby() {
  const game = useGame();
  const t = useT();
  const mode = useApp((s) => s.mode);
  const profile = useApp((s) => s.save.profile);
  const storageBlocked = useApp((s) => s.storageBlocked);
  const best = profile.bestCourseTicks[TRAINING_GROUNDS_ID];
  const info = MODE_INFO[mode];
  const stats = profile.skirmish;

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
          <div className="mode-tabs" role="group" aria-label={t('lobby.modes')}>
            {PLAYABLE_MODES.map((option) => (
              <button
                key={option}
                type="button"
                className={option === mode ? 'mode-tab on' : 'mode-tab'}
                aria-pressed={option === mode}
                onClick={() => game.selectMode(option)}
                data-testid={`mode-${option}`}
              >
                {t(`${MODE_INFO[option].key}.name`)}
              </button>
            ))}
          </div>

          <span className={`chip ${info.chip}`}>{t(`${info.key}.tag`)}</span>
          <h2 id="mode-title" className="mode-title" data-testid="mode-title">
            {t(`${info.key}.name`)}
          </h2>
          <p className="mode-map">{t(info.mapKey)}</p>
          <p className="mode-description">{t(`${info.key}.description`)}</p>

          {mode === 'course' ? (
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
          ) : null}

          {mode === 'range' ? (
            <dl className="stat-row">
              <div>
                <dt>{t('lobby.range.weapons')}</dt>
                <dd>5</dd>
              </div>
              <div>
                <dt>{t('lobby.range.targets')}</dt>
                <dd>6</dd>
              </div>
            </dl>
          ) : null}

          {mode === 'skirmish' ? (
            <>
              <div className="option-row">
                <span className="hud-label" id="bots-label">
                  {t('lobby.bots')}
                </span>
                <div className="segmented" role="group" aria-labelledby="bots-label">
                  {SKIRMISH_BOT_OPTIONS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={count === profile.skirmishOptions.bots ? 'segment on' : 'segment'}
                      aria-pressed={count === profile.skirmishOptions.bots}
                      onClick={() => game.setSkirmishOptions({ bots: count })}
                      data-testid={`bots-${count}`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
              <div className="option-row">
                <span className="hud-label" id="difficulty-label">
                  {t('lobby.difficulty')}
                </span>
                <div className="segmented" role="group" aria-labelledby="difficulty-label">
                  {SKIRMISH_DIFFICULTIES.map((difficulty) => (
                    <button
                      key={difficulty}
                      type="button"
                      className={difficulty === profile.skirmishOptions.difficulty ? 'segment on' : 'segment'}
                      aria-pressed={difficulty === profile.skirmishOptions.difficulty}
                      onClick={() => game.setSkirmishOptions({ difficulty })}
                      data-testid={`difficulty-${difficulty}`}
                    >
                      {t(`difficulty.${difficulty}`)}
                    </button>
                  ))}
                </div>
              </div>
              <dl className="stat-row stat-row-wide">
                <div>
                  <dt>{t('lobby.skirmish.played')}</dt>
                  <dd data-testid="skirmish-played">{stats.played}</dd>
                </div>
                <div>
                  <dt>{t('lobby.skirmish.wins')}</dt>
                  <dd data-testid="skirmish-wins">{stats.wins}</dd>
                </div>
                <div>
                  <dt>{t('lobby.skirmish.eliminations')}</dt>
                  <dd data-testid="skirmish-eliminations">{stats.eliminations}</dd>
                </div>
                <div>
                  <dt>{t('lobby.skirmish.best')}</dt>
                  <dd>{stats.bestPlacement !== null ? `#${stats.bestPlacement}` : t('lobby.none')}</dd>
                </div>
              </dl>
            </>
          ) : null}

          <button type="button" className="btn btn-primary btn-play" autoFocus onClick={() => game.startMode(mode)} data-testid="play">
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
        <ControlsList combat={mode !== 'course'} />
      </aside>

      <footer className="lobby-footer">{storageBlocked ? '⚠ ' : ''}{t('app.localProgress')}</footer>
    </div>
  );
}
