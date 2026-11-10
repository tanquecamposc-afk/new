export interface PillarsRound { aliveIds: readonly string[]; roundOver: boolean; winnerId?: string; elapsedSeconds: number; nextDropAt: number; }
export function startPillarsRound(playerIds:readonly string[],itemIntervalSeconds:number):PillarsRound {
  if(playerIds.length<2 || new Set(playerIds).size!==playerIds.length)throw new Error('need unique players');
  if(itemIntervalSeconds<=0)throw new Error('invalid item interval');
  return {aliveIds:[...playerIds],roundOver:false,elapsedSeconds:0,nextDropAt:itemIntervalSeconds};
}
export function eliminateFromPillars(round:PillarsRound,playerId:string):PillarsRound {
  if(round.roundOver || !round.aliveIds.includes(playerId))return round;
  const aliveIds=round.aliveIds.filter(id=>id!==playerId);
  const roundOver=aliveIds.length<=1;
  return {...round,aliveIds,roundOver,...(roundOver&&aliveIds[0]?{winnerId:aliveIds[0]}:{})};
}
export function advancePillars(round:PillarsRound,stepSeconds:number,intervalSeconds:number):{round:PillarsRound;drops:number} {
  if(stepSeconds<0||!Number.isFinite(stepSeconds)||intervalSeconds<=0)throw new Error('invalid time');
  if(round.roundOver)return {round,drops:0};
  const elapsedSeconds=round.elapsedSeconds+stepSeconds;
  let drops=0; let nextDropAt=round.nextDropAt;
  while(elapsedSeconds+1e-9>=nextDropAt){drops++;nextDropAt+=intervalSeconds;}
  return {round:{...round,elapsedSeconds,nextDropAt},drops};
}
