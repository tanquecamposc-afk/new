import { Hud } from './Hud.js';
import { useApp } from './hooks.js';
import { Lobby } from './Lobby.js';
import { ClickToPlay, FatalError, PauseMenu, Results } from './Overlays.js';
import { Settings } from './Settings.js';

/** Screen router. Everything here is an overlay on top of the 3D canvas. */
export function App() {
  const screen = useApp((s) => s.screen);
  const overlay = useApp((s) => s.overlay);
  const fatalError = useApp((s) => s.fatalError);

  if (fatalError) return <FatalError />;
  return (
    <>
      {screen === 'lobby' && overlay !== 'settings' ? <Lobby /> : null}
      {screen === 'match' ? <Hud /> : null}
      {overlay === 'clickToPlay' ? <ClickToPlay /> : null}
      {overlay === 'pause' ? <PauseMenu /> : null}
      {overlay === 'results' ? <Results /> : null}
      {overlay === 'settings' ? <Settings /> : null}
    </>
  );
}
