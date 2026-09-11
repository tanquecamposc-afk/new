import { useCallback, useEffect, useRef, useState } from "react";
import { playSound } from "@/game/audio";
import { createGame, update } from "@/game/engine";
import type { GameEvent, GameState } from "@/game/types";

const SAVE_KEY = "oneblock.save";

export interface Banner { title: string; subtitle: string }
export interface Toast { id: number; text: string }

/**
 * El estado del juego vive en un ref y se muta 60 veces por segundo: pasarlo por
 * useState provocaría un render por frame. La interfaz se entera mediante `tick`,
 * que sube unas pocas veces por segundo y solo cuando algo cambió de verdad.
 */
export function useGame() {
  const state = useRef<GameState>(createGame());
  const mining = useRef(false);
  const [tick, setTick] = useState(0);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const handle = useCallback((events: GameEvent[]) => {
    if (!events.length) return;
    events.forEach((event) => {
      switch (event.type) {
        case "sound":
          playSound(event.sound, state.current.sound);
          break;
        case "toast": {
          const id = ++toastId.current;
          setToasts((list) => [...list.slice(-3), { id, text: event.text }]);
          window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3600);
          break;
        }
        case "banner":
          setBanner({ title: event.title, subtitle: event.subtitle });
          window.setTimeout(() => setBanner(null), 2200);
          break;
        default:
          break;
      }
    });
    refresh();
  }, [refresh]);

  /** Ejecuta una acción del motor y refresca la interfaz. */
  const act = useCallback((action: (s: GameState) => GameEvent[]) => {
    handle(action(state.current));
    refresh();
  }, [handle, refresh]);

  const setMining = useCallback((value: boolean) => {
    mining.current = value;
  }, []);

  // Partida guardada
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<GameState>;
        if (typeof saved.blocks === "number") {
          Object.assign(state.current, saved, { mobs: [], particles: [], dragon: null, mining: 0 });
          refresh();
        }
      }
    } catch {
      // Sin partida guardada, se empieza de cero.
    }
  }, [refresh]);

  // Bucle principal
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let sinceSync = 0;

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      const events = update(state.current, dt, mining.current);
      if (events.length) handle(events);

      sinceSync += dt;
      if (sinceSync > 12) {
        sinceSync = 0;
        setTick((n) => n + 1);
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [handle]);

  // Guardado periódico
  useEffect(() => {
    const id = window.setInterval(() => {
      try {
        const { mobs, particles, dragon, ...rest } = state.current;
        localStorage.setItem(SAVE_KEY, JSON.stringify(rest));
      } catch {
        // Almacenamiento no disponible: se juega sin guardar.
      }
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  return { state, tick, banner, toasts, act, setMining, refresh };
}
