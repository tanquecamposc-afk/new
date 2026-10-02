import { useEffect, useState } from 'react';
import { session } from '@/app/GameSession';
import { GameConfig } from '@/config/game';
import { PhysicsConfig } from '@/config/physics';
import { useGameStore, type LiveRow } from '@/store/gameStore';
import { formatTime } from '@/utils/format';
import { Badge, ColorDot } from './kit';
import { PauseMenu } from './PauseMenu';

const HINTS: Record<string, string> = {
  IDLE: 'Arrastra hacia atrás y suelta para golpear',
  AIMING: 'Suelta para golpear · Esc / 2º dedo para cancelar',
  BALL_MOVING: 'Bola en movimiento…',
};

/** HUD de partida: hoyo, golpes, tiempo, posición, clasificación en vivo, espectador y controles. */
export function Hud() {
  const hud = useGameStore((s) => s.hud);
  const match = useGameStore((s) => s.match);
  const appState = useGameStore((s) => s.appState);
  const [menu, setMenu] = useState(false);
  const canPause = match?.mode === 'local';
  const [touch] = useState(() => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);

  const openMenu = () => {
    setMenu(true);
    if (canPause) session.setPaused(true);
  };
  const closeMenu = () => {
    setMenu(false);
    session.setPaused(false);
  };

  // Esc abre/cierra el menú cuando no se está apuntando.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape' || e.defaultPrevented || useGameStore.getState().hud.aiming) return;
      if (menu) closeMenu();
      else openMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!match) return null;
  const playing = match.phase === 'playing';
  const finished = hud.playerState === 'FINISHED';
  const danger = hud.power >= PhysicsConfig.shot.dangerPower;
  const warn = playing && hud.remainingMs !== null && hud.remainingMs <= GameConfig.timeWarningSec * 1000 && !finished;
  const total = match.live.length;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 select-none"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Barra superior */}
      <div className="flex items-start justify-between gap-2 p-3 sm:p-4">
        <div className="min-w-0 rounded-2xl bg-ink/70 px-3 py-2 backdrop-blur-sm sm:px-4">
          <div className="text-xs font-bold uppercase tracking-wider text-white/70">
            Hoyo {match.holeIndex + 1}/{match.holeCount}
          </div>
          <div className="truncate text-base font-black leading-tight sm:text-xl">{hud.courseName}</div>
          <div className="text-sm font-bold text-sun">Par {hud.par}</div>
        </div>
        <div className="flex shrink-0 gap-1.5 sm:gap-2">
          {total > 1 && <Stat label="Posición" value={`${match.position}º`} sub={`de ${total}`} />}
          <Stat label="Golpes" value={String(hud.shots)} sub={hud.penalties ? `+${hud.penalties} pen.` : undefined} />
          <Stat
            label={warn ? 'Quedan' : 'Tiempo'}
            value={warn ? formatTime(hud.remainingMs!) : formatTime(hud.timeMs)}
            sub={!warn && hud.timeLimitMs !== null ? `límite ${formatTime(hud.timeLimitMs)}` : undefined}
            alert={warn}
          />
        </div>
      </div>

      {/* Botones laterales */}
      <div className="absolute right-3 top-28 flex flex-col gap-2 sm:right-4" style={{ marginRight: 'env(safe-area-inset-right)' }}>
        <IconButton label={canPause ? 'Pausa (Esc)' : 'Menú (Esc)'} onClick={openMenu}>
          ⏸
        </IconButton>
        <IconButton label={hud.overview ? 'Volver a la bola (V)' : 'Vista general (V)'} onClick={() => session.toggleOverview()} active={hud.overview}>
          {hud.overview ? '⛳' : '🗺'}
        </IconButton>
        {touch && (
          <>
            <IconButton label="Girar cámara a la izquierda" onClick={() => session.rotateCamera(0.35)}>
              ⟲
            </IconButton>
            <IconButton label="Girar cámara a la derecha" onClick={() => session.rotateCamera(-0.35)}>
              ⟳
            </IconButton>
          </>
        )}
      </div>

      {/* Clasificación en vivo */}
      {total > 1 && <LiveBoard rows={match.live} remaining={match.playersRemaining} />}

      {/* Mensajes */}
      {hud.lastEvent && (
        <div key={hud.lastEvent.id} className="animate-toast absolute left-1/2 top-24 -translate-x-1/2 whitespace-nowrap">
          <div
            className={`text-outline rounded-2xl px-5 py-2 text-xl font-black sm:text-2xl ${
              hud.lastEvent.tone === 'bad' ? 'bg-danger/90' : hud.lastEvent.tone === 'good' ? 'bg-grass/90' : 'bg-ink/80'
            }`}
          >
            {hud.lastEvent.text}
          </div>
        </div>
      )}
      {hud.holed && appState === 'FINISHED' && hud.result && (
        <div className="animate-pop absolute inset-x-0 top-1/3 text-center">
          <div className="text-outline text-5xl font-black text-sun sm:text-7xl">{hud.result.title}</div>
          {match.playersRemaining > 0 && (
            <div className="text-outline mt-2 text-lg font-bold">
              Esperando a {match.playersRemaining} jugador{match.playersRemaining === 1 ? '' : 'es'}…
            </div>
          )}
        </div>
      )}

      {/* Espectador */}
      {match.spectate && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center px-3">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-ink/85 p-2 shadow-xl">
            <button className="rounded-xl bg-white/10 px-3 py-2 text-xl font-black" onClick={() => session.spectateNext(-1)} aria-label="Jugador anterior">
              ◀
            </button>
            <div className="min-w-40 px-2 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">Observando</div>
              <div className="flex items-center justify-center gap-2 font-black">
                <ColorDot color={match.spectate.color} size={12} />
                <span className="max-w-[10rem] truncate">{match.spectate.name}</span>
              </div>
              <div className="text-xs font-bold text-white/70">
                {match.spectate.strokes} golpes · {match.spectate.position}º
              </div>
            </div>
            <button className="rounded-xl bg-white/10 px-3 py-2 text-xl font-black" onClick={() => session.spectateNext(1)} aria-label="Jugador siguiente">
              ▶
            </button>
          </div>
        </div>
      )}

      {/* Indicador de potencia */}
      {hud.aiming && (
        <div className="absolute bottom-24 left-1/2 w-64 -translate-x-1/2 sm:bottom-20">
          <div className="text-outline mb-1 text-center text-sm font-black uppercase tracking-wider">Potencia {Math.round(hud.power * 100)}%</div>
          <div className="relative h-4 overflow-hidden rounded-full border-2 border-white bg-ink/60">
            <div className={`h-full transition-colors ${danger ? 'bg-danger' : 'bg-white'}`} style={{ width: `${hud.power * 100}%` }} />
            <div className="absolute inset-y-0 w-0.5 bg-danger" style={{ left: `${PhysicsConfig.shot.dangerPower * 100}%` }} />
          </div>
        </div>
      )}

      {/* Pista + reinicio */}
      {playing && !finished && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:p-4">
          <p className="text-outline max-w-[60%] text-sm font-bold sm:text-base">{HINTS[hud.playerState] ?? ''}</p>
          <button
            onClick={() => session.resetBall()}
            className="pointer-events-auto rounded-2xl bg-white/90 px-4 py-3 text-base font-black text-ink shadow-[0_4px_0_#9aa7c0] active:translate-y-1 active:shadow-none"
            title="Volver a la última posición (R)"
          >
            ↺ Reiniciar bola
          </button>
        </div>
      )}

      {menu && <PauseMenu onClose={closeMenu} canPause={canPause} />}
      {match.paused && !menu && <div className="absolute inset-0 bg-ink/40" />}
    </div>
  );
}

