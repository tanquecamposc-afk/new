import type { HoleSummary } from '@/store/gameStore';
import { formatTime } from '@/utils/format';

interface Props {
  result: HoleSummary;
  onReplay: () => void;
}

/** Resumen del hoyo: resultado, golpes, tiempo, desglose de puntuación y tiros. */
export function HoleResultPanel({ result, onReplay }: Props) {
  const { score } = result;
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-ink/40 p-3">
      <div className="animate-pop max-h-full w-full max-w-md overflow-y-auto rounded-3xl border-4 border-white bg-ink/95 p-5 text-center shadow-2xl">
        <div className={`text-outline text-4xl font-black sm:text-5xl ${result.completed ? 'text-sun' : 'text-danger'}`}>{result.title}</div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Big label="Golpes" value={`${result.strokes}`} sub={`Par ${result.par}`} />
          <Big label="Tiempo" value={formatTime(result.timeMs)} />
          <Big label="Puntos" value={`${score.total}`} highlight />
        </div>

        {result.completed && (
          <div className="mt-3 rounded-2xl bg-white/5 p-3 text-left text-sm font-bold">
            <Row k="Base" v={score.base} />
            <Row k="Golpes vs par" v={score.strokePoints} />
            {score.holeInOne > 0 && <Row k="Hoyo en uno" v={score.holeInOne} />}
            <Row k="Bonus de tiempo" v={score.timeBonus} />
          </div>
        )}

        <table className="mt-3 w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="py-1 text-left">#</th>
              <th>Potencia</th>
              <th>Distancia</th>
              <th>Rebotes</th>
              <th className="text-right">Resultado</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {result.shots.map((s) => (
              <tr key={s.index} className="border-t border-white/10">
                <td className="py-1 text-left">{s.index}</td>
                <td>{Math.round(s.power * 100)}%</td>
                <td>{s.distance} m</td>
                <td>{s.bounces}</td>
                <td className="text-right">{s.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.penalties > 0 && <div className="mt-1 text-xs font-bold text-danger">Incluye {result.penalties} golpe(s) de penalización</div>}

        <button
          onClick={onReplay}
          className="mt-5 rounded-2xl bg-sun px-6 py-3 text-xl font-black text-ink shadow-[0_5px_0_#b8901a] active:translate-y-1 active:shadow-none"
        >
          Jugar otra vez
        </button>
      </div>
    </div>
  );
}

function Big({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl px-2 py-2 ${highlight ? 'bg-sun text-ink' : 'bg-white/10'}`}>
      <div className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-2xl font-black tabular-nums">{value}</div>
      {sub && <div className="text-xs font-bold opacity-70">{sub}</div>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/70">{k}</span>
      <span className="tabular-nums">{v > 0 && k !== 'Base' ? `+${v}` : v}</span>
    </div>
  );
}
