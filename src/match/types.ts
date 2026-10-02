import type { Equipped } from '@/cosmetics/catalog';

export const MAX_PLAYERS = 20;

/** Colores por plaza (20 distinguibles): los usa el cosmético de color "Automático". */
export const BALL_COLORS = [
  0xffffff, 0xff5c5c, 0x4fa3ff, 0xffd23f, 0x7ee081, 0xc77dff, 0xff9f43, 0x4dd8d0, 0xff7ac6, 0xb8e05b,
  0x8c9eff, 0xffb4a2, 0x2ec4b6, 0xf15bb5, 0xfee440, 0x9b5de5, 0x00bbf9, 0xf3722c, 0x90be6d, 0xe0e0e0,
] as const;

export type ConnectionState = 'local' | 'connected' | 'reconnecting' | 'disconnected';

export interface MatchPlayer {
  id: string;
  name: string;
  color: number;
  /** Bot de práctica (sólo modo local/testing, siempre etiquetado como BOT). */
  isBot: boolean;
  botSkill?: number;
  /** Cosméticos equipados (sólo visuales). */
  cosmetics?: Equipped;
}
