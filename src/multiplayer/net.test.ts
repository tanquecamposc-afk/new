import { describe, expect, it } from 'vitest';
import { ClockSync } from './clock';
import { RemoteBuffer } from './RemoteBuffer';

describe('ClockSync', () => {
  it('estima el desfase usando las muestras de menor RTT', () => {
    const c = new ClockSync();
    // Servidor adelantado 5000 ms. RTT 40 ms simétrico.
    c.addSample(1000, 6020, 1040);
    expect(c.offset).toBeCloseTo(5000, 0);
    // Muestra con mucho jitter (RTT 400 asimétrico): apenas afecta.
    for (let i = 0; i < 5; i++) c.addSample(2000 + i * 100, 7050 + i * 100, 2040 + i * 100);
    c.addSample(3000, 8350, 3400);
    expect(Math.abs(c.offset - 5010)).toBeLessThan(40);
    expect(c.serverNow(10_000)).toBeCloseTo(10_000 + c.offset);
  });
});

describe('RemoteBuffer', () => {
  const s = (tick: number, x: number) => ({ tick, x, y: 0.15, z: 0, qx: 0, qy: 0, qz: 0, qw: 1 });
  it('interpola entre snapshots y no extrapola fuera del rango', () => {
    const b = new RemoteBuffer();
    b.push(s(0, 0));
    b.push(s(8, 1));
    b.push(s(16, 3));
    expect(b.sample(4)!.x).toBeCloseTo(0.5);
    expect(b.sample(12)!.x).toBeCloseTo(2);
    expect(b.sample(-5)!.x).toBe(0);
    expect(b.sample(100)!.x).toBe(3);
  });
  it('ignora snapshots desordenados o duplicados', () => {
    const b = new RemoteBuffer();
    b.push(s(10, 1));
    b.push(s(5, 99));
    b.push(s(10, 2));
    expect(b.latest!.x).toBe(2);
    expect(b.sample(7)!.x).toBe(2);
  });
});
