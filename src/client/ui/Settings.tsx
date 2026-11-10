import { useState, type ReactNode } from 'react';
import { FPS_LIMITS, LOCALES, QUALITY_PRESETS, SETTING_LIMITS, type GameSettings } from '../../core/meta/settings.js';
import { useApp, useGame, useT } from './hooks.js';

type Tab = 'video' | 'audio' | 'controls' | 'accessibility';
const TABS: readonly Tab[] = ['video', 'audio', 'controls', 'accessibility'];
const LOCALE_NAMES = { 'es-PE': 'Español (Perú)', en: 'English' } as const;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="setting-row">
      <span className="setting-label">{label}</span>
      <div className="setting-control">{children}</div>
    </div>
  );
}

function Slider(props: { label: string; value: number; min: number; max: number; step: number; format: (value: number) => string; onChange: (value: number) => void; testId?: string }) {
  return (
    <Row label={props.label}>
      <input
        type="range"
        aria-label={props.label}
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.currentTarget.value))}
        data-testid={props.testId}
      />
      <output className="setting-value">{props.format(props.value)}</output>
    </Row>
  );
}

function Toggle(props: { label: string; value: boolean; onChange: (value: boolean) => void; on: string; off: string; testId?: string }) {
  return (
    <Row label={props.label}>
      <button type="button" role="switch" aria-checked={props.value} aria-label={props.label} className={props.value ? 'switch on' : 'switch'} onClick={() => props.onChange(!props.value)} data-testid={props.testId}>
        <span className="switch-knob" />
        <span className="switch-text">{props.value ? props.on : props.off}</span>
      </button>
    </Row>
  );
}

function Segmented<T extends string | number>(props: { label: string; value: T; options: ReadonlyArray<{ value: T; label: string }>; onChange: (value: T) => void; testId?: string }) {
  return (
    <Row label={props.label}>
      <div className="segmented" role="radiogroup" aria-label={props.label}>
        {props.options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={option.value === props.value}
            className={option.value === props.value ? 'segment on' : 'segment'}
            onClick={() => props.onChange(option.value)}
            data-testid={props.testId ? `${props.testId}-${option.value}` : undefined}
          >
            {option.label}
          </button>
        ))}
      </div>
    </Row>
  );
}

const percent = (value: number): string => `${Math.round(value * 100)}%`;

