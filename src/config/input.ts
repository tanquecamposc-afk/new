/** InputConfig — sensibilidad y comportamiento del apuntado (valores de tuning). */
export const InputConfig = {
  /** Distancia de arrastre en el mundo (m) que equivale al 100 % de potencia. */
  maxDragDistance: 3.2,
  /** Multiplicador de sensibilidad configurable por el jugador. */
  sensitivity: 1,
  /** Si es true, el arrastre debe empezar cerca de la bola; si no, en cualquier punto. */
  requireBallGrab: false,
  /** Radio (en px de pantalla) alrededor de la bola que cuenta como "agarrar". */
  grabRadiusPx: 70,
  /** Arrastre mínimo en px para empezar a apuntar (distingue tap de drag). */
  dragStartPx: 6,
} as const;
