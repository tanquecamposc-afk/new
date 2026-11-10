import type { InputAction } from '../../core/meta/settings.js';
import { activeSettings } from '../app/appState.js';
import { keyLabel } from '../app/i18n.js';
import { useApp, useLocale, useT } from './hooks.js';

const ROWS: ReadonlyArray<{ label: string; actions: readonly InputAction[] }> = [
  { label: 'controls.move', actions: ['moveForward', 'moveLeft', 'moveBack', 'moveRight'] },
  { label: 'controls.jump', actions: ['jump'] },
  { label: 'controls.sprint', actions: ['sprint'] },
  { label: 'controls.crouch', actions: ['crouch'] },
  { label: 'controls.pause', actions: ['pause'] },
  { label: 'controls.restart', actions: ['restart'] },
  { label: 'controls.help', actions: ['help'] },
];

/** Key reference generated from the live bindings, so it can never disagree with the input. */
export function ControlsList() {
  const t = useT();
  const locale = useLocale();
  const bindings = useApp((s) => activeSettings(s).controls.bindings);
  return (
    <ul className="controls-list">
      <li>
        <span>{t('controls.look')}</span>
        <span className="keys">
          <kbd>{t('controls.mouse')}</kbd>
          <kbd>← ↑ ↓ →</kbd>
        </span>
      </li>
      {ROWS.map((row) => (
        <li key={row.label}>
          <span>{t(row.label)}</span>
          <span className="keys">
            {row.actions.map((action) => (
              <kbd key={action}>{keyLabel(bindings[action][0] ?? '', locale)}</kbd>
            ))}
            {row.actions.length === 1 && row.actions[0] === 'pause' ? <kbd>Esc</kbd> : null}
          </span>
        </li>
      ))}
      <li className="controls-tip">{t('controls.slideTip')}</li>
    </ul>
  );
}
