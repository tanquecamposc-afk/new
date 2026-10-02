import { describe, expect, it } from 'vitest';
import { PhysicsConfig } from '@/config/physics';
import { computeShotFromDrag, computeShotFromScreenDrag, powerZone, validateShot } from './shot';

const basisLookingNegZ = { forward: { x: 0, z: -1 }, right: { x: 1, z: 0 } };
const okCtx = { state: 'AIMING' as const, ballMoving: false, shotsTaken: 0, maxShots: 12, sinceLastShot: 10 };

describe('computeShotFromDrag (mundo)', () => {
  it('dispara en sentido opuesto al arrastre', () => {
    const s = computeShotFromDrag({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1.6 }, 3.2, 1)!;
    expect(s.direction.x).toBeCloseTo(0);
    expect(s.direction.z).toBeCloseTo(-1);
    expect(s.power).toBeCloseTo(0.5);
  });
  it('limita la potencia a 1', () => {
    expect(computeShotFromDrag({ x: 0, y: 0, z: 0 }, { x: 50, y: 0, z: 0 })!.power).toBe(1);
  });
  it('devuelve null sin arrastre', () => {
    expect(computeShotFromDrag({ x: 1, y: 0, z: 1 }, { x: 1, y: 0, z: 1 })).toBeNull();
  });
});

describe('computeShotFromScreenDrag (pantalla)', () => {
  it('arrastrar hacia abajo dispara hacia delante de la cámara', () => {
    const s = computeShotFromScreenDrag({ x: 0, y: 100 }, basisLookingNegZ, 200)!;
    expect(s.direction.x).toBeCloseTo(0);
    expect(s.direction.z).toBeCloseTo(-1);
    expect(s.power).toBeCloseTo(0.5);
  });
  it('arrastrar a la izquierda dispara a la derecha', () => {
    const s = computeShotFromScreenDrag({ x: -80, y: 0 }, basisLookingNegZ, 200)!;
    expect(s.direction.x).toBeCloseTo(1);
    expect(s.direction.z).toBeCloseTo(0);
  });
  it('respeta la orientación de la cámara', () => {
    // Cámara mirando hacia +X: adelante = +X, derecha = +Z.
    const s = computeShotFromScreenDrag({ x: 0, y: 50 }, { forward: { x: 1, z: 0 }, right: { x: 0, z: 1 } }, 200)!;
    expect(s.direction.x).toBeCloseTo(1);
  });
  it('la sensibilidad escala la potencia', () => {
    const a = computeShotFromScreenDrag({ x: 0, y: 50 }, basisLookingNegZ, 200, 1)!;
    const b = computeShotFromScreenDrag({ x: 0, y: 50 }, basisLookingNegZ, 200, 2)!;
    expect(b.power).toBeCloseTo(a.power * 2);
  });
});

describe('validateShot', () => {
  const shot = { direction: { x: 0, z: -1 }, power: 0.5 };
  it('acepta un tiro válido', () => expect(validateShot(shot, okCtx)).toEqual({ ok: true }));
  it('rechaza con la bola en movimiento', () =>
    expect(validateShot(shot, { ...okCtx, ballMoving: true, state: 'BALL_MOVING' })).toEqual({ ok: false, reason: 'invalid_state' }));
  it('rechaza potencia fuera de rango (anti-cheat)', () =>
    expect(validateShot({ ...shot, power: 1.5 }, okCtx)).toEqual({ ok: false, reason: 'power_out_of_range' }));
  it('rechaza NaN', () => expect(validateShot({ direction: { x: NaN, z: 0 }, power: 0.5 }, okCtx).ok).toBe(false));
  it('rechaza dirección no normalizada', () =>
    expect(validateShot({ direction: { x: 3, z: 4 }, power: 0.5 }, okCtx)).toEqual({ ok: false, reason: 'invalid_direction' }));
  it('rechaza tiros demasiado flojos', () =>
    expect(validateShot({ ...shot, power: PhysicsConfig.shot.minPower / 2 }, okCtx)).toEqual({ ok: false, reason: 'power_too_low' }));
  it('rechaza ráfagas de tiros', () => expect(validateShot(shot, { ...okCtx, sinceLastShot: 0.01 })).toEqual({ ok: false, reason: 'rate_limited' }));
  it('rechaza superar el máximo de tiros', () => expect(validateShot(shot, { ...okCtx, shotsTaken: 12 })).toEqual({ ok: false, reason: 'too_many_shots' }));
});

describe('powerZone', () => {
  it('cambia a peligro en el umbral', () => {
    expect(powerZone(0.2)).toBe('safe');
    expect(powerZone(PhysicsConfig.shot.dangerPower)).toBe('danger');
  });
});
