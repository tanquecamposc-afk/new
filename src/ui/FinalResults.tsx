import { session } from '@/app/GameSession';
import { useGameStore } from '@/store/gameStore';
import { formatTime } from '@/utils/format';
import { Badge, ColorDot, GameButton, MenuBackdrop, Panel } from './kit';

const MEDALS = ['🥇', '🥈', '🥉'];

/** Clasificación final de la partida. */
export function FinalResults() {
  const match = useGameStore((s) => s.match);
  const standings = match?.standings;
  if (!match || !standings) return null;
  const me = standings.find((s) => s.playerId === 'local');
  const podium = standings.slice(0, 3);
  return (
    <div className="absolute inset-0 z-20 overflow-y-auto p-3 sm:p-6">
      <MenuBackdrop />
      <div className="relative mx-auto max-w-4xl">
        <h1 className="text-outline animate-pop mb-4 text-center text-5xl font-black">Resultados finales</h1>
        <div className="mb-4 flex items-end justify-center gap-3">
          {[podium[1], podium[0], podium[2]].map(
            (p, i) =>
              p && (
                <div key={p.playerId} className="flex flex-col items-center">
                  <div className="text-4xl">{MEDALS[p.position - 1] ?? ''}</div>
                  <div className="text-outline flex max-w-[8rem] items-center gap-1 truncate font-black">
                    <ColorDot color={p.color} size={14} /> {p.name}
                  </div>
                  <div
                    className={`mt-1 flex w-24 items-start justify-center rounded-t-2xl bg-ink/80 pt-2 text-2xl font-black text-sun sm:w-32 ${['h-20', 'h-28', 'h-14'][i]}`}
                  >
                    {p.totalScore}
                  </div>
                </div>
              ),
          )}
        </div>
        <Panel>
          {me && (
            <p className="mb-3 text-center text-lg font-black">
              Has quedado <span className="text-sun">{me.position}º</span> de {standings.length} · {me.totalStrokes} golpes · {formatTime(me.totalTimeMs)}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/60">
                <tr>
                  <th className="text-left">#</th>
                  <th className="text-left">Jugador</th>
                  {Array.from({ length: match.holeCount }, (_, i) => (
                    <th key={i} className="px-1">
                      H{i + 1}
                    </th>
                  ))}
                  <th className="px-1">Golpes</th>
                  <th className="px-1">Tiempo</th>
                  <th className="text-right">Puntos</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {standings.map((s) => (
                  <tr key={s.playerId} className={`border-t border-white/10 ${s.playerId === 'local' ? 'bg-white/10 font-black' : ''}`}>
                    <td className="py-1.5 pl-1 text-left">{s.position}</td>
                    <td className="text-left">
                      <span className="flex items-center gap-2">
                        <ColorDot color={s.color} size={12} />
                        <span className="max-w-[8rem] truncate">{s.name}</span>
                        {s.isBot && <Badge tone="bot">Bot</Badge>}
                      </span>
                    </td>
                    {s.perHole.map((h, i) => (
                      <td key={i} className="px-1 text-center">
                        {h ?? '–'}
                      </td>
                    ))}
                    <td className="px-1 text-center">{s.totalStrokes}</td>
                    <td className="px-1 text-center">{formatTime(s.totalTimeMs)}</td>
                    <td className="pr-1 text-right font-black text-sun">{s.totalScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <GameButton variant="secondary" onClick={() => session.exitToMenu()}>
              Menú principal
            </GameButton>
            <GameButton className="text-lg" onClick={() => session.playAgain()}>
              Jugar otra vez
            </GameButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}
