export type ModeId = 'br'|'zero_build'|'reload'|'ranked_br'|'ranked_reload'|'pillars_nexiph'|'pillars_hive'|'pillars_lucky'|'creative';
export type EvidenceStatus = 'verified_reference'|'historical_reference'|'original_proposal'|'requires_refresh';
export type MatchPhase = 'lobby'|'warmup'|'drop'|'active'|'final_circle'|'results';
export interface PlayerStats { health: number; shield: number; maxHealth: number; maxShield: number; alive: boolean; }
export interface WeaponSpec { id: string; category: 'ar'|'smg'|'shotgun'|'sniper'|'pistol'|'melee'; baseDamage: number; headshotMultiplier: number; magazine: number; reloadSeconds: number; shotsPerSecond: number; rangeMeters: number; }
export interface ModeConfig { id: ModeId; maxPlayers: number; build: boolean; ranked: boolean; respawn: 'none'|'team_timer'|'round_reset'; lastTeamWins: boolean; itemEverySeconds?: number; }
export interface MatchEvent { id: string; type: string; playerId: string; atTick: number; data?: Record<string,unknown>; }
