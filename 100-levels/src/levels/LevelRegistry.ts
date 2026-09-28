/**
 * Maps level metadata to the builder that constructs it.
 */
import type { Session, LevelLogic } from './Session';
import type { LevelMeta } from '../data/levels';
import { buildParkour } from './builders/parkour';

export function buildLevel(s: Session, meta: LevelMeta): LevelLogic {
  switch (meta.genre) {
    case 'parkour':
      return buildParkour(s, meta.variant);
    default:
      return buildParkour(s, 'basics');
  }
}
