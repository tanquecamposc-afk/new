import { formatTicks } from '../../core/meta/save.js';
import { TRAINING_GROUNDS_ID } from '../../core/maps/trainingGrounds.js';
import { activeSettings } from '../app/appState.js';
import { hasTranslation, keyLabel } from '../app/i18n.js';
import { ControlsList } from './ControlsList.js';
import { useApp, useGame, useLocale, useT } from './hooks.js';
import { ItemIcon } from './icons.js';
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

function clampBearing(bearing: number): number {
  return Math.max(-COMPASS_SPAN, Math.min(COMPASS_SPAN, bearing));
}

/** Display name of a weapon or item id. */
function itemKey(kind: string, id: string): string {
  return kind === 'weapon' ? `weapon.${id}` : kind === 'ammo' ? `ammo.${id}` : `item.${id}`;
}

function Compass() {
  const t = useT();
  const heading = useApp((s) => s.hud.heading);
  const bearing = useApp((s) => s.hud.nextBearing);
  const distance = useApp((s) => s.hud.nextDistance);
  const pings = useApp((s) => s.combat.pings);
  const english = useApp((s) => activeSettings(s).locale === 'en');
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
        {bearing !== null ? (
          <span
            className={Math.abs(bearing) > COMPASS_SPAN ? 'compass-anchor edge' : 'compass-anchor'}
            style={{ left: `${50 + clampBearing(bearing) * PERCENT_PER_DEGREE}%` }}
            data-testid="compass-anchor"
          />
        ) : null}
        {pings.map((ping, index) => (
          <span
            key={index}
            className={Math.abs(ping) > COMPASS_SPAN ? 'compass-ping edge' : 'compass-ping'}
            style={{ left: `${50 + clampBearing(ping) * PERCENT_PER_DEGREE}%` }}
            data-testid="compass-ping"
          />
        ))}
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

/* ---- combat ---------------------------------------------------------------------------------- */

/** Top-left: who is left and how the player is doing. */
function MatchStatus() {
  const t = useT();
  const mode = useApp((s) => s.mode);
  const alive = useApp((s) => s.combat.aliveCount);
  const total = useApp((s) => s.combat.totalCount);
  const eliminations = useApp((s) => s.combat.eliminations);
  return (
    <div className="panel hud-status" data-testid="hud-status">
      {mode === 'skirmish' ? (
        <div className="status-cell">
          <span className="hud-label">{t('hud.alive')}</span>
          <span className="status-value">
            <strong data-testid="alive-count">{alive}</strong>/{total}
          </span>
        </div>
      ) : (
        <div className="status-cell">
          <span className="hud-label">{t('mode.range.tag')}</span>
          <span className="status-name">{t('mode.range.name')}</span>
        </div>
      )}
      <div className="status-cell">
        <span className="hud-label">{t('hud.eliminations')}</span>
        <span className="status-value">
          <strong data-testid="eliminations">{eliminations}</strong>
        </span>
      </div>
    </div>
  );
}

/** Bottom-left: shield over health, as the simulation reports them. */
function Vitals() {
  const t = useT();
  const health = useApp((s) => s.combat.health);
  const maxHealth = useApp((s) => s.combat.maxHealth);
  const shield = useApp((s) => s.combat.shield);
  const maxShield = useApp((s) => s.combat.maxShield);
  const low = health <= maxHealth * 0.3;
  return (
    <div className="panel hud-vitals" data-testid="hud-vitals">
      <div className="vital">
        <span className="hud-label">{t('hud.shield')}</span>
        <div className="bar" role="meter" aria-label={t('hud.shield')} aria-valuemin={0} aria-valuemax={maxShield} aria-valuenow={shield}>
          <span className="bar-fill bar-shield" style={{ width: `${maxShield > 0 ? (shield / maxShield) * 100 : 0}%` }} />
        </div>
        <strong className="vital-value" data-testid="shield">
          {shield}
        </strong>
      </div>
      <div className="vital">
        <span className="hud-label">{t('hud.health')}</span>
        <div className="bar" role="meter" aria-label={t('hud.health')} aria-valuemin={0} aria-valuemax={maxHealth} aria-valuenow={health}>
          <span className={low ? 'bar-fill bar-health low' : 'bar-fill bar-health'} style={{ width: `${maxHealth > 0 ? (health / maxHealth) * 100 : 0}%` }} />
        </div>
        <strong className="vital-value" data-testid="health">
          {health}
        </strong>
      </div>
    </div>
  );
}

/** Bottom-right: the weapon in hand, its ammunition and the five inventory slots. */
function WeaponPanel() {
  const game = useGame();
  const t = useT();
  const locale = useLocale();
  const slots = useApp((s) => s.combat.slots);
  const active = useApp((s) => s.combat.active);
  const weaponId = useApp((s) => s.combat.weaponId);
  const ammoInMag = useApp((s) => s.combat.ammoInMag);
  const reserve = useApp((s) => s.combat.reserve);
  const bindings = useApp((s) => activeSettings(s).controls.bindings);
  const touch = useApp((s) => s.touch);
  const held = slots[active];
  const heldName = held && held.id ? t(itemKey(held.kind, held.id)) : t('hud.empty');
  const keys = [bindings.slot1, bindings.slot2, bindings.slot3, bindings.slot4, bindings.slot5];
  return (
    <div className="hud-weapon" data-testid="hud-weapon">
      <div className="panel weapon-readout">
        <span className="weapon-name" data-testid="weapon-name">
          {heldName}
        </span>
        {weaponId !== null ? (
          <span className={ammoInMag === 0 ? 'ammo empty' : 'ammo'}>
            <strong data-testid="ammo-mag">{ammoInMag}</strong>
            <span className="ammo-reserve">
              / <span data-testid="ammo-reserve">{reserve}</span>
            </span>
          </span>
        ) : held && held.kind === 'consumable' ? (
          <span className="ammo">
            <strong data-testid="stack-count">× {held.count}</strong>
          </span>
        ) : null}
      </div>
      <div className="slots" role="group" aria-label={t('hud.inventory')}>
        {slots.map((slot, index) => (
          <button
            key={index}
            type="button"
            className={`slot${index === active ? ' on' : ''}${slot.kind === 'empty' ? ' empty' : ''}`}
            aria-label={`${t('hud.slot', { n: index + 1 })}: ${slot.id ? t(itemKey(slot.kind, slot.id)) : t('hud.empty')}`}
            aria-pressed={index === active}
            // The slots only take pointer input on touch screens; with a mouse they are a display.
            tabIndex={-1}
            disabled={slot.kind === 'empty'}
            onClick={() => game.selectSlot(index)}
            data-testid={`slot-${index}`}
            data-item={slot.id ?? ''}
            data-active={index === active}
          >
            {!touch ? <span className="slot-key">{keyLabel(keys[index]?.[0] ?? '', locale)}</span> : null}
            <ItemIcon id={slot.id} className="slot-icon" />
            {slot.kind !== 'empty' ? <span className="slot-count">{slot.count}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The crosshair opens with the weapon's real spread, and flashes only on confirmed hits. */
function Crosshair() {
  const enabled = useApp((s) => s.combat.enabled);
  const weaponId = useApp((s) => s.combat.weaponId);
  const spread = useApp((s) => s.combat.spread);
  const scope = useApp((s) => s.combat.scope);
  const hit = useApp((s) => s.hitMarker);
  if (!enabled || weaponId === null) return <div className="crosshair" aria-hidden="true" />;
  // Half-gap in % of the view height, never fully closed so the centre stays visible.
  const gap = `${Math.max(0.45, spread).toFixed(2)}vh`;
  return (
    <div className={scope ? 'reticle scoped' : 'reticle'} style={{ '--gap': gap } as React.CSSProperties} aria-hidden="true" data-testid="reticle">
      <span className="reticle-dot" />
      <span className="reticle-tick top" />
      <span className="reticle-tick bottom" />
      <span className="reticle-tick left" />
      <span className="reticle-tick right" />
      {hit ? <span key={hit.id} className={`hit-marker hit-${hit.kind}`} data-testid="hit-marker" data-kind={hit.kind} /> : null}
    </div>
  );
}

function ActionProgress() {
  const t = useT();
  const reload = useApp((s) => s.combat.reload);
  const use = useApp((s) => s.combat.use);
  const useItemId = useApp((s) => s.combat.useItemId);
  const value = reload >= 0 ? reload : use;
  if (value < 0) return null;
  const label = reload >= 0 ? t('hud.reloading') : t('hud.using', { item: useItemId ? t(`item.${useItemId}`) : '' });
  return (
    <div className="action-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} data-testid="action-progress">
      <span className="action-label">{label}</span>
      <span className="action-track">
        <span className="action-fill" style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
    </div>
  );
}

function PickupPrompt() {
  const game = useGame();
  const t = useT();
  const locale = useLocale();
  const pickup = useApp((s) => s.combat.pickup);
  const touch = useApp((s) => s.touch);
  const key = useApp((s) => activeSettings(s).controls.bindings.interact[0] ?? '');
  if (!pickup) return null;
  const name = t(itemKey(pickup.kind, pickup.defId));
  const text = t(pickup.swap ? 'hud.swap' : 'hud.pickup', { item: pickup.kind === 'weapon' || pickup.count <= 1 ? name : `${name} × ${pickup.count}` });
  if (touch) {
    const tap = (pressed: boolean) => () => game.setTouchButton('interact', pressed);
    return (
      <button type="button" className="pickup-prompt touch" onPointerDown={tap(true)} onPointerUp={tap(false)} onPointerCancel={tap(false)} data-testid="pickup-prompt">
        {text}
      </button>
    );
  }
  return (
    <div className="pickup-prompt" data-testid="pickup-prompt">
      <kbd>{keyLabel(key, locale)}</kbd>
      <span>{text}</span>
    </div>
  );
}

/** Who is under the crosshair. Opponents are always labelled as bots; only dummies show bars. */
function TargetInfo() {
  const t = useT();
  const target = useApp((s) => s.combat.target);
  if (!target) return null;
  return (
    <div className="target-info" data-testid="target-info">
      <div className="target-line">
        <span className={target.dummy ? 'tag tag-dummy' : 'tag tag-bot'}>{t(target.dummy ? 'hud.dummy' : 'hud.bot')}</span>
        <span className="target-name" data-testid="target-name">
          {target.name}
        </span>
        <span className="target-distance">{t('hud.distance', { m: target.distance })}</span>
      </div>
      {target.showBars ? (
        <div className="target-bars">
          <span className="bar bar-thin">
            <span className="bar-fill bar-shield" style={{ width: `${target.maxShield > 0 ? (target.shield / target.maxShield) * 100 : 0}%` }} />
          </span>
          <span className="bar bar-thin">
            <span className="bar-fill bar-health" style={{ width: `${target.maxHealth > 0 ? (target.health / target.maxHealth) * 100 : 0}%` }} />
          </span>
          <span className="target-numbers">
            <span data-testid="target-shield">{target.shield}</span> · <span data-testid="target-health">{target.health}</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function KillFeed() {
  const t = useT();
  const feed = useApp((s) => s.feed);
  if (feed.length === 0) return null;
  const who = (name: string, bot: boolean, own: boolean) => (
    <span className={own ? 'feed-name own' : 'feed-name'}>
      {own ? t('feed.you') : name}
      {bot ? <span className="tag tag-bot">{t('hud.bot')}</span> : null}
    </span>
  );
  return (
    <ul className="feed" data-testid="feed" aria-live="polite">
      {feed.map((entry) => (
        <li key={entry.id} className={entry.own ? `feed-entry own-${entry.own}` : 'feed-entry'}>
          {entry.killer !== null ? (
            <>
              {who(entry.killer, entry.killerBot, entry.own === 'killer')}
              {entry.weaponId ? <ItemIcon id={entry.weaponId} className={entry.headshot ? 'feed-icon head' : 'feed-icon'} /> : <span className="feed-verb">{t('feed.eliminated')}</span>}
              {who(entry.victim, entry.victimBot, entry.own === 'victim')}
            </>
          ) : (
            <>
              {who(entry.victim, entry.victimBot, entry.own === 'victim')}
              <span className="feed-verb">{t('feed.fell')}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function DamageArcs() {
  const arcs = useApp((s) => s.damageArcs);
  if (arcs.length === 0) return null;
  return (
    <div className="damage-arcs" aria-hidden="true">
      {arcs.map((arc) => (
        <span key={arc.id} className="damage-arc" style={{ transform: `rotate(${arc.bearing}deg)` }} data-testid="damage-arc" />
      ))}
    </div>
  );
}

function DamageNumbers() {
  const numbers = useApp((s) => s.damageNumbers);
  if (numbers.length === 0) return null;
  return (
    <div className="damage-numbers" aria-hidden="true">
      {numbers.map((entry) => (
        <span key={entry.id} className={`damage-number dmg-${entry.kind}`} style={{ left: `${entry.x * 100}%`, top: `${entry.y * 100}%` }} data-testid="damage-number">
          {entry.amount}
        </span>
      ))}
    </div>
  );
}

function Countdown() {
  const t = useT();
  const countdown = useApp((s) => s.combat.countdown);
  const phase = useApp((s) => s.combat.phase);
  if (phase !== 'warmup' || countdown <= 0) return null;
  return (
    <div className="countdown" data-testid="countdown" role="timer">
      <span className="countdown-label">{t('hud.countdown')}</span>
      <strong key={countdown}>{countdown}</strong>
    </div>
  );
}

function BannerView() {
  const banner = useApp((s) => s.banner);
  if (!banner) return null;
  return (
    <div key={banner.id} className={`banner banner-${banner.kind}`} role="status" data-testid="banner" data-kind={banner.kind}>
      {banner.text}
    </div>
  );
}

export function Hud() {
  const t = useT();
  const mode = useApp((s) => s.mode);
  const combat = useApp((s) => s.combat.enabled);
  const alive = useApp((s) => s.combat.alive);
  const scope = useApp((s) => s.combat.scope);
  const hurtPulse = useApp((s) => s.hurtPulse);
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
    <div className={`hud${touch ? ' hud-touch' : ''}${combat ? ' hud-combat' : ''}`} data-testid="hud" data-mode={mode}>
      {combat && scope ? <div className="scope-overlay" aria-hidden="true" /> : null}
      {combat && hurtPulse > 0 ? <div key={hurtPulse} className="hurt-flash" aria-hidden="true" /> : null}
      <Compass />
      {mode === 'course' ? <CourseCard /> : null}
      {combat ? <MatchStatus /> : null}
      {showFps ? (
        <div className="panel hud-fps" data-testid="fps">
          <strong>{fps}</strong> {t('hud.fps')} · {frameMs} ms
        </div>
      ) : null}
      {combat ? <KillFeed /> : null}
      {combat ? <TargetInfo /> : null}
      {!combat || alive ? <Crosshair /> : null}
      {combat ? <DamageArcs /> : null}
      {combat ? <DamageNumbers /> : null}
      {combat && alive ? <ActionProgress /> : null}
      {combat && alive ? <PickupPrompt /> : null}
      {combat ? <Vitals /> : <MoveChip />}
      {combat ? <WeaponPanel /> : null}
      {mode === 'course' ? <Hint /> : null}
      {mode === 'range' && showHelp ? (
        <div className="hud-hint" data-testid="hint">
          <div className="hint-text">{t('hud.rangeHint')}</div>
        </div>
      ) : null}
      {combat ? <Countdown /> : null}
      <BannerView />
      {toast ? (
        <div key={toast.id} className="toast" role="status" data-testid="toast">
          {toast.text}
        </div>
      ) : null}
      {touch && playing ? <TouchControls combat={combat} /> : null}
      {showHelp && !touch ? (
        <div className="panel hud-help">
          <h3 className="section-title">{t('hud.help')}</h3>
          <ControlsList combat={combat} />
        </div>
      ) : null}
      {playing && lookMode === 'drag' && !touch ? <div className="hud-notice">{t('play.dragLook')}</div> : null}
      {contextLost ? <div className="hud-notice warn">{t('hud.contextLost')}</div> : null}
    </div>
  );
}
