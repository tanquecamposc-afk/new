import { useEffect, useRef } from 'react';
import { session } from '@/app/GameSession';
import { GameEngine } from '@/game/GameEngine';
import type { CourseData } from '@/game/courses/types';
import type { MatchPlayer } from '@/match/types';
import type { OnlineLink } from '@/multiplayer/OnlineLink';
import { effectiveQuality } from '@/settings/settings';
import { useSettings } from '@/settings/settingsStore';
import { useGameStore } from '@/store/gameStore';

interface Props {
  course: CourseData;
  players: MatchPlayer[];
  localId: string;
  allowPause: boolean;
  online: OnlineLink | null;
}

/**
 * Monta el motor de un hoyo. Un solo motor y un solo bucle por montaje (seguro con
 * StrictMode). Cada montaje crea su propio <canvas>: al desmontar, el motor libera su
 * contexto WebGL (forceContextLoss) y, si el canvas se reutilizara, el siguiente motor
 * recibiría ese "contexto perdido" (pasaba en `npm run dev` por el doble montaje).
 */
export function GameCanvas({ course, players, localId, allowPause, online }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current!;
    const canvas = document.createElement('canvas');
    canvas.className = 'block h-full w-full';
    container.prepend(canvas);
    let engine: GameEngine | null = null;
    let cancelled = false;
    const { setLoading, setError } = useGameStore.getState();
    GameEngine.create({
      canvas,
      container,
      course,
      players,
      localPlayerId: localId,
      allowPause,
      quality: effectiveQuality(useSettings.getState().quality).quality,
      onProgress: (p, m) => !cancelled && setLoading(p, m),
      onStart: () => session.onHoleStarted(),
      onLocalFinished: () => session.onLocalFinished(),
      onSpectate: () => session.onSpectate(),
      onHoleEnd: (r) => session.onHoleEnd(r),
      onLocalUnfinished: () => session.onLocalUnfinished(),
      online: online ?? undefined,
    })
      .then((e) => {
        if (cancelled) {
          e.dispose();
          return;
        }
        engine = e;
        e.start();
        session.onEngineReady(e);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error(err);
        setError(err instanceof Error ? err.message : 'Error desconocido al iniciar el hoyo.');
      });
    return () => {
      cancelled = true;
      if (engine) session.onEngineDisposed(engine);
      engine?.dispose();
      canvas.remove();
    };
  }, [course, players, localId, allowPause, online]);

  return (
    <div ref={containerRef} className="absolute inset-0" />
  );
}
