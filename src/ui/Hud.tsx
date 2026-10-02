import { useState } from 'react';
import { GameConfig } from '@/config/game';
import { PhysicsConfig } from '@/config/physics';
import { useGameStore } from '@/store/gameStore';
import { formatTime } from '@/utils/format';
import { HoleResultPanel } from './HoleResultPanel';
import { SettingsPanel } from './SettingsPanel';

interface Props {
  onReset: () => void;
  onReplay: () => void;
  onToggleOverview: () => void;
}

const HINTS: Record<string, string> = {
  IDLE: 'Arrastra hacia atrás y suelta para golpear',
  AIMING: 'Suelta para golpear · Esc / 2º dedo para cancelar',
  BALL_MOVING: 'Bola en movimiento…',
};

export function Hud({ onReset, onReplay, onToggleOverview }: Props) {
  const hud = useGameStore((s) => s.hud);
  const [settings, setSettings] = useState(false);
  const danger = hud.power >= PhysicsConfig.shot.dangerPower;
  const warn = hud.remainingMs !== null && hud.remainingMs <= GameConfig.timeWarningSec * 1000 && !hud.holed;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      {/* Barra superior: hoyo, golpes y tiempo */}
      <div className="flex items-start justify-between gap-2 p-3 sm:p-4">
        <div className="rounded-2xl bg-ink/70 px-4 py-2 backdrop-blur-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-white/70">Hoyo</div>
          <div className="text-lg font-black leading-tight sm:text-xl">{hud.courseName}</div>
          <div className="text-sm font-bold text-sun">Par {hud.par}</div>
        </div>
        <div className="flex gap-2">
          <Stat label="Golpes" value={String(hud.shots)} sub={hud.penalties ? `+${hud.penalties} pen.` : undefined} />
          <Stat
            label={warn ? 'Quedan' : 'Tiempo'}
            value={warn ? formatTime(hud.remainingMs!) : formatTime(hud.timeMs)}
            sub={!warn && hud.remainingMs !== null ? `límite ${formatTime(GameConfig.holeTimeLimitSec! * 1000)}` : undefined}
            alert={warn}
          />
        </div>
      </div>

      {/* Botones laterales */}
      <div className="absolute right-3 top-28 flex flex-col gap-2 sm:right-4">
        <IconButton label="Ajustes" onClick={() => setSettings(true)}>
          ⚙
        </IconButton>
        <IconButton label={hud.overview ? 'Volver a la bola (V)' : 'Vista general (V)'} onClick={onToggleOverview} active={hud.overview}>
          {hud.overview ? '⛳' : '🗺'}
        </IconButton>
      </div>

      {/* Mensajes de evento */}
      {hud.lastEvent && !hud.result && (
        <div key={hud.lastEvent.id} className="animate-toast absolute left-1/2 top-24 -translate-x-1/2 whitespace-nowrap">
          <div className={`text-outline rounded-2xl px-5 py-2 text-2xl font-black ${hud.lastEvent.tone === 'bad' ? 'bg-danger/90' : 'bg-grass/90'}`}>
            {hud.lastEvent.text}
          </div>
        </div>
      )}
      {hud.holed && !hud.result && (
        <div className="text-outline animate-pop absolute inset-x-0 top-1/3 text-center text-5xl font-black text-sun sm:text-7xl">¡DENTRO!</div>
      )}

      {/* Indicador de potencia */}
      {hud.aiming && (
        <div className="absolute bottom-24 left-1/2 w-64 -translate-x-1/2 sm:bottom-20">
          <div className="text-outline mb-1 text-center text-sm font-black uppercase tracking-wider">
            Potencia {Math.round(hud.power * 100)}%
          </div>
          <div className="relative h-4 overflow-hidden rounded-full border-2 border-white bg-ink/60">
            <div className={`h-full transition-colors ${danger ? 'bg-danger' : 'bg-white'}`} style={{ width: `${hud.power * 100}%` }} />
            <div className="absolute inset-y-0 w-0.5 bg-danger" style={{ left: `${PhysicsConfig.shot.dangerPower * 100}%` }} />
          </div>
        </div>
      )}

      {/* Pista + botón de reinicio */}
      {!hud.holed && hud.playerState !== 'FINISHED' && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:p-4">
          <p className="text-outline max-w-[60%] text-sm font-bold sm:text-base">{HINTS[hud.playerState] ?? ''}</p>
          <button
            onClick={onReset}
            className="pointer-events-auto rounded-2xl bg-white/90 px-4 py-3 text-base font-black text-ink shadow-[0_4px_0_#9aa7c0] active:translate-y-1 active:shadow-none"
            title="Volver a la última posición (R)"
          >
            ↺ Reiniciar bola
          </button>
        </div>
      )}

      {hud.result && <HoleResultPanel result={hud.result} onReplay={onReplay} />}
      {settings && <SettingsPanel onClose={() => setSettings(false)} />}
    </div>
  );
}

function Stat({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className={`min-w-20 rounded-2xl px-4 py-2 text-center backdrop-blur-sm ${alert ? 'animate-pulse bg-danger/90' : 'bg-ink/70'}`}>
      <div className="text-xs font-bold uppercase tracking-wider text-white/70">{label}</div>
      <div className="text-2xl font-black tabular-nums leading-tight">{value}</div>
      {sub && <div className={`text-xs font-bold ${alert ? '' : 'text-white/60'}`}>{sub}</div>}
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
