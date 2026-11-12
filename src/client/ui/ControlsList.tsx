import type { InputAction } from '../../core/meta/settings.js';
import { activeSettings } from '../app/appState.js';
import { keyLabel } from '../app/i18n.js';
import { useApp, useLocale, useT } from './hooks.js';

interface Row {
  label: string;
  actions: readonly InputAction[];
}

const MOVEMENT_ROWS: readonly Row[] = [
  { label: 'controls.move', actions: ['moveForward', 'moveLeft', 'moveBack', 'moveRight'] },
  { label: 'controls.jump', actions: ['jump'] },
  { label: 'controls.sprint', actions: ['sprint'] },
  { label: 'controls.crouch', actions: ['crouch'] },
];

const COMBAT_ROWS: readonly Row[] = [
  { label: 'controls.fire', actions: ['fire'] },
  { label: 'controls.aim', actions: ['aim'] },
  { label: 'controls.reload', actions: ['reload'] },
  { label: 'controls.interact', actions: ['interact'] },
];

const SYSTEM_ROWS: readonly Row[] = [
  { label: 'controls.pause', actions: ['pause'] },
  { label: 'controls.help', actions: ['help'] },
];

/** Key reference generated from the live bindings, so it can never disagree with the input. */
export function ControlsList({ combat = false }: { combat?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const bindings = useApp((s) => activeSettings(s).controls.bindings);
  const rows: Row[] = [...MOVEMENT_ROWS];
  if (combat) rows.push(...COMBAT_ROWS);
  else rows.push({ label: 'controls.restart', actions: ['restart'] });
  rows.push(...SYSTEM_ROWS);
  return (
    <ul className="controls-list">
      <li>
        <span>{t('controls.look')}</span>
        <span className="keys">
          <kbd>{t('controls.mouse')}</kbd>
          <kbd>← ↑ ↓ →</kbd>
        </span>
      </li>
      {rows.map((row) => (
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
      {combat ? (
        <li>
          <span>{t('controls.slots')}</span>
          <span className="keys">
            <kbd>
              {keyLabel(bindings.slot1[0] ?? '', locale)}–{keyLabel(bindings.slot5[0] ?? '', locale)}
            </kbd>
            <kbd>{t('controls.wheel')}</kbd>
          </span>
        </li>
      ) : null}
      <li className="controls-tip">{t(combat ? 'controls.combatTip' : 'controls.slideTip')}</li>
    </ul>
  );
}
