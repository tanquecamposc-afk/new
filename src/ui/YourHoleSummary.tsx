import type { HoleSummary } from '@/store/gameStore';
import { formatTime } from '@/utils/format';

/** Tu resultado del hoyo: golpes, tiempo, desglose de puntos y tabla de tiros. */
export function YourHoleSummary({ result }: { result: HoleSummary }) {
  const { score } = result;
  return (
    <div className="text-center">
      <div className={`text-outline text-3xl font-black sm:text-4xl ${result.completed ? 'text-sun' : 'text-danger'}`}>{result.title}</div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Big label="Golpes" value={`${result.strokes}`} sub={`Par ${result.par}`} />
        <Big label="Tiempo" value={formatTime(result.timeMs)} />
        <Big label="Puntos" value={`${score.total}`} highlight />
      </div>
      {result.completed && (
        <div className="mt-2 rounded-2xl bg-white/5 p-2 text-left text-xs font-bold sm:text-sm">
          <Row k="Base" v={score.base} />
          <Row k="Golpes vs par" v={score.strokePoints} />
          {score.holeInOne > 0 && <Row k="Hoyo en uno" v={score.holeInOne} />}
          <Row k="Bonus de tiempo" v={score.timeBonus} />
        </div>
      )}
      <table className="mt-2 w-full text-xs sm:text-sm">
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
    </div>
  );
}

function Big({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl px-2 py-1.5 ${highlight ? 'bg-sun text-ink' : 'bg-white/10'}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-70 sm:text-xs">{label}</div>
      <div className="text-xl font-black tabular-nums sm:text-2xl">{value}</div>
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
