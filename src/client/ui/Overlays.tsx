import { formatTicks } from '../../core/meta/save.js';
import type { CourseResult, SkirmishResult } from '../app/appState.js';
import { useApp, useGame, useT } from './hooks.js';

export function ClickToPlay() {
  const game = useGame();
  const t = useT();
  const touch = useApp((s) => s.touch);
  const combat = useApp((s) => s.mode !== 'course');
  const hint = touch ? (combat ? 'play.touchHint.combat' : 'play.touchHint') : combat ? 'play.clickHint.combat' : 'play.clickHint';
  return (
    <div className="overlay overlay-clear">
      <button type="button" className="panel click-to-play" autoFocus onClick={() => game.resume()} data-testid="click-to-play">
        <span className="click-title">{t(touch ? 'play.tapToStart' : 'play.clickToStart')}</span>
        <span className="click-hint">{t(hint)}</span>
      </button>
    </div>
  );
}

export function PauseMenu() {
  const game = useGame();
  const t = useT();
  const mode = useApp((s) => s.mode);
  const restartLabel = mode === 'course' ? 'pause.restart' : mode === 'range' ? 'pause.restartRange' : 'pause.restartMatch';
  return (
    <div className="overlay" data-testid="pause-menu">
      <div className="panel menu" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <h2 id="pause-title" className="menu-title">
          {t('pause.title')}
        </h2>
        <button type="button" className="btn btn-primary" autoFocus onClick={() => game.resume()} data-testid="resume">
          {t('pause.resume')}
        </button>
        <button type="button" className="btn" onClick={() => game.restart()} data-testid="restart">
          {t(restartLabel)}
        </button>
        <button type="button" className="btn" onClick={() => game.openSettings()} data-testid="pause-settings">
          {t('pause.settings')}
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => game.exitToLobby()} data-testid="to-lobby">
          {t('pause.lobby')}
        </button>
      </div>
    </div>
  );
}

function CourseResults({ result }: { result: CourseResult }) {
  const game = useGame();
  const t = useT();
  return (
    <div className="panel menu results" role="dialog" aria-modal="true" aria-labelledby="results-title">
      <h2 id="results-title" className="menu-title">
        {t('results.title')}
      </h2>
      <div className="results-time">
        <span className="hud-label">{t('results.time')}</span>
        <strong data-testid="result-time">{formatTicks(result.ticks)}</strong>
        {result.isNewBest ? (
          <span className="chip chip-amber" data-testid="new-best">
            {t('results.newBest')}
          </span>
        ) : null}
        {result.previousBestTicks !== null ? (
          <span className="results-previous">
            {t('results.previousBest')}: {formatTicks(result.previousBestTicks)}
          </span>
        ) : null}
      </div>
      <div className="splits">
        <span className="hud-label">{t('results.splits')}</span>
        <ol>
          {result.splits.map((split, index) => (
            <li key={index}>
              <span>{index + 1}</span>
              <span>{formatTicks(split)}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="menu-row">
        <button type="button" className="btn btn-primary" autoFocus onClick={() => game.restart()} data-testid="run-again">
          {t('results.again')}
        </button>
        <button type="button" className="btn" onClick={() => game.exitToLobby()} data-testid="results-lobby">
          {t('results.lobby')}
        </button>
      </div>
    </div>
  );
}

function SkirmishResults({ result }: { result: SkirmishResult }) {
  const game = useGame();
  const t = useT();
  return (
    <div className={result.won ? 'panel menu results skirmish won' : 'panel menu results skirmish'} role="dialog" aria-modal="true" aria-labelledby="results-title">
      <h2 id="results-title" className="menu-title outcome" data-testid="skirmish-outcome" data-won={result.won}>
        {t(result.won ? 'results.victory' : 'results.defeat')}
      </h2>
      <div className="results-time">
        <span className="hud-label">{t('results.placement')}</span>
        <strong data-testid="result-placement">#{result.placement}</strong>
        <span className="results-previous">{t('results.of', { n: result.total })}</span>
        {result.isBestPlacement ? <span className="chip chip-amber">{t('results.bestPlacement')}</span> : null}
      </div>
      {!result.won && result.eliminatedBy ? <p className="menu-text">{t('results.eliminatedBy', { name: result.eliminatedBy })}</p> : null}
      <dl className="result-stats">
        <div>
          <dt>{t('results.eliminations')}</dt>
          <dd data-testid="result-eliminations">{result.eliminations}</dd>
        </div>
        <div>
          <dt>{t('results.damage')}</dt>
          <dd data-testid="result-damage">{result.damageDealt}</dd>
        </div>
        <div>
          <dt>{t('results.accuracy')}</dt>
          <dd>{Math.round(result.accuracy * 100)}%</dd>
        </div>
        <div>
          <dt>{t('results.headshots')}</dt>
          <dd>{result.headshots}</dd>
        </div>
        <div>
          <dt>{t('results.survived')}</dt>
          <dd>{formatTicks(result.activeTicks)}</dd>
        </div>
      </dl>
      <div className="splits standings">
        <span className="hud-label">{t('results.standings')}</span>
        <ol>
          {result.standings.map((row, index) => (
            <li key={index} className={row.local ? 'local' : undefined}>
              <span>{row.placement > 0 ? `#${row.placement}` : t('results.stillFighting')}</span>
              <span className="standing-name">
                {row.name}
                {row.isBot ? <span className="tag tag-bot">{t('hud.bot')}</span> : null}
              </span>
              <span>{row.eliminations}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="results-note">{t('results.botsNote')}</p>
      <div className="menu-row">
        <button type="button" className="btn btn-primary" autoFocus onClick={() => game.restart()} data-testid="run-again">
          {t('results.rematch')}
        </button>
        <button type="button" className="btn" onClick={() => game.exitToLobby()} data-testid="results-lobby">
          {t('results.lobby')}
        </button>
      </div>
    </div>
  );
}

export function Results() {
  const result = useApp((s) => s.result);
  if (!result) return null;
  return (
    <div className="overlay" data-testid="results">
      {result.kind === 'course' ? <CourseResults result={result} /> : <SkirmishResults result={result} />}
    </div>
  );
}

export function FatalError() {
  const t = useT();
  return (
    <div className="overlay">
      <div className="panel menu" role="alert">
        <h2 className="menu-title">{t('error.webgl.title')}</h2>
        <p className="menu-text">{t('error.webgl.body')}</p>
      </div>
    </div>
  );
}
