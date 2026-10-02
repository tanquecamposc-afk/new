import { useGameStore } from '@/store/gameStore';

export function LoadingScreen() {
  const { progress, message } = useGameStore((s) => s.loading);
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-sky-400 to-emerald-500">
      <h1 className="text-outline animate-pop text-5xl font-black tracking-tight sm:text-7xl">
        Minigolf <span className="text-sun">Party</span>
      </h1>
      <div className="h-4 w-64 overflow-hidden rounded-full border-2 border-white/80 bg-ink/40 sm:w-80">
        <div className="h-full rounded-full bg-sun transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <p className="text-outline text-lg font-bold" role="status" aria-live="polite">
        {message} {Math.round(progress * 100)}%
      </p>
    </div>
  );
}
