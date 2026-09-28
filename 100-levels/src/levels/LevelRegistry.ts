/**
 * Maps level metadata to the builder that constructs it.
 */
import type { Session, LevelLogic } from './Session';
import type { LevelMeta } from '../data/levels';
import { buildParkour } from './builders/parkour';
import { buildBossLevel } from './builders/bossArena';
import { buildCombat } from './builders/combat';

export function buildLevel(s: Session, meta: LevelMeta): LevelLogic {
  switch (meta.genre) {
    case 'parkour':
      if (meta.variant === 'boss') return buildBossLevel(s, { bossId: 'guardian', y: 20 });
      return buildParkour(s, meta.variant);
    case 'combat':
      if (meta.variant === 'boss') return buildBossLevel(s, { bossId: 'warrior', radius: 18 });
      return buildCombat(s, meta.variant);
    case 'bossrush':
      return buildBossLevel(s, { bossId: meta.boss! });
    default:
      return buildParkour(s, 'basics');
  }
}
