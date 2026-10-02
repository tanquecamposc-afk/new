import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas } from '@/components/GameCanvas';
import type { GameEngine } from '@/game/GameEngine';
import { COURSES } from '@/game/courses';
import { useGameStore } from '@/store/gameStore';
import { DebugPanel } from '@/ui/DebugPanel';
import { ErrorScreen } from '@/ui/ErrorScreen';
import { Hud } from '@/ui/Hud';
import { LoadingScreen } from '@/ui/LoadingScreen';
import { isWebGLAvailable } from '@/utils/webgl';

/**
 * Phase 1: arranque directo a una partida de práctica local en el primer curso.
 * El menú principal, lobby y multijugador llegan en fases posteriores.
 */
export function App() {
  const appState = useGameStore((s) => s.appState);
  const error = useGameStore((s) => s.error);
  const [session, setSession] = useState(0);
  const engineRef = useRef<GameEngine | null>(null);
  const [webgl] = useState(isWebGLAvailable);

  useEffect(() => {
    if (!webgl) useGameStore.getState().setError('Tu navegador no soporta WebGL. Prueba con Chrome actualizado o activa la aceleración por hardware.');
  }, [webgl]);

  const onEngine = useCallback((e: GameEngine | null) => {
    engineRef.current = e;
  }, []);

  const restart = useCallback(() => {
    useGameStore.setState({ error: null, appState: 'BOOT' });
    setSession((n) => n + 1);
  }, []);

  const course = COURSES[0]!;

  return (
    <div className="relative h-full w-full">
      {webgl && <GameCanvas key={session} course={course} playerName="Jugador" onEngine={onEngine} />}
      {appState === 'PLAYING' && <Hud onReset={() => engineRef.current?.resetBall()} onReplay={restart} />}
      {(appState === 'BOOT' || appState === 'LOADING') && <LoadingScreen />}
      {appState === 'ERROR' && error && <ErrorScreen message={error} onRetry={webgl ? restart : () => location.reload()} />}
      <DebugPanel />
    </div>
  );
}
