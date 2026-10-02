import { describe, expect, it } from 'vitest';
import { CameraConfig } from '@/config/camera';
import { CameraRig } from './CameraRig';

describe('CameraRig', () => {
  it('se coloca detrás de la bola mirando al hoyo', () => {
    const rig = new CameraRig();
    rig.setAspect(16 / 9);
    rig.snapBehind({ x: 0, y: 0, z: 8 }, { x: 0, y: 0, z: -8 });
    expect(rig.camera.position.z).toBeGreaterThan(8);
    const b = rig.groundBasis();
    expect(b.forward.z).toBeCloseTo(-1);
  });
  it('respeta los límites de zoom e inclinación', () => {
    const rig = new CameraRig();
    rig.zoom(1000);
    expect(rig.distance).toBe(CameraConfig.maxDistance);
    rig.zoom(1e-6);
    expect(rig.distance).toBe(CameraConfig.minDistance);
    rig.rotate(0, 100);
    expect(rig.pitch).toBe(CameraConfig.maxPitch);
  });
  it('el foco no sale de los límites del curso', () => {
    const rig = new CameraRig();
    rig.setBounds({ x: -2, y: 0, z: -10 }, { x: 2, y: 1, z: 10 });
    rig.snapBehind({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -8 });
    for (let i = 0; i < 300; i++) rig.update(1 / 60, { x: 50, y: 0, z: 0 });
    const target = rig.camera.position.clone();
    // La cámara está detrás (z+) del foco; su x debe seguir cerca del límite (+ margen).
    expect(target.x).toBeLessThan(2 + CameraConfig.boundsMargin + 0.01);
  });
  it('vista general y regreso a la vista anterior', () => {
    const rig = new CameraRig();
    rig.setAspect(1.5);
    rig.setBounds({ x: -2, y: 0, z: -10 }, { x: 2, y: 1, z: 10 });
    const before = rig.distance;
    rig.setOverview(true);
    expect(rig.isOverview).toBe(true);
    expect(rig.distance).toBeGreaterThan(before);
    rig.setOverview(false);
    expect(rig.distance).toBe(before);
  });
});