export function Settings() {
  const game = useGame();
  const t = useT();
  const draft = useApp((s) => s.draftSettings);
  const [tab, setTab] = useState<Tab>('video');
  if (!draft) return null;

  const edit = (mutate: (settings: GameSettings) => void): void => game.updateDraft(mutate);
  const on = t('settings.on');
  const off = t('settings.off');
  const volume = SETTING_LIMITS.volume;

  return (
    <div className="overlay" data-testid="settings">
      <div className="panel settings" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h2 id="settings-title" className="menu-title">
          {t('settings.title')}
        </h2>
        <div className="tabs" role="tablist">
          {TABS.map((name) => (
            <button key={name} type="button" role="tab" aria-selected={tab === name} className={tab === name ? 'tab on' : 'tab'} onClick={() => setTab(name)} data-testid={`tab-${name}`}>
              {t(`settings.${name}`)}
            </button>
          ))}
        </div>

        <div className="settings-body" role="tabpanel">
          {tab === 'video' ? (
            <>
              <Segmented
                label={t('settings.quality')}
                value={draft.display.qualityPreset}
                options={QUALITY_PRESETS.map((preset) => ({ value: preset, label: t(`settings.quality.${preset}`) }))}
                onChange={(value) => edit((s) => void (s.display.qualityPreset = value))}
                testId="quality"
              />
              <Slider
                label={t('settings.renderScale')}
                value={draft.display.renderScale}
                min={SETTING_LIMITS.renderScale.min}
                max={SETTING_LIMITS.renderScale.max}
                step={0.05}
                format={percent}
                onChange={(value) => edit((s) => void (s.display.renderScale = value))}
              />
              <Segmented
                label={t('settings.maxFps')}
                value={draft.display.maxFps}
                options={FPS_LIMITS.map((limit) => ({ value: limit, label: limit === 0 ? t('settings.maxFps.unlimited') : String(limit) }))}
                onChange={(value) => edit((s) => void (s.display.maxFps = value))}
                testId="maxfps"
              />
              <Slider
                label={t('settings.fov')}
                value={draft.display.fov}
                min={SETTING_LIMITS.fov.min}
                max={SETTING_LIMITS.fov.max}
                step={1}
                format={(value) => `${value}°`}
                onChange={(value) => edit((s) => void (s.display.fov = value))}
                testId="fov"
              />
              <Toggle label={t('settings.showFps')} value={draft.display.showFps} on={on} off={off} onChange={(value) => edit((s) => void (s.display.showFps = value))} testId="show-fps" />
            </>
          ) : null}

          {tab === 'audio' ? (
            <>
              <Slider label={t('settings.master')} value={draft.audio.master} min={volume.min} max={volume.max} step={0.05} format={percent} onChange={(value) => edit((s) => void (s.audio.master = value))} />
              <Slider label={t('settings.sfx')} value={draft.audio.sfx} min={volume.min} max={volume.max} step={0.05} format={percent} onChange={(value) => edit((s) => void (s.audio.sfx = value))} />
              <Slider label={t('settings.ambience')} value={draft.audio.ambience} min={volume.min} max={volume.max} step={0.05} format={percent} onChange={(value) => edit((s) => void (s.audio.ambience = value))} />
              <Slider label={t('settings.ui')} value={draft.audio.ui} min={volume.min} max={volume.max} step={0.05} format={percent} onChange={(value) => edit((s) => void (s.audio.ui = value))} />
            </>
          ) : null}

          {tab === 'controls' ? (
            <>
              <Slider
                label={t('settings.sensitivity')}
                value={draft.controls.mouseSensitivity}
                min={SETTING_LIMITS.mouseSensitivity.min}
                max={SETTING_LIMITS.mouseSensitivity.max}
                step={0.05}
                format={(value) => value.toFixed(2)}
                onChange={(value) => edit((s) => void (s.controls.mouseSensitivity = value))}
                testId="sensitivity"
              />
              <Toggle label={t('settings.invertY')} value={draft.controls.invertY} on={on} off={off} onChange={(value) => edit((s) => void (s.controls.invertY = value))} testId="invert-y" />
              <Toggle label={t('settings.toggleCrouch')} value={draft.controls.toggleCrouch} on={on} off={off} onChange={(value) => edit((s) => void (s.controls.toggleCrouch = value))} />
            </>
          ) : null}

          {tab === 'accessibility' ? (
            <>
              <Segmented
                label={t('settings.language')}
                value={draft.locale}
                options={LOCALES.map((locale) => ({ value: locale, label: LOCALE_NAMES[locale] }))}
                onChange={(value) => edit((s) => void (s.locale = value))}
                testId="locale"
              />
              <Slider
                label={t('settings.uiScale')}
                value={draft.accessibility.uiScale}
                min={SETTING_LIMITS.uiScale.min}
                max={SETTING_LIMITS.uiScale.max}
                step={0.05}
                format={percent}
                onChange={(value) => edit((s) => void (s.accessibility.uiScale = value))}
              />
              <Toggle label={t('settings.reducedMotion')} value={draft.accessibility.reducedMotion} on={on} off={off} onChange={(value) => edit((s) => void (s.accessibility.reducedMotion = value))} />
            </>
          ) : null}
        </div>

        <p className="settings-note">{t('settings.preview')}</p>
        <div className="menu-row">
          <button type="button" className="btn btn-quiet" onClick={() => game.resetDraft()} data-testid="settings-reset">
            {t('settings.reset')}
          </button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={() => game.closeSettings(false)} data-testid="settings-cancel">
            {t('settings.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => game.closeSettings(true)} data-testid="settings-apply">
            {t('settings.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
