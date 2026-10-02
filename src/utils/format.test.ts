import { expect, it } from 'vitest';
import { formatTime } from './format';

it('formatea el tiempo de hoyo', () => {
  expect(formatTime(0)).toBe('0:00.0');
  expect(formatTime(83450)).toBe('1:23.5');
  expect(formatTime(-5)).toBe('0:00.0');
});
