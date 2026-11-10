import type { PlayerStats, WeaponSpec } from './types.js';
export type DamageResult = { next: PlayerStats; shieldDamage: number; healthDamage: number; eliminated: boolean };
export function applyDamage(stats: PlayerStats, incoming: number): DamageResult {
  if (!Number.isFinite(incoming) || incoming < 0) throw new Error('invalid damage');
  if (!stats.alive || stats.health <= 0) return {next:{...stats,alive:false},shieldDamage:0,healthDamage:0,eliminated:false};
  const shieldDamage=Math.min(stats.shield,incoming);
  const healthDamage=Math.min(stats.health,Math.max(0,incoming-shieldDamage));
  const health=Math.max(0,stats.health-healthDamage);
  return { next:{...stats,shield:stats.shield-shieldDamage,health,alive:health>0}, shieldDamage,healthDamage,eliminated:health===0 };
}
export function computeHitDamage(spec: WeaponSpec, headshot: boolean, distanceMeters: number): number {
  if(distanceMeters<0 || !Number.isFinite(distanceMeters)) throw new Error('invalid distance');
  const falloff=distanceMeters<=spec.rangeMeters ? 1 : Math.max(0.55,1-0.005*(distanceMeters-spec.rangeMeters));
  return Math.round(spec.baseDamage*(headshot?spec.headshotMultiplier:1)*falloff);
}
export function heal(stats:PlayerStats,amount:number,kind:'health'|'shield'):PlayerStats {
  if(amount<0 || !Number.isFinite(amount))throw new Error('invalid healing');
  if(!stats.alive)return stats;
  if(kind==='health')return {...stats,health:Math.min(stats.maxHealth,stats.health+amount)};
  return {...stats,shield:Math.min(stats.maxShield,stats.shield+amount)};
}
