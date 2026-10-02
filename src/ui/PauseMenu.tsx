import { useState } from 'react';
import { session } from '@/app/GameSession';
import { HelpPanel } from './HelpPanel';
import { GameButton, Panel } from './kit';
import { SettingsPanel } from './SettingsPanel';

/** Menú de pausa. En práctica local congela la partida; en red (Phase 5) el juego sigue. */
export function PauseMenu({ onClose, canPause }: { onClose: () => void; canPause: boolean }) {
  const [panel, setPanel] = useState<'none' | 'settings' | 'help' | 'confirm'>('none');
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-ink/60 p-4">
      <Panel className="animate-pop w-full max-w-xs">
        <h2 className="mb-1 text-center text-3xl font-black">{canPause ? 'Pausa' : 'Menú'}</h2>
        {!canPause && <p className="mb-2 text-center text-xs font-bold text-white/60">La partida sigue en marcha</p>}
        <div className="mt-3 flex flex-col gap-2">
          <GameButton onClick={onClose}>▶ Continuar</GameButton>
          <GameButton variant="secondary" onClick={() => setPanel('settings')}>
            ⚙ Ajustes
          </GameButton>
          <GameButton variant="secondary" onClick={() => setPanel('help')}>
            ❓ Ayuda
          </GameButton>
          {panel === 'confirm' ? (
            <div className="rounded-2xl bg-danger/20 p-2 text-center">
              <p className="mb-2 text-sm font-bold">¿Salir de la partida? Perderás el progreso.</p>
              <div className="flex gap-2">
                <GameButton variant="ghost" className="flex-1" onClick={() => setPanel('none')}>
                  No
                </GameButton>
                <GameButton variant="danger" className="flex-1" onClick={() => session.exitToMenu()}>
                  Salir
                </GameButton>
              </div>
            </div>
          ) : (
            <GameButton variant="danger" onClick={() => setPanel('confirm')}>
              ⏏ Salir al menú
            </GameButton>
          )}
        </div>
      </Panel>
      {panel === 'settings' && <SettingsPanel onClose={() => setPanel('none')} />}
      {panel === 'help' && <HelpPanel onClose={() => setPanel('none')} />}
    </div>
  );
}
