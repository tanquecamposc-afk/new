/**
 * Names of the events the simulation emits. Clients (renderer, audio, HUD), bots and later the
 * network layer all react to these; nobody infers outcomes on their own.
 *
 * `MatchEvent.playerId` is the subject of the event: the shooter for ShotFired, the attacker for
 * DamageDealt (or the victim when the world hurt them), the victim for PlayerEliminated. Match
 * level events use an empty id.
 */
export const SIM_EVENTS = Object.freeze({
  playerSpawned: 'PlayerSpawned',
  playerRespawned: 'PlayerRespawned',
  playerJumped: 'PlayerJumped',
  playerLanded: 'PlayerLanded',
  slideStarted: 'SlideStarted',
  mantleStarted: 'MantleStarted',
  checkpointReached: 'CheckpointReached',
  courseCompleted: 'CourseCompleted',
  courseRestarted: 'CourseRestarted',
  simulationError: 'SimulationError',

  matchPhaseChanged: 'MatchPhaseChanged',
  matchEnded: 'MatchEnded',
  shotFired: 'ShotFired',
  dryFire: 'DryFire',
  damageDealt: 'DamageDealt',
  playerEliminated: 'PlayerEliminated',
  reloadStarted: 'ReloadStarted',
  reloadFinished: 'ReloadFinished',
  reloadCancelled: 'ReloadCancelled',
  slotSelected: 'SlotSelected',
  itemPickedUp: 'ItemPickedUp',
  itemDropped: 'ItemDropped',
  itemUseStarted: 'ItemUseStarted',
  itemUseCancelled: 'ItemUseCancelled',
  itemUseRejected: 'ItemUseRejected',
  itemUsed: 'ItemUsed',
  lootSpawned: 'LootSpawned',
  showdownPing: 'ShowdownPing',
} as const);

export type SimEventType = (typeof SIM_EVENTS)[keyof typeof SIM_EVENTS];
