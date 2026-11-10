import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameClient } from './game/GameClient.js';
import { App } from './ui/App.js';
import { GameContext } from './ui/hooks.js';
import './styles.css';

const gameRoot = document.getElementById('game-root');
const uiRoot = document.getElementById('ui-root');
if (!gameRoot || !uiRoot) throw new Error('index.html is missing #game-root or #ui-root');

// The game client lives outside React: the loop must not depend on component lifecycles.
const game = new GameClient(gameRoot);
game.start();

createRoot(uiRoot).render(
  <StrictMode>
    <GameContext.Provider value={game}>
      <App />
    </GameContext.Provider>
  </StrictMode>,
);
