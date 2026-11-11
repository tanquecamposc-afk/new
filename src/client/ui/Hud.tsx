import { formatTicks } from '../../core/meta/save.js';
import { TRAINING_GROUNDS_ID } from '../../core/maps/trainingGrounds.js';
import { activeSettings } from '../app/appState.js';
import { hasTranslation } from '../app/i18n.js';
import { ControlsList } from './ControlsList.js';
import { useApp, useT } from './hooks.js';
import { TouchControls } from './TouchControls.js';

const COMPASS_POINTS: ReadonlyArray<{ label: string; angle: number; major: boolean }> = [
  { label: 'N', angle: 0, major: true },
  { label: 'NE', angle: 45, major: false },
  { label: 'E', angle: 90, major: true },
  { label: 'SE', angle: 135, major: false },
  { label: 'S', angle: 180, major: true },
  { label: 'SO', angle: 225, major: false },
  { label: 'O', angle: 270, major: true },
  { label: 'NO', angle: 315, major: false },
];
const COMPASS_SPAN = 100; // degrees visible to each side
const PERCENT_PER_DEGREE = 50 / COMPASS_SPAN;

function relative(angle: number, heading: number): number {
  return ((((angle - heading) % 360) + 540) % 360) - 180;
}

function Compass() {
  const t = useT();
  const heading = useApp((s) => s.hud.heading);
  const bearing = useApp((s) => s.hud.nextBearing);
  const distance = useApp((s) => s.hud.nextDistance);
  const english = useApp((s) => activeSettings(s).locale === 'en');
  const clampedBearing = bearing === null ? null : Math.max(-COMPASS_SPAN, Math.min(COMPASS_SPAN, bearing));
  return (
    <div className="compass" role="img" aria-label={`${heading}°`}>
      <div className="compass-track">
        {COMPASS_POINTS.map((point) => {
          const offset = relative(point.angle, heading);
          if (Math.abs(offset) > COMPASS_SPAN) return null;
          const label = english ? point.label.replace('O', 'W') : point.label;
          return (
            <span key={point.angle} className={point.major ? 'compass-point major' : 'compass-point'} style={{ left: `${50 + offset * PERCENT_PER_DEGREE}%` }}>
              {label}
            </span>
          );
        })}
        {clampedBearing !== null ? (
          <span
            className={Math.abs(bearing ?? 0) > COMPASS_SPAN ? 'compass-anchor edge' : 'compass-anchor'}
            style={{ left: `${50 + clampedBearing * PERCENT_PER_DEGREE}%` }}
            data-testid="compass-anchor"
          />
        ) : null}
        <span className="compass-needle" />
      </div>
      {distance !== null ? (
        <div className="compass-distance">
          {t('hud.next')} · {t('hud.distance', { m: distance })}
        </div>
      ) : null}
    </div>
  );
}

function CourseCard() {
  const t = useT();
  const reached = useApp((s) => s.hud.anchorsReached);
  const total = useApp((s) => s.hud.anchorsTotal);
  const ticks = useApp((s) => s.hud.timerTicks);
  const best = useApp((s) => s.save.profile.bestCourseTicks[TRAINING_GROUNDS_ID]);
  return (
    <div className="panel hud-course" data-testid="hud-course">
      <div className="hud-label">{t('hud.anchors')}</div>
      <div className="hud-anchors">
        <strong data-testid="anchors-reached">{reached}</strong>
        <span>/{total}</span>
      </div>
      <div className="pips" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i < reached ? 'pip on' : i === reached ? 'pip next' : 'pip'} />
        ))}
      </div>
      <div className="hud-label">{t('hud.time')}</div>
      <div className="hud-timer" data-testid="timer">
        {formatTicks(ticks)}
      </div>
      {best !== undefined ? (
        <div className="hud-best">
          {t('hud.best')} {formatTicks(best)}
        </div>
      ) : null}
    </div>
  );
}

function MoveChip() {
  const t = useT();
  const moveState = useApp((s) => s.hud.moveState);
  const speed = useApp((s) => s.hud.speed);
  return (
    <div className="panel hud-move" data-testid="hud-move">
      <span className={`state-dot state-${moveState}`} aria-hidden="true" />
      <span className="hud-state" data-testid="move-state">
        {t(`state.${moveState}`)}
      </span>
      <span className="hud-speed">
        <strong>{speed.toFixed(1)}</strong> {t('hud.speed')}
      </span>
    </div>
  );
}

function Hint() {
  const t = useT();
  const touch = useApp((s) => s.touch);
  const baseKey = useApp((s) => s.hud.nextHintKey);
  // Touch screens get their own wording where the instruction names a key.
  const hintKey = baseKey && touch && hasTranslation(`${baseKey}.touch`) ? `${baseKey}.touch` : baseKey;
  const running = useApp((s) => s.hud.timerRunning);
  const started = useApp((s) => s.hud.timerTicks > 0);
  if (!hintKey) return null;
  return (
    <div className="hud-hint" data-testid="hint">
      {!running && !started ? <div className="hint-waiting">{t('hud.waiting')}</div> : null}
      <div className="hint-text">{t(hintKey)}</div>
    </div>
  );
}

export function Hud() {
  const t = useT();
  const showHelp = useApp((s) => s.showHelp);
  const showFps = useApp((s) => activeSettings(s).display.showFps);
  const fps = useApp((s) => s.hud.fps);
  const frameMs = useApp((s) => s.hud.frameMs);
  const toast = useApp((s) => s.toast);
  const lookMode = useApp((s) => s.lookMode);
  const touch = useApp((s) => s.touch);
  const contextLost = useApp((s) => s.contextLost);
  const playing = useApp((s) => s.overlay === 'none');

  return (
    <div className={touch ? 'hud hud-touch' : 'hud'} data-testid="hud">
      <Compass />
      <CourseCard />
      {showFps ? (
        <div className="panel hud-fps" data-testid="fps">
          <strong>{fps}</strong> {t('hud.fps')} · {frameMs} ms
        </div>
      ) : null}
      <div className="crosshair" aria-hidden="true" />
      <MoveChip />
      <Hint />
      {toast ? (
        <div key={toast.id} className="toast" role="status" data-testid="toast">
          {toast.text}
        </div>
      ) : null}
      {touch && playing ? <TouchControls /> : null}
      {showHelp && !touch ? (
        <div className="panel hud-help">
          <h3 className="section-title">{t('hud.help')}</h3>
          <ControlsList />
        </div>
      ) : null}
      {playing && lookMode === 'drag' && !touch ? <div className="hud-notice">{t('play.dragLook')}</div> : null}
      {contextLost ? <div className="hud-notice warn">{t('hud.contextLost')}</div> : null}
    </div>
  );
}
