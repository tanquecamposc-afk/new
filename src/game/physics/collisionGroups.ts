/**
 * Grupos de colisión de Rapier: 16 bits altos = pertenencia, 16 bajos = filtro.
 */
export const Group = {
  FLOOR: 1 << 0,
  WALL: 1 << 1,
  BALL: 1 << 2,
  CUP: 1 << 3,
  OBSTACLE: 1 << 4,
  OUT_OF_BOUNDS: 1 << 5,
} as const;

export const groups = (membership: number, filter: number) => ((membership & 0xffff) << 16) | (filter & 0xffff);

const ALL = 0xffff;

export const FLOOR_GROUPS = groups(Group.FLOOR, ALL);
export const WALL_GROUPS = groups(Group.WALL, ALL);
export const OOB_GROUPS = groups(Group.OUT_OF_BOUNDS, ALL);
export const CUP_GROUPS = groups(Group.CUP, Group.BALL);

/** Bola en juego. Las bolas no chocan entre sí en práctica local (se activará en multiplayer). */
export const ballGroups = (collideWithBalls: boolean) =>
  groups(Group.BALL, Group.FLOOR | Group.WALL | Group.OBSTACLE | Group.OUT_OF_BOUNDS | Group.CUP | (collideWithBalls ? Group.BALL : 0));

/** Bola cayendo en la copa: ignora el green para atravesar la boca del hoyo. */
export const BALL_IN_CUP_GROUPS = groups(Group.BALL, Group.CUP | Group.WALL);

/** Grupos para el rayo de detección de suelo. */
export const GROUND_QUERY_GROUPS = groups(0xffff, Group.FLOOR | Group.OUT_OF_BOUNDS | Group.OBSTACLE);
