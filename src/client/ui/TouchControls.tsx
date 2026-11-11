import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { InputAction } from '../../core/meta/settings.js';
import { useGame, useT } from './hooks.js';

/**
 * On-screen buttons for touch screens. They press the same input actions as the keyboard, so
 * the simulation cannot tell the difference. Movement and camera use the screen itself (stick
 * on the left, drag elsewhere) and are handled by the InputManager.
 */
export function TouchControls() {
  const game = useGame();
  const t = useT();
  const [crouched, setCrouched] = useState(false);

  const hold = (action: InputAction) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      game.setTouchButton(action, true);
    },
    onPointerUp: () => game.setTouchButton(action, false),
    onPointerCancel: () => game.setTouchButton(action, false),
  });

  const toggleCrouch = (): void => {
    const next = !crouched;
    setCrouched(next);
    game.setTouchButton('crouch', next);
  };

  return (
    <div className="touch-controls">
      <button type="button" className="touch-btn touch-pause" aria-label={t('touch.pause')} onClick={() => game.togglePause()} data-testid="touch-pause">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="5" width="4" height="14" />
          <rect x="14" y="5" width="4" height="14" />
        </svg>
      </button>
      <button type="button" className={crouched ? 'touch-btn touch-crouch on' : 'touch-btn touch-crouch'} aria-label={t('touch.crouch')} aria-pressed={crouched} onClick={toggleCrouch} data-testid="touch-crouch">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 8l7 8 7-8" fill="none" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button type="button" className="touch-btn touch-jump" aria-label={t('touch.jump')} {...hold('jump')} data-testid="touch-jump">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 16l7-8 7 8" fill="none" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
