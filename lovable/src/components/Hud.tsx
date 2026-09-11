import { PHASES } from "@/game/data";
import { isInfinite, phaseOf, progressOf } from "@/game/engine";
import type { GameState } from "@/game/types";

interface Props {
  state: GameState;
  onUpgrades: () => void;
  onHelp: () => void;
  onToggleSound: () => void;
}

export function Hud({ state, onUpgrades, onHelp, onToggleSound }: Props) {
  const phase = phaseOf(state);
  const { ratio, left, nextName } = progressOf(state);
  const hearts = Array.from({ length: state.maxHp / 2 }, (_, i) => {
    if (state.hp >= (i + 1) * 2) return "full";
    return state.hp === i * 2 + 1 ? "half" : "empty";
  });

  return (
    <div className="flex flex-wrap items-start gap-2">
      <div className="min-w-[170px] rounded-lg border border-line bg-surface/80 p-2.5 backdrop-blur">
        <p className="text-[0.7rem] uppercase tracking-[0.1em] text-dim">
          Fase {Math.min(state.phase + 1, PHASES.length)}/{PHASES.length}
        </p>
        <p className="text-lg font-semibold leading-tight">
          {isInfinite(state) ? "Fase Infinita ∞" : phase.name}
        </p>
        <div className="mt-1 h-1.5 overflow-hidden rounded bg-line">
          <span
            className="block h-full transition-[width] duration-200"
            style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%`, background: phase.accent }}
          />
        </div>
        <p className="mt-1 text-[0.7rem] uppercase tracking-[0.1em] text-dim">
          {left} bloques para {nextName}
        </p>
      </div>

      <div className="min-w-[120px] rounded-lg border border-line bg-surface/80 p-2.5 backdrop-blur">
        <p className="text-[0.7rem] uppercase tracking-[0.1em] text-dim">Bloques</p>
        <p className="text-lg font-semibold tabular-nums leading-tight">{state.blocks}</p>
        <p className="mt-1 flex gap-0.5 leading-none" aria-label={`${state.hp} de ${state.maxHp} de vida`}>
          {hearts.map((kind, i) => (
            <span key={i} className={kind === "empty" ? "text-line" : "text-danger"}>
              {kind === "half" ? "◐" : "♥"}
            </span>
          ))}
        </p>
      </div>

      <div className="ml-auto flex gap-2">
        <button type="button" onClick={onUpgrades} className="rounded-lg border border-line bg-surface px-3 py-1.5 hover:border-amber">
          Mejoras
        </button>
        <button type="button" onClick={onHelp} aria-label="Cómo se juega" className="rounded-lg border border-line bg-surface px-3 py-1.5 hover:border-amber">
          ?
        </button>
        <button type="button" onClick={onToggleSound} aria-label="Sonido" className="rounded-lg border border-line bg-surface px-3 py-1.5 hover:border-amber">
          {state.sound ? "♪" : "✕"}
        </button>
      </div>
    </div>
  );
}
