import type { ModeConfig } from './types.js';
/** Valores de proyecto para prototipar, NO un reflejo literal del Fortnite oficial. */
export const MODES: readonly ModeConfig[] = [
  { id:'br', maxPlayers:80, build:true, ranked:false, respawn:'none',lastTeamWins:true },
  { id:'zero_build', maxPlayers:80, build:false, ranked:false, respawn:'none',lastTeamWins:true },
  { id:'reload', maxPlayers:40, build:true, ranked:false, respawn:'team_timer',lastTeamWins:true },
  { id:'ranked_br', maxPlayers:80, build:true, ranked:true, respawn:'none',lastTeamWins:true },
  { id:'ranked_reload', maxPlayers:40, build:true, ranked:true, respawn:'team_timer',lastTeamWins:true },
  { id:'pillars_nexiph', maxPlayers:8, build:true, ranked:false, respawn:'round_reset',lastTeamWins:false,itemEverySeconds:5 },
  { id:'pillars_hive', maxPlayers:12, build:true, ranked:false, respawn:'round_reset',lastTeamWins:false,itemEverySeconds:6 },
  { id:'pillars_lucky', maxPlayers:12, build:true, ranked:false, respawn:'round_reset',lastTeamWins:false,itemEverySeconds:5 },
  { id:'creative', maxPlayers:16, build:true, ranked:false, respawn:'round_reset',lastTeamWins:false }
];
export const findMode = (id:string): ModeConfig|undefined => MODES.find(mode=>mode.id===id);
