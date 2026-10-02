import { useEffect, useState } from 'react';
import { GameCanvas } from '@/components/GameCanvas';
import { useGameStore } from '@/store/gameStore';
import { CountdownOverlay } from '@/ui/CountdownOverlay';
import { DebugPanel } from '@/ui/DebugPanel';
import { ErrorScreen } from '@/ui/ErrorScreen';
import { FinalResults } from '@/ui/FinalResults';
import { HoleResultsScreen } from '@/ui/HoleResultsScreen';
import { Hud } from '@/ui/Hud';
import { Lobby } from '@/ui/Lobby';
import { LoadingScreen } from '@/ui/LoadingScreen';
import { MainMenu } from '@/ui/MainMenu';
import { ConnectionOverlay } from '@/ui/ConnectionOverlay';
import { PrivateRoomScreen } from '@/ui/PrivateRoomScreen';
import { RewardsScreen } from '@/ui/RewardsScreen';
import { isWebGLAvailable } from '@/utils/webgl';
import { session } from './GameSession';

const IN_MATCH = new Set(['COUNTDOWN', 'PLAYING', 'FINISHED', 'SPECTATING', 'HOLE_RESULTS']);

/** Raíz: cada estado de la máquina de la aplicación tiene su pantalla. */
export function App() {
  const appState = useGameStore((s) => s.appState);
  const error = useGameStore((s) => s.error);
  const matchPhase = useGameStore((s) => s.match?.phase);
  const holeIndex = useGameStore((s) => s.match?.holeIndex);
  const [webgl] = useState(isWebGLAvailable);

  useEffect(() => {
    void session.boot(webgl);
  }, [webgl]);

  const inMatch = IN_MATCH.has(appState);
  // holeIndex en las dependencias del render: session.currentHole cambia al avanzar de hoyo.
  void holeIndex;
  const hole = inMatch ? session.currentHole : null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {hole && (
        <GameCanvas key={hole.key} course={hole.course} players={hole.players} localId={hole.localId} allowPause={hole.allowPause} online={hole.online} />
      )}
      {inMatch && matchPhase === 'loading' && <LoadingScreen compact />}
      {inMatch && appState !== 'HOLE_RESULTS' && <Hud />}
      {inMatch && <CountdownOverlay />}
      {appState === 'HOLE_RESULTS' && <HoleResultsScreen />}

      {(appState === 'BOOT' || appState === 'LOADING') && <LoadingScreen />}
      {appState === 'MAIN_MENU' && <MainMenu />}
      {(appState === 'QUICK_PLAY' || appState === 'MATCHMAKING') && <LoadingScreen compact />}
      {appState === 'PRIVATE_ROOM' && <PrivateRoomScreen />}
      {appState === 'LOBBY' && <Lobby />}
      {appState === 'RESULTS' && <FinalResults />}
      {appState === 'REWARDS' && <RewardsScreen />}
      {appState === 'ERROR' && error && <ErrorScreen message={error} onRetry={webgl ? () => session.recover() : () => location.reload()} />}
      <ConnectionOverlay />
      <DebugPanel />
    </div>
  );
}
