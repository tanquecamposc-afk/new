import { useGameStore } from '@/store/gameStore';

/** Aviso de reconexión: el juego no se queda "colgado" sin explicación. */
export function ConnectionOverlay() {
  const connection = useGameStore((s) => s.connection);
  if (connection !== 'reconnecting') return null;
  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-ink/60 p-4" role="alertdialog" aria-live="assertive">
      <div className="animate-pop rounded-3xl border-4 border-white/80 bg-ink/95 px-8 py-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-sun" />
        <div className="text-2xl font-black">Reconectando…</div>
        <p className="mt-1 text-sm font-bold text-white/70">Tu plaza se mantiene durante unos segundos.</p>
      </div>
    </div>
  );
}
