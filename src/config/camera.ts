/** CameraConfig — cámara orbital de seguimiento para minigolf (valores de tuning). */
export const CameraConfig = {
  fov: 50,
  near: 0.1,
  far: 400,
  /** Distancia inicial a la bola y límites de zoom. */
  distance: 9,
  minDistance: 3.5,
  maxDistance: 26,
  /** Inclinación (rad) desde la horizontal. */
  pitch: 0.72,
  minPitch: 0.22,
  maxPitch: 1.35,
  /** Suavizado (1/s) del seguimiento del objetivo y de la órbita. */
  followSharpness: 6,
  orbitSharpness: 12,
  /** Sensibilidad de rotación con arrastre (rad por píxel). */
  rotateSpeed: 0.0055,
  keyRotateSpeed: 1.8,
  zoomStep: 1.12,
  /** En pantallas estrechas se aleja la cámara para ver más campo. */
  portraitDistanceFactor: 1.35,
} as const;
