import { useEffect, useState } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { Hud } from "@/components/Hud";
import { Inventory } from "@/components/Inventory";
import { Overlay } from "@/components/Overlay";
import { TouchControls } from "@/components/TouchControls";
import { UpgradePanel } from "@/components/UpgradePanel";
import { useGame } from "@/hooks/useGame";
import { MATERIALS } from "@/game/data";
import { buildPortal, eat, enterPortal, hit, move, place, upgrade } from "@/game/engine";

export default function Index() {
  const { state, tick, banner, toasts, act, setMining, refresh } = useGame();
  const [panel, setPanel] = useState<"none" | "upgrades" | "help">("help");
  const game = state.current;

  // Teclado. Se registra una sola vez: las acciones leen el estado del ref.
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (["ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
      const key = event.key.toLowerCase();
      if (key === "a" || event.key === "ArrowLeft") act((s) => { move(s, -1); return []; });
      if (key === "d" || event.key === "ArrowRight") act((s) => { move(s, 1); return []; });
      if (event.code === "Space") setMining(true);
      if (key === "e") act(place);
      if (key === "f") act(hit);
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space") setMining(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [act, setMining]);

  return (
    <main key={tick} className="relative h-dvh min-h-[520px] w-full overflow-hidden bg-void font-pixel text-ink">
      <GameCanvas
        state={state}
        onMine={setMining}
        onMove={(dir) => act((s) => { move(s, dir); return []; })}
        onHit={() => act(hit)}
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col gap-2 p-2.5 [&>*]:pointer-events-auto">
        <Hud
          state={game}
          onUpgrades={() => setPanel("upgrades")}
          onHelp={() => setPanel("help")}
          onToggleSound={() => act((s) => { s.sound = !s.sound; return []; })}
        />

        <div className="ml-auto flex flex-col items-end gap-1.5">
          {toasts.map((toast) => (
            <p key={toast.id} className="rounded-lg border border-line border-l-2 border-l-amber bg-surface/95 px-2.5 py-1.5 text-sm">
              {toast.text}
            </p>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <TouchControls
            onMove={(dir) => act((s) => { move(s, dir); return []; })}
            onMine={setMining}
            onPlace={() => act(place)}
            onHit={() => act(hit)}
          />
          <Inventory
            state={game}
            onSelect={(id) => act((s) => {
              s.selected = id;
              return MATERIALS[id]?.food ? eat(s) : [];
            })}
            onBuildPortal={() => act(buildPortal)}
            onEnterPortal={() => act(enterPortal)}
          />
        </div>
      </div>

      {banner && (
        <div className="pointer-events-none absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="font-display text-[clamp(1.6rem,7vw,3rem)]">{banner.title}</p>
          <p className="text-dim">{banner.subtitle}</p>
        </div>
      )}

      <Overlay open={panel === "upgrades"} title="Mejoras" onClose={() => setPanel("none")}>
        <UpgradePanel state={game} onUpgrade={(kind) => { act((s) => upgrade(s, kind)); refresh(); }} />
      </Overlay>

      <Overlay open={panel === "help"} title="Un Bloque en el Vacío" onClose={() => setPanel("none")}>
        <div className="flex flex-col gap-3 text-dim">
          <p>
            Estás de pie sobre un único bloque flotando en la nada. Cada vez que lo rompes vuelve a
            aparecer convertido en otra cosa. No hay más mundo que ese bloque: todo lo que construyas
            sale de él.
          </p>
          <p>
            <b className="text-ink">Controles.</b> A y D o las flechas para moverte, espacio mantenido
            para picar, E para poner el bloque seleccionado y F para pegar. En móvil, los botones de abajo.
          </p>
          <p>
            <b className="text-ink">Al picar sale:</b> 73 % un bloque de la fase, 12 % un cofre
            (común, poco común, raro o épico), 15 % un monstruo vivo, 8 % un bloque de una fase
            anterior y 2 % un bloque especial con botín extra.
          </p>
          <p>
            <b className="text-ink">Cuidado con el vacío.</b> Si te sales de la plataforma caes, y al
            morir pierdes una cuarta parte de todo lo que llevas.
          </p>
          <p>
            <b className="text-ink">El objetivo.</b> Cruzar las diez fases hasta El End, juntar 12
            marcos de portal y 12 ojos de ender de sus cofres, montar el portal y matar al Dragón.
          </p>
        </div>
      </Overlay>
    </main>
  );
}