function LiveBoard({ rows, remaining }: { rows: LiveRow[]; remaining: number }) {
  const me = rows.find((r) => r.isLocal);
  const top = rows.slice(0, 5);
  const shown = me && !top.includes(me) ? [...top.slice(0, 4), me] : top;
  return (
    <div className="absolute left-3 top-32 hidden w-56 rounded-2xl bg-ink/70 p-2 text-sm backdrop-blur-sm sm:left-4 sm:block">
      <div className="mb-1 flex justify-between px-1 text-[10px] font-bold uppercase tracking-widest text-white/60">
        <span>Clasificación</span>
        <span>{remaining} en juego</span>
      </div>
      {shown.map((r) => (
        <div key={r.id} className={`flex items-center gap-2 rounded-lg px-1.5 py-0.5 ${r.isLocal ? 'bg-white/15 font-black' : 'font-bold'}`}>
          <span className="w-5 text-right tabular-nums text-white/70">{r.position}</span>
          <ColorDot color={r.color} size={10} />
          <span className="flex-1 truncate">{r.name}</span>
          {r.isBot && <Badge tone="bot">Bot</Badge>}
          <span className="tabular-nums">{r.strokes}</span>
          <span className="w-4 text-center">{r.finished ? (r.completed ? '✓' : '✗') : ''}</span>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className={`min-w-14 rounded-2xl px-2 py-2 text-center backdrop-blur-sm sm:min-w-20 sm:px-4 ${alert ? 'animate-pulse bg-danger/90' : 'bg-ink/70'}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/70 sm:text-xs">{label}</div>
      <div className="text-xl font-black tabular-nums leading-tight sm:text-2xl">{value}</div>
      {sub && <div className={`hidden text-[10px] font-bold sm:block sm:text-xs ${alert ? '' : 'text-white/60'}`}>{sub}</div>}
    </div>
  );
}

function IconButton({ label, onClick, children, active }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-none ${active ? 'bg-sun text-ink' : 'bg-ink/75 text-white'}`}
    >
      {children}
    </button>
  );
}
