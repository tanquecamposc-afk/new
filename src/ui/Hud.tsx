import { PhysicsConfig } from '@/config/physics';
import { useGameStore } from '@/store/gameStore';
import { formatTime } from '@/utils/format';

interface Props {
  onReset: () => void;
  onReplay: () => void;
}

const HINTS: Record<string, string> = {
  IDLE: 'Arrastra hacia atrás y suelta para golpear',
  AIMING: 'Suelta para golpear · Esc / 2º dedo para cancelar',
  SHOOTING: '',
  BALL_MOVING: 'Bola en movimiento…',
  BALL_STOPPED: '',
};

export function Hud({ onReset, onReplay }: Props) {
  const hud = useGameStore((s) => s.hud);
  const danger = hud.power >= PhysicsConfig.shot.dangerPower;

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
          <Stat label="Tiempo" value={formatTime(hud.timeMs)} />
        </div>
      </div>

      {/* Mensajes de evento */}
      {hud.lastEvent && !hud.holed && (
        <div key={hud.lastEvent.id} className="animate-toast absolute left-1/2 top-24 -translate-x-1/2">
          <div className={`text-outline rounded-2xl px-5 py-2 text-2xl font-black ${hud.lastEvent.tone === 'bad' ? 'bg-danger/90' : 'bg-grass/90'}`}>
            {hud.lastEvent.text}
          </div>
        </div>
      )}

      {/* Indicador de potencia */}
      {hud.aiming && (
        <div className="absolute bottom-24 left-1/2 w-64 -translate-x-1/2 sm:bottom-20">
          <div className="text-outline mb-1 text-center text-sm font-black uppercase tracking-wider">
            Potencia {Math.round(hud.power * 100)}%
          </div>
          <div className="relative h-4 overflow-hidden rounded-full border-2 border-white bg-ink/60">
            <div
              className={`h-full transition-colors ${danger ? 'bg-danger' : 'bg-white'}`}
              style={{ width: `${hud.power * 100}%` }}
            />
            <div className="absolute inset-y-0 w-0.5 bg-danger" style={{ left: `${PhysicsConfig.shot.dangerPower * 100}%` }} />
          </div>
        </div>
      )}

      {/* Pista + botón de reinicio */}
      {!hud.holed && (
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

      {/* Hoyo completado */}
      {hud.holed && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-ink/30">
          <div className="animate-pop rounded-3xl border-4 border-white bg-ink/90 px-8 py-6 text-center shadow-2xl">
            <div className="text-outline text-4xl font-black text-sun sm:text-5xl">{hud.lastEvent?.text ?? '¡Dentro!'}</div>
            <div className="mt-3 flex justify-center gap-6 text-lg font-bold">
              <span>Golpes: {hud.shots}</span>
              <span>Tiempo: {formatTime(hud.timeMs)}</span>
            </div>
            <button
              onClick={onReplay}
              className="mt-5 rounded-2xl bg-sun px-6 py-3 text-xl font-black text-ink shadow-[0_5px_0_#b8901a] active:translate-y-1 active:shadow-none"
            >
              Jugar otra vez
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-20 rounded-2xl bg-ink/70 px-4 py-2 text-center backdrop-blur-sm">
      <div className="text-xs font-bold uppercase tracking-wider text-white/70">{label}</div>
      <div className="text-2xl font-black tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-xs font-bold text-danger">{sub}</div>}
    </div>
  );
}
