import { useGameStore } from '@/store/gameStore';

/** Panel de rendimiento (F3 o `). Sólo disponible si VITE_ENABLE_DEBUG=true. */
export function DebugPanel() {
  const show = useGameStore((s) => s.showDebug);
  const d = useGameStore((s) => s.debug);
  const state = useGameStore((s) => s.hud.playerState);
  if (!show) return null;
  const rows: [string, string | number][] = [
    ['FPS', d.fps],
    ['Frame', `${d.frameMs} ms`],
    ['Draw calls', d.drawCalls],
    ['Triángulos', d.triangles],
    ['Cuerpos', d.bodies],
    ['Colliders', d.colliders],
    ['Predicción (total)', `${d.predictionMs} ms`],
    ['Memoria', d.memoryMb === null ? 'n/d' : `${d.memoryMb} MB`],
    ['Calidad', d.quality],
    ['Resolución', `${Math.round(d.resolution * 100)} %`],
    ['Red', d.latencyMs === null ? 'local (sin servidor)' : `${d.latencyMs} ms RTT`],
    ['Estado', state],
  ];
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-xl bg-black/70 px-3 py-2 font-mono text-xs leading-5">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4">
          <span className="text-white/60">{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}
