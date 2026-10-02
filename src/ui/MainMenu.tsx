import { useState } from 'react';
import { session } from '@/app/GameSession';
import { HelpPanel } from './HelpPanel';
import { GameButton, MenuBackdrop } from './kit';
import { SettingsPanel } from './SettingsPanel';

/**
 * Menú principal. Sólo muestra opciones que funcionan de verdad (perfil y
 * tienda llegan con la progresión, Phase 6).
 */
export function MainMenu() {
  const [panel, setPanel] = useState<'none' | 'settings' | 'help'>('none');
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-8 p-4">
      <MenuBackdrop />
      <h1 className="text-outline animate-pop relative text-center text-6xl font-black tracking-tight sm:text-8xl">
        Minigolf <span className="text-sun">Party</span>
      </h1>
      <div className="relative flex w-full max-w-xs flex-col gap-3">
        <GameButton className="py-4 text-2xl" onClick={() => void session.quickPlay()}>
          ⚡ Partida rápida
        </GameButton>
        <GameButton variant="secondary" className="text-lg" onClick={() => session.openPrivateRoomScreen()}>
          🔒 Sala privada
        </GameButton>
        <GameButton variant="secondary" onClick={() => session.openLocalLobby()}>
          ⛳ Práctica local
        </GameButton>
        <p className="text-outline -mt-1 text-center text-xs font-bold">Online hasta 20 jugadores · Práctica sin conexión con bots opcionales</p>
        <GameButton variant="secondary" onClick={() => setPanel('settings')}>
          ⚙ Ajustes
        </GameButton>
        <GameButton variant="secondary" onClick={() => setPanel('help')}>
          ❓ Cómo se juega
        </GameButton>
      </div>
      <p className="text-outline relative text-xs font-bold opacity-80">Física real · {navigator.maxTouchPoints > 0 ? 'táctil' : 'ratón y teclado'}</p>
      {panel === 'settings' && <SettingsPanel onClose={() => setPanel('none')} />}
      {panel === 'help' && <HelpPanel onClose={() => setPanel('none')} />}
    </div>
  );
}
