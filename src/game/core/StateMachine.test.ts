import { describe, expect, it } from 'vitest';
import { createAppStateMachine } from './appState';
import { createPlayerStateMachine } from './playerState';
import { FixedStepAccumulator } from './FixedStepLoop';

describe('máquina de estados del jugador', () => {
  it('sigue el ciclo de un tiro', () => {
    const m = createPlayerStateMachine();
    for (const s of ['AIMING', 'SHOOTING', 'BALL_MOVING', 'BALL_STOPPED', 'IDLE'] as const) expect(m.transition(s)).toBe(true);
  });
  it('impide disparar sin apuntar o con la bola en movimiento', () => {
    const m = createPlayerStateMachine();
    expect(m.transition('SHOOTING')).toBe(false);
    m.force('AIMING');
    m.force('SHOOTING');
    m.force('BALL_MOVING');
    expect(m.transition('AIMING')).toBe(false);
    expect(m.state).toBe('BALL_MOVING');
  });
  it('force lanza error ante transiciones imposibles', () => {
    expect(() => createPlayerStateMachine().force('BALL_MOVING')).toThrow();
  });
  it('notifica cambios', () => {
    const m = createPlayerStateMachine();
    const log: string[] = [];
    m.onChange((a, b) => log.push(`${a}>${b}`));
    m.force('AIMING');
    expect(log).toEqual(['IDLE>AIMING']);
  });
});

describe('máquina de estados de la app', () => {
  it('BOOT → LOADING → MAIN_MENU, sin saltos imposibles', () => {
    const m = createAppStateMachine();
    expect(m.transition('PLAYING')).toBe(false);
    expect(m.transition('LOADING')).toBe(true);
    expect(m.transition('MAIN_MENU')).toBe(true);
    expect(m.transition('RESULTS')).toBe(false);
  });
});

describe('FixedStepAccumulator', () => {
  it('ejecuta pasos fijos y acumula el resto', () => {
    const a = new FixedStepAccumulator(0.01, 8);
    expect(a.advance(0.025)).toBe(2);
    expect(a.alpha).toBeCloseTo(0.5);
    expect(a.advance(0.005)).toBe(1);
  });
  it('limita los pasos tras un frame enorme', () => {
    const a = new FixedStepAccumulator(0.01, 4);
    expect(a.advance(5)).toBe(4);
    expect(a.alpha).toBeLessThan(1);
  });
});
