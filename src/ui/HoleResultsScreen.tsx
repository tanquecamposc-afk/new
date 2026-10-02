import { useEffect, useState } from 'react';
import { session } from '@/app/GameSession';
import { GameConfig } from '@/config/game';
import { useGameStore } from '@/store/gameStore';
import { formatTime } from '@/utils/format';
import { Badge, ColorDot, GameButton, Panel } from './kit';
import { YourHoleSummary } from './YourHoleSummary';

/** Resultados del hoyo para todos + tu resumen. Avanza solo tras unos segundos. */
export function HoleResultsScreen() {
  const match = useGameStore((s) => s.match);
  const result = useGameStore((s) => s.hud.result);
  const [left, setLeft] = useState<number>(GameConfig.autoNextHoleSec);
  const last = session.isLastHole;

  useEffect(() => {
    const t = setInterval(() => setLeft((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, []);
  const online = session.isOnline;
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    // En local la pantalla avanza sola; en online lo decide el servidor.
    if (left <= 0 && !online) {
      if (last) session.showFinalResults();
      else session.nextHole();
    }
  }, [left, last, online]);

  if (!match?.holeResults) return null;
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-ink/50 p-3">
      <Panel className="animate-pop max-h-full w-full max-w-3xl overflow-y-auto">
        <h2 className="mb-3 text-center text-2xl font-black sm:text-3xl">
          Resultados · Hoyo {match.holeIndex + 1}/{match.holeCount}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <table className="w-full self-start text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="text-left">#</th>
                <th className="text-left">Jugador</th>
                <th>Golpes</th>
                <th>Tiempo</th>
                <th className="text-right">Puntos</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {match.holeResults.map((r) => (
                <tr key={r.id} className={`border-t border-white/10 ${r.isLocal ? 'bg-white/10 font-black' : ''}`}>
                  <td className="py-1.5 pl-1 text-left">{r.position}</td>
                  <td className="text-left">
                    <span className="flex items-center gap-2">
                      <ColorDot color={r.color} size={12} />
                      <span className="max-w-[9rem] truncate">{r.name}</span>
                      {r.isBot && <Badge tone="bot">Bot</Badge>}
                    </span>
                  </td>
                  <td className="text-center">{r.completed ? r.strokes : `${r.strokes} ✗`}</td>
                  <td className="text-center">{formatTime(r.timeMs)}</td>
                  <td className="pr-1 text-right font-black text-sun">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result && <YourHoleSummary result={result} />}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <GameButton variant="ghost" onClick={() => session.exitToMenu()}>
            Salir
          </GameButton>
          <GameButton
            className="text-lg"
            disabled={waiting}
            onClick={() => {
              if (online) setWaiting(true);
              if (last) session.showFinalResults();
              else session.nextHole();
            }}
          >
            {waiting ? 'Esperando a los demás…' : last ? 'Ver resultados finales' : 'Siguiente hoyo →'} ({Math.max(0, left)})
          </GameButton>
        </div>
      </Panel>
    </div>
  );
}
