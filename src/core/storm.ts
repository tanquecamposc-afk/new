export type Circle = Readonly<{x:number;z:number;r:number}>;
export type StormPhase = Readonly<{waitSeconds:number;shrinkSeconds:number;targetRadius:number;damagePerSecond:number}>;
export const SAMPLE_STORM: readonly StormPhase[]=[
  {waitSeconds:70,shrinkSeconds:50,targetRadius:280,damagePerSecond:1},
  {waitSeconds:45,shrinkSeconds:45,targetRadius:130,damagePerSecond:2},
  {waitSeconds:30,shrinkSeconds:35,targetRadius:48,damagePerSecond:5},
  {waitSeconds:15,shrinkSeconds:25,targetRadius:8,damagePerSecond:10}
]; // original numbers for prototyping; not live Fortnite values
export function outsideCircle(position:{x:number;z:number},circle:Circle):boolean {
  return (position.x-circle.x)**2+(position.z-circle.z)**2>circle.r**2;
}
export function lerpCircle(from:Circle,to:Circle,alpha:number):Circle {
  const t=Math.max(0,Math.min(1,alpha));
  return {x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t,r:from.r+(to.r-from.r)*t};
}
/** Deterministic damage for a fixed simulation step. */
export function stormDamagePerTick(dps:number,dt:number):number {
  if(dps<0||dt<0||!Number.isFinite(dps)||!Number.isFinite(dt))throw new Error('invalid storm inputs');
  return dps*dt;
}
