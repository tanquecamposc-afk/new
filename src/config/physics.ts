/**
 * PhysicsConfig — parámetros de tuning de la simulación.
 *
 * IMPORTANTE: el análisis de referencia NO documenta los valores internos del
 * juego original. Todos los números de este archivo son valores iniciales
 * propios, elegidos y ajustados por prueba para conseguir una sensación arcade.
 * Unidades: metros, segundos, kilogramos.
 */
export const PhysicsConfig = {
  /** Paso fijo de la simulación (s). 120 Hz para una bola pequeña y rápida. */
  fixedTimestep: 1 / 120,
  /** Máximo de pasos por frame de render (evita la "espiral de la muerte"). */
  maxSubSteps: 8,
  gravity: -9.81,

  ball: {
    radius: 0.15,
    /** Masa en kg (configurable; afecta a impulsos y choques entre bolas). */
    mass: 0.3,
    friction: 0.6,
    restitution: 0.35,
    linearDamping: 0.05,
    angularDamping: 0.4,
    ccd: true,
  },

  shot: {
    /** Velocidad de salida a potencia 100 % (m/s). */
    maxSpeed: 14,
    /** Potencia mínima para que un tiro cuente (evita tiros accidentales). */
    minPower: 0.03,
    /** Potencia a partir de la cual el indicador pasa a zona roja. */
    dangerPower: 0.8,
  },

  stop: {
    /** Por debajo de esta velocidad (m/s) la bola se considera casi parada. */
    linearThreshold: 0.09,
    angularThreshold: 0.9,
    /** Tiempo (s) que debe mantenerse por debajo del umbral para detenerse. */
    settleTime: 0.25,
    /**
     * La bola sólo puede quedar en reposo si la componente de la gravedad sobre
     * la pendiente (×5/7, esfera rodando) es menor que la resistencia a la
     * rodadura de la superficie multiplicada por este factor.
     */
    restSlopeFactor: 1,
    /** Seguridad: si una bola sigue moviéndose tras este tiempo se fuerza la parada. */
    maxShotDuration: 25,
  },

  hole: {
    radius: 0.3,
    depth: 0.35,
    /** Velocidad horizontal máxima (m/s) a la que la bola puede caer en la copa. */
    captureSpeed: 3.6,
    /** Tracción hacia el centro en el borde de la copa (m/s²). */
    lipPull: 5,
  },

  world: {
    /** Si la bola baja de esta altura relativa al suelo se considera fuera del campo. */
    killDepth: -4,
    /** Distancia del rayo de detección de suelo, además del radio. */
    groundProbe: 0.06,
  },
} as const;

export type PhysicsConfigType = typeof PhysicsConfig;
