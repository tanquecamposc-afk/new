/** Team mode respawn model: policy configurable, subject to endgame lockout. */
export interface ReloadTeam { livingTeammates: number; rebootAllowedUntilSecond: number; }
export function canRespawnReload(team:ReloadTeam,elapsedSeconds:number):boolean {
  return team.livingTeammates>0 && elapsedSeconds>=0 && elapsedSeconds<team.rebootAllowedUntilSecond;
}
export function decreaseRebootTimer(currentSeconds:number,reductionSeconds:number):number {
  if(currentSeconds<0||reductionSeconds<0)throw new Error('invalid reboot values');
  return Math.max(0,currentSeconds-reductionSeconds);
}
