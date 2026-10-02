import { useState } from 'react';
import { session } from '@/app/GameSession';
import { profileService, useProfile } from '@/profile/profileStore';
import { levelFromXp } from '@/progression/levels';
import { formatTime } from '@/utils/format';
import { BallSwatch } from './BallSwatch';
import { GameButton, Panel } from './kit';

const MODE: Record<string, string> = { local: 'Práctica', quick: 'Rápida', private: 'Privada' };

/** Perfil: nombre, nivel, XP, monedas, cosméticos, estadísticas e historial. */
export function ProfileScreen({ onClose, onOpen }: { onClose: () => void; onOpen: (p: 'shop' | 'inventory' | 'settings') => void }) {
  const p = useProfile((s) => s.profile);
  const lvl = levelFromXp(p.xp);
  const [name, setName] = useState(p.username);
  const [nameError, setNameError] = useState<string | null>(null);
  const st = p.stats;
  const avgStrokes = st.holesPlayed ? (st.totalStrokes / st.holesPlayed).toFixed(2) : '–';
  const avgTime = st.holesPlayed ? formatTime(st.totalTimeMs / st.holesPlayed) : '–';
  const save = () => {
    const ok = profileService.setUsername(name);
    if (ok) session.setName(name);
    setNameError(ok ? null : 'Entre 2 y 16 caracteres.');
  };
  return (
    <Overlay onClose={onClose} title="Perfil">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <BallSwatch equipped={p.equipped} size={88} />
        <div className="w-full flex-1">
          <div className="flex gap-2">
            <input
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value)}
              aria-label="Nombre de usuario"
              className="min-w-0 flex-1 rounded-xl border-2 border-white/30 bg-white/10 px-3 py-2 text-lg font-black text-white outline-none focus:border-sun"
            />
            <GameButton variant="secondary" className="px-3 py-2 text-sm" onClick={save} disabled={name === p.username}>
              Guardar
            </GameButton>
          </div>
          {nameError && <p className="mt-1 text-xs font-bold text-danger">{nameError}</p>}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sun text-xl font-black text-ink" title="Nivel">
              {lvl.level}
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs font-bold text-white/70">
                <span>Nivel {lvl.level}</span>
                <span>
                  {lvl.intoLevel} / {lvl.needed} XP
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-grass" style={{ width: `${Math.round(lvl.progress * 100)}%` }} />
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2 text-center">
              <div className="text-lg font-black text-sun" data-testid="coins">
                🪙 {p.coins}
              </div>
            </div>
          </div>
        </div>
      </div>

      <h3 className="mb-2 mt-5 font-black">Estadísticas</h3>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {[
          ['Partidas', st.matches],
          ['Victorias', st.wins],
          ['Podios', st.podiums],
          ['Mejor puntuación', st.bestScore],
          ['Hoyos jugados', st.holesPlayed],
          ['Hoyos completados', st.holesCompleted],
          ['Hoyos en uno', st.holeInOnes],
          ['Golpes por hoyo', avgStrokes],
          ['Tiempo medio por hoyo', avgTime],
          ['XP total', p.xp],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-xl bg-white/5 px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">{k}</div>
            <div className="text-lg font-black tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <h3 className="mb-2 mt-5 font-black">Historial</h3>
      {p.history.length === 0 ? (
        <p className="text-sm font-bold text-white/60">Aún no has terminado ninguna partida.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="text-left">Fecha</th>
              <th>Modo</th>
              <th>Puesto</th>
              <th>Golpes</th>
              <th>Puntos</th>
              <th className="text-right">Ganado</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {p.history.map((h) => (
              <tr key={h.id} className="border-t border-white/10">
                <td className="py-1 text-left">{new Date(h.date).toLocaleDateString()}</td>
                <td className="text-center">{MODE[h.mode]}</td>
                <td className="text-center">
                  {h.position}º/{h.players}
                </td>
                <td className="text-center">{h.strokes}</td>
                <td className="text-center">{h.score}</td>
                <td className="text-right text-xs">
                  +{h.xp} XP · +{h.coins} 🪙
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <GameButton variant="secondary" onClick={() => onOpen('inventory')}>
          🎒 Inventario
        </GameButton>
        <GameButton variant="secondary" onClick={() => onOpen('shop')}>
          🛒 Tienda
        </GameButton>
        <GameButton variant="ghost" onClick={() => onOpen('settings')}>
          ⚙ Preferencias
        </GameButton>
      </div>
    </Overlay>
  );
}

export function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-ink/60 p-3" onClick={onClose}>
      <Panel className="animate-pop max-h-full w-full max-w-3xl overflow-y-auto">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-3xl font-black">{title}</h2>
            <button onClick={onClose} className="rounded-xl bg-white/15 px-3 py-1 text-lg font-black" aria-label="Cerrar">
              ✕
            </button>
          </div>
          {children}
        </div>
      </Panel>
    </div>
  );
}
