import { axisAngle, eulerToQuat, mulQuat, type Quat } from '@/utils/math';

export { mulQuat };
import type { ObstacleDef, Pose } from './types';

/**
 * Pose de un obstáculo en el instante `t` (s de simulación). Función pura y
 * determinista: es la base de la sincronización multijugador de obstáculos.
 */
export function obstaclePose(def: ObstacleDef, t: number): Pose {
  switch (def.kind) {
    case 'windmill': {
      const angle = def.phase + def.angularSpeed * t;
      // Giro del rotor alrededor de su eje local Z, orientado con yaw.
      const rotation = mulQuat(eulerToQuat(0, def.yaw, 0), axisAngle(0, 0, 1, angle));
      return { position: { ...def.hub }, rotation };
    }
    case 'slider': {
      const s = Math.sin(((t / def.period + def.phase) % 1) * Math.PI * 2) * def.amplitude;
      return {
        position: { x: def.center.x + def.axis.x * s, y: def.center.y, z: def.center.z + def.axis.z * s },
        rotation: eulerToQuat(0, Math.atan2(def.axis.x, def.axis.z), 0),
      };
    }
    case 'spinner':
      return { position: { ...def.center }, rotation: axisAngle(0, 1, 0, def.phase + def.angularSpeed * t) };
    case 'bumper':
      return { position: { ...def.center }, rotation: { x: 0, y: 0, z: 0, w: 1 } };
  }
}

/** Colliders locales de cada obstáculo (caja: centro, medio-tamaño, rotación local). */
export interface LocalBox {
  offset: { x: number; y: number; z: number };
  half: { x: number; y: number; z: number };
  rotation: Quat;
}

export function obstacleBoxes(def: ObstacleDef): LocalBox[] {
  const identity = { x: 0, y: 0, z: 0, w: 1 };
  switch (def.kind) {
    case 'windmill': {
      const boxes: LocalBox[] = [];
      for (let i = 0; i < def.blades; i++) {
        const a = (i / def.blades) * Math.PI * 2;
        const r = def.bladeLength / 2 + 0.1;
        boxes.push({
          offset: { x: -Math.sin(a) * r, y: Math.cos(a) * r, z: 0 },
          half: { x: def.bladeWidth / 2, y: def.bladeLength / 2, z: def.bladeThickness / 2 },
          rotation: axisAngle(0, 0, 1, a),
        });
      }
      return boxes;
    }
    case 'slider':
      // Eje local Z = dirección de desplazamiento: la barrera se mueve "de canto".
      return [{ offset: { x: 0, y: 0, z: 0 }, half: { x: def.size.x / 2, y: def.size.y / 2, z: def.size.z / 2 }, rotation: identity }];
    case 'spinner':
      return [{ offset: { x: 0, y: 0, z: 0 }, half: { x: def.length / 2, y: def.height / 2, z: def.thickness / 2 }, rotation: identity }];
    case 'bumper':
      return [];
  }
}
