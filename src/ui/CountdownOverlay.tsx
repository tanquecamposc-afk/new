import { useGameStore } from '@/store/gameStore';

/** 3 · 2 · 1 · GO! con la información del hoyo. */
export function CountdownOverlay() {
  const match = useGameStore((s) => s.match);
  const hud = useGameStore((s) => s.hud);
  if (!match) return null;
  const { countdown, phase } = match;
  const showInfo = phase === 'ready' || phase === 'countdown';
  if (!showInfo && countdown === null) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-4">
      {showInfo && (
        <div className="animate-pop rounded-3xl bg-ink/75 px-6 py-3 text-center">
          <div className="text-sm font-bold uppercase tracking-widest text-white/70">
            Hoyo {match.holeIndex + 1} de {match.holeCount}
          </div>
          <div className="text-3xl font-black">{hud.courseName}</div>
          <div className="font-bold text-sun">Par {hud.par}</div>
        </div>
      )}
      {countdown !== null && (
        <div
          key={String(countdown)}
          className={`text-outline animate-pop font-black ${countdown === 'GO' ? 'text-8xl text-grass sm:text-9xl' : 'text-9xl text-white sm:text-[10rem]'}`}
          role="status"
          aria-live="assertive"
        >
          {countdown === 'GO' ? 'GO!' : countdown}
        </div>
      )}
    </div>
  );
}
