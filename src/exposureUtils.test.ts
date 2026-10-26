import { describe, expect, it } from 'vitest';
import {
  avToFNumber,
  calculateMissingValue,
  evToLux,
  formatFNumber,
  formatISO,
  formatLux,
  formatShutterSpeed,
  fNumberToAV,
  isoToSensitivity,
  sensitivityToISO,
  shutterSpeedToTV,
  tvToShutterSpeed,
} from './exposureUtils';

describe('EV / lux', () => {
  it('EV 0 は 2.5lux', () => {
    expect(evToLux(0)).toBe(2.5);
  });

  it('EV 4 は 40lux', () => {
    expect(evToLux(4)).toBe(40);
  });

  it('1000lux 以上は kLux 表記', () => {
    expect(formatLux(1000)).toBe('1.0kLux');
    expect(formatLux(2500)).toBe('2.5kLux');
  });

  it('1000lux 未満は Lux 表記', () => {
    expect(formatLux(999)).toBe('999.0Lux');
  });
});

describe('AV / f値', () => {
  it('AV 0 は f/1', () => {
    expect(avToFNumber(0)).toBe(1);
  });

  it('AV 2 は f/2', () => {
    expect(avToFNumber(2)).toBe(2);
  });

  it('f値と AV は往復できる', () => {
    expect(fNumberToAV(avToFNumber(5))).toBeCloseTo(5);
  });

  it('表示は f/{n} 形式', () => {
    expect(formatFNumber(2)).toBe('f/2.0');
  });
});

describe('TV / シャッタースピード', () => {
  it('TV 0 は 1 秒', () => {
    expect(tvToShutterSpeed(0)).toBe(1);
  });

  it('TV 3 は 1/8 秒', () => {
    expect(tvToShutterSpeed(3)).toBe(1 / 8);
  });

  it('シャッタースピードと TV は往復できる', () => {
    expect(shutterSpeedToTV(tvToShutterSpeed(6))).toBeCloseTo(6);
  });

  it('表示は 1/{n} 形式', () => {
    expect(formatShutterSpeed(3)).toBe('1/8');
    expect(formatShutterSpeed(0)).toBe('1.0s');
  });
});

describe('ISO / 感度', () => {
  it('ISO 0 は 100', () => {
    expect(isoToSensitivity(0)).toBe(100);
  });

  it('ISO 2 は 400', () => {
    expect(isoToSensitivity(2)).toBe(400);
  });

  it('感度と ISO は往復できる', () => {
    expect(sensitivityToISO(isoToSensitivity(4))).toBeCloseTo(4);
  });

  it('表示は ISO {n} 形式', () => {
    expect(formatISO(2)).toBe('ISO 400');
  });
});

describe('calculateMissingValue', () => {
  it('EV = AV + TV - ISO', () => {
    expect(calculateMissingValue({ av: 2, tv: 3, iso: 0 }, 'ev')).toBe(5);
  });

  it('AV = EV - TV + ISO', () => {
    expect(calculateMissingValue({ ev: 5, tv: 3, iso: 0 }, 'av')).toBe(2);
  });

  it('TV = EV - AV + ISO', () => {
    expect(calculateMissingValue({ ev: 5, av: 2, iso: 0 }, 'tv')).toBe(3);
  });

  it('ISO = AV + TV - EV', () => {
    expect(calculateMissingValue({ ev: 5, av: 2, tv: 3 }, 'iso')).toBe(0);
  });

  it('値が足りないときは例外', () => {
    expect(() => calculateMissingValue({ av: 2 }, 'ev')).toThrow();
  });
});
