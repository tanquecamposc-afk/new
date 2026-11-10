import { formatTicks } from '../../core/meta/save.js';
import { useApp, useGame, useT } from './hooks.js';

export function ClickToPlay() {
  const game = useGame();
  const t = useT();
  return (
    <div className="overlay overlay-clear">
      <button type="button" className="panel click-to-play" autoFocus onClick={() => game.resume()} data-testid="click-to-play">
        <span className="click-title">{t('play.clickToStart')}</span>
        <span className="click-hint">{t('play.clickHint')}</span>
      </button>
    </div>
  );
}

export function PauseMenu() {
  const game = useGame();
  const t = useT();
  return (
    <div className="overlay" data-testid="pause-menu">
      <div className="panel menu" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <h2 id="pause-title" className="menu-title">
          {t('pause.title')}
        </h2>
        <button type="button" className="btn btn-primary" autoFocus onClick={() => game.resume()} data-testid="resume">
          {t('pause.resume')}
        </button>
        <button type="button" className="btn" onClick={() => game.restartCourse()} data-testid="restart">
          {t('pause.restart')}
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

export function Results() {
  const game = useGame();
  const t = useT();
  const result = useApp((s) => s.result);
  if (!result) return null;
  return (
    <div className="overlay" data-testid="results">
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
          <button type="button" className="btn btn-primary" autoFocus onClick={() => game.restartCourse()} data-testid="run-again">
            {t('results.again')}
          </button>
          <button type="button" className="btn" onClick={() => game.exitToLobby()} data-testid="results-lobby">
            {t('results.lobby')}
          </button>
        </div>
      </div>
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
