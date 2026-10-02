import { useState } from 'react';
import { session } from '@/app/GameSession';
import { useProfile } from '@/profile/profileStore';
import { levelFromXp } from '@/progression/levels';
import { BallSwatch } from './BallSwatch';
import { CosmeticsScreen } from './CosmeticsScreen';
import { HelpPanel } from './HelpPanel';
import { ProfileScreen } from './ProfileScreen';
import { GameButton, MenuBackdrop } from './kit';
import { SettingsPanel } from './SettingsPanel';

/** Menú principal: juego online y local, perfil, tienda, inventario, ajustes y ayuda. */
export function MainMenu() {
  const [panel, setPanel] = useState<'none' | 'settings' | 'help' | 'profile' | 'shop' | 'inventory'>('none');
  const profile = useProfile((s) => s.profile);
  const lvl = levelFromXp(profile.xp);
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
        <div className="grid grid-cols-3 gap-2">
          <GameButton variant="secondary" className="px-2 text-sm" onClick={() => setPanel('profile')}>
            👤 Perfil
          </GameButton>
          <GameButton variant="secondary" className="px-2 text-sm" onClick={() => setPanel('shop')}>
            🛒 Tienda
          </GameButton>
          <GameButton variant="secondary" className="px-2 text-sm" onClick={() => setPanel('inventory')}>
            🎒 Bolas
          </GameButton>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <GameButton variant="ghost" className="px-2 text-sm" onClick={() => setPanel('settings')}>
            ⚙ Ajustes
          </GameButton>
          <GameButton variant="ghost" className="px-2 text-sm" onClick={() => setPanel('help')}>
            ❓ Ayuda
          </GameButton>
        </div>
      </div>
      <button
        onClick={() => setPanel('profile')}
        className="pointer-events-auto absolute right-3 top-3 flex items-center gap-2 rounded-2xl bg-ink/75 px-3 py-2 font-black"
        aria-label="Abrir perfil"
      >
        <BallSwatch equipped={profile.equipped} size={28} />
        <span className="max-w-[8rem] truncate">{profile.username}</span>
        <span className="rounded-lg bg-sun px-1.5 text-sm text-ink">Nv {lvl.level}</span>
        <span className="text-sun">🪙 {profile.coins}</span>
      </button>
      <p className="text-outline relative text-xs font-bold opacity-80">Física real · {navigator.maxTouchPoints > 0 ? 'táctil' : 'ratón y teclado'}</p>
      {panel === 'settings' && <SettingsPanel onClose={() => setPanel('none')} />}
      {panel === 'help' && <HelpPanel onClose={() => setPanel('none')} />}
      {panel === 'profile' && <ProfileScreen onClose={() => setPanel('none')} onOpen={(p) => setPanel(p)} />}
      {(panel === 'shop' || panel === 'inventory') && (
        <CosmeticsScreen mode={panel} onClose={() => setPanel('none')} onSwitch={() => setPanel(panel === 'shop' ? 'inventory' : 'shop')} />
      )}
    </div>
  );
}
