import { MATERIALS, PORTAL_COST } from "@/game/data";
import { canBuildPortal } from "@/game/engine";
import type { GameState, MaterialId } from "@/game/types";

interface Props {
  state: GameState;
  onSelect: (id: MaterialId) => void;
  onBuildPortal: () => void;
  onEnterPortal: () => void;
}

export function Inventory({ state, onSelect, onBuildPortal, onEnterPortal }: Props) {
  const ids = Object.keys(state.inventory);

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface/80 p-2 backdrop-blur">
      {ids.length === 0 && (
        <span className="text-sm text-dim">Pica el bloque para conseguir materiales</span>
      )}

      {ids.map((id) => {
        const material = MATERIALS[id];
        const selected = state.selected === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            title={`${material.name}${material.food ? " · click para comer" : ""}`}
            className={`group relative grid h-11 w-11 place-items-center rounded-lg border bg-surface/80 ${
              selected ? "border-amber ring-2 ring-amber/30" : "border-line"
            }`}
          >
            <span
              className="h-6 w-6 rounded-sm"
              style={{ background: `linear-gradient(135deg, ${material.colors[0]}, ${material.colors[1]})` }}
            />
            <span className="absolute bottom-0 right-1 text-xs font-semibold tabular-nums [text-shadow:1px_1px_0_#000]">
              {state.inventory[id]}
            </span>
          </button>
        );
      })}

      {!state.portalBuilt && canBuildPortal(state) && (
        <button type="button" onClick={onBuildPortal} className="rounded-lg bg-amber px-3 py-2 font-semibold text-void">
          Construir el portal
        </button>
      )}
      {state.portalBuilt && !state.dragon && !state.won && (
        <button type="button" onClick={onEnterPortal} className="rounded-lg bg-amber px-3 py-2 font-semibold text-void">
          Entrar al portal
        </button>
      )}
      {!state.portalBuilt && !canBuildPortal(state) && (state.inventory.frame || state.inventory.eye) && (
        <span className="text-xs text-dim">
          Portal: {state.inventory.frame ?? 0}/{PORTAL_COST.frame} marcos ·{" "}
          {state.inventory.eye ?? 0}/{PORTAL_COST.eye} ojos
        </span>
      )}
    </div>
  );
}
