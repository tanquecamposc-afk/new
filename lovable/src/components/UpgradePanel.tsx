import { MATERIALS, PICKS, SWORDS } from "@/game/data";
import { canAfford } from "@/game/engine";
import type { GameState, Tool } from "@/game/types";

interface Props {
  state: GameState;
  onUpgrade: (kind: "pick" | "sword") => void;
}

function Row({ state, list, index, kind, onUpgrade }: Props & { list: Tool[]; index: number; kind: "pick" | "sword" }) {
  const current = list[index];
  const next = list[index + 1];

  if (!next) {
    return (
      <div className="border-t border-line pt-3 first:border-0 first:pt-0">
        <p className="font-semibold">{current.name}</p>
        <p className="text-sm text-dim">Ya es el mejor que hay</p>
      </div>
    );
  }

  const affordable = canAfford(state, next.cost);
  const cost = Object.entries(next.cost ?? {}).map(([id, n]) => `${n} ${MATERIALS[id].name}`).join(" + ");

  return (
    <div className="flex items-center gap-3 border-t border-line pt-3 first:border-0 first:pt-0">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{next.name}</p>
        <p className="text-sm text-dim">{cost}</p>
      </div>
      <button
        type="button"
        disabled={!affordable}
        onClick={() => onUpgrade(kind)}
        className={`rounded-lg px-3 py-1.5 ${
          affordable ? "bg-amber font-semibold text-void" : "border border-line text-dim opacity-50"
        }`}
      >
        Mejorar
      </button>
    </div>
  );
}

export function UpgradePanel({ state, onUpgrade }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-dim">
        El pico decide lo rápido que picas; la espada, lo que aguantas cuando el bloque escupe monstruos.
      </p>
      <div>
        <p className="mb-2 text-sm uppercase tracking-[0.1em] text-amber">Pico · {PICKS[state.pick].name}</p>
        <Row state={state} list={PICKS} index={state.pick} kind="pick" onUpgrade={onUpgrade} />
      </div>
      <div>
        <p className="mb-2 text-sm uppercase tracking-[0.1em] text-amber">Espada · {SWORDS[state.sword].name}</p>
        <Row state={state} list={SWORDS} index={state.sword} kind="sword" onUpgrade={onUpgrade} />
      </div>
    </div>
  );
}
