import { useEffect, useRef } from "react";
import { render, screenX, TILE } from "@/game/render";
import type { GameState } from "@/game/types";

interface Props {
  state: React.MutableRefObject<GameState>;
  onMine: (value: boolean) => void;
  onMove: (dir: 1 | -1) => void;
  onHit: () => void;
}

/**
 * El lienzo se dibuja solo, fuera del ciclo de render de React: dentro de su
 * propio requestAnimationFrame lee el estado del ref y pinta.
 */
export function GameCanvas({ state, onMine, onMove, onHit }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.floor(el.clientWidth * dpr);
      el.height = Math.floor(el.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    const draw = () => {
      render(ctx, state.current, el.clientWidth, el.clientHeight);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [state]);

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const el = canvas.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const gx = Math.round((x - rect.width / 2) / TILE + state.current.drawX);

    if (state.current.mobs.some((mob) => Math.abs(mob.x - gx) < 1)) return onHit();
    if (state.current.dragon && event.clientY - rect.top < rect.height * 0.4) return onHit();
    if (gx === 0 && Math.abs(state.current.x) <= 1) return onMine(true);
    onMove(gx < state.current.x ? -1 : 1);
  };

  return (
    <canvas
      ref={canvas}
      onPointerDown={pointerDown}
      onPointerUp={() => onMine(false)}
      onPointerLeave={() => onMine(false)}
      className="block h-full w-full touch-none [image-rendering:pixelated]"
      aria-label="El bloque flotando en el vacío"
    />
  );
}

export { screenX };
