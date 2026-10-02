import { useEffect, useRef } from 'react';
import { GameEngine } from '@/game/GameEngine';
import type { CourseData } from '@/game/courses/types';
import { useGameStore } from '@/store/gameStore';

interface Props {
  course: CourseData;
  playerName: string;
  onEngine?: (engine: GameEngine | null) => void;
}

/** Monta el motor sobre un canvas. Un solo motor y un solo bucle por montaje (seguro con StrictMode). */
export function GameCanvas({ course, playerName, onEngine }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let engine: GameEngine | null = null;
    let cancelled = false;
    const { setLoading, setAppState, setError } = useGameStore.getState();
    setAppState('LOADING');
    GameEngine.create({
      canvas: canvasRef.current!,
      container: containerRef.current!,
      course,
      playerName,
      onProgress: (p, m) => !cancelled && setLoading(p, m),
    })
      .then((e) => {
        if (cancelled) {
          e.dispose();
          return;
        }
        engine = e;
        e.start();
        onEngine?.(e);
        setAppState('PLAYING');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error(err);
        setError(err instanceof Error ? err.message : 'Error desconocido al iniciar el juego.');
      });
    return () => {
      cancelled = true;
      onEngine?.(null);
      engine?.dispose();
    };
  }, [course, playerName, onEngine]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
