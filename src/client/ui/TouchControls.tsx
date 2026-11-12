import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { InputAction } from '../../core/meta/settings.js';
import { useGame, useT } from './hooks.js';

/**
 * On-screen buttons for touch screens. They press the same input actions as the keyboard, so
 * the simulation cannot tell the difference. Movement and camera use the screen itself (stick
 * on the left, drag elsewhere) and are handled by the InputManager.
 */
export function TouchControls({ combat = false }: { combat?: boolean }) {
  const game = useGame();
  const t = useT();
  const [crouched, setCrouched] = useState(false);
  const [aiming, setAiming] = useState(false);

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

  const toggleAim = (): void => {
    const next = !aiming;
    setAiming(next);
    game.setTouchButton('aim', next);
  };

  return (
    <div className={combat ? 'touch-controls combat' : 'touch-controls'}>
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
      {combat ? (
        <>
          <button type="button" className="touch-btn touch-fire" aria-label={t('touch.fire')} {...hold('fire')} data-testid="touch-fire">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="6.5" fill="none" strokeWidth="2.6" />
              <circle cx="12" cy="12" r="1.8" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" fill="none" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" className={aiming ? 'touch-btn touch-aim on' : 'touch-btn touch-aim'} aria-label={t('touch.aim')} aria-pressed={aiming} onClick={toggleAim} data-testid="touch-aim">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="7.5" fill="none" strokeWidth="2.6" />
              <path d="M12 7.5v9M7.5 12h9" fill="none" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" className="touch-btn touch-reload" aria-label={t('touch.reload')} {...hold('reload')} data-testid="touch-reload">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 12a7 7 0 11-2.3-5.2" fill="none" strokeWidth="2.8" strokeLinecap="round" />
              <path d="M19.5 3.5v4.8h-4.8" fill="none" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      ) : null}
    </div>
  );
}
