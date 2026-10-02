import { describe, expect, it } from 'vitest';
import { recommendQuality, type DeviceInfo } from './deviceProfile';

const base: DeviceInfo = { gpu: 'ANGLE (NVIDIA GeForce RTX 3060)', cores: 12, memoryGb: 16, mobile: false, chromebook: false, dpr: 1, screen: { w: 1920, h: 1080 } };

describe('recommendQuality', () => {
  it('equipo potente → ultra; render por software → baja', () => {
    expect(recommendQuality(base).quality).toBe('ultra');
    expect(recommendQuality({ ...base, gpu: 'Google SwiftShader' }).quality).toBe('low');
  });
  it('Chromebook y GPU integrada Intel → media como máximo', () => {
    expect(recommendQuality({ ...base, gpu: 'Mesa Intel(R) UHD Graphics 600', cores: 4, memoryGb: 4, chromebook: true }).quality).toBe('medium');
  });
  it('móvil → media; muy pocos recursos → baja', () => {
    expect(recommendQuality({ ...base, gpu: 'Adreno (TM) 650', cores: 8, memoryGb: 6, mobile: true }).quality).toBe('medium');
    expect(recommendQuality({ ...base, gpu: 'Mali-T720', cores: 2, memoryGb: 1, mobile: true }).quality).toBe('low');
  });
  it('portátil normal sin datos de memoria → alta', () => {
    expect(recommendQuality({ ...base, gpu: 'Apple GPU', cores: 8, memoryGb: null }).quality).toBe('high');
  });
});
