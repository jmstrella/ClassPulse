import { describe, it, expect } from 'vitest';
import {
  validateSettings,
  findMatchingPreset,
  areSettingsEqual,
  formatSeconds,
  PRESETS,
  DEFAULT_SETTINGS
} from './logic';

describe('validateSettings', () => {
  it('validates default settings as valid', () => {
    const result = validateSettings(DEFAULT_SETTINGS);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  describe('distracted_after_seconds', () => {
    it('accepts boundaries 15 and 600', () => {
      expect(validateSettings({ ...DEFAULT_SETTINGS, distracted_after_seconds: 15 }).isValid).toBe(true);
      expect(validateSettings({ ...DEFAULT_SETTINGS, distracted_after_seconds: 600 }).isValid).toBe(true);
    });

    it('rejects values below 15', () => {
      const result = validateSettings({ ...DEFAULT_SETTINGS, distracted_after_seconds: 14 });
      expect(result.isValid).toBe(false);
      expect(result.errors.distracted_after_seconds).toBeDefined();
    });

    it('rejects values above 600', () => {
      const result = validateSettings({ ...DEFAULT_SETTINGS, distracted_after_seconds: 601 });
      expect(result.isValid).toBe(false);
      expect(result.errors.distracted_after_seconds).toBeDefined();
    });

    it('rejects non-integer values', () => {
      const result = validateSettings({ ...DEFAULT_SETTINGS, distracted_after_seconds: 45.5 });
      expect(result.isValid).toBe(false);
      expect(result.errors.distracted_after_seconds).toContain('whole number');
    });

    it('rejects missing or undefined value', () => {
      const result = validateSettings({ ...DEFAULT_SETTINGS, distracted_after_seconds: undefined });
      expect(result.isValid).toBe(false);
      expect(result.errors.distracted_after_seconds).toBeDefined();
    });
  });

  describe('idle_after_seconds', () => {
    it('accepts boundaries 60 and 1800', () => {
      expect(validateSettings({ ...DEFAULT_SETTINGS, idle_after_seconds: 60 }).isValid).toBe(true);
      expect(validateSettings({ ...DEFAULT_SETTINGS, idle_after_seconds: 1800 }).isValid).toBe(true);
    });

    it('rejects values below 60', () => {
      const result = validateSettings({ ...DEFAULT_SETTINGS, idle_after_seconds: 59 });
      expect(result.isValid).toBe(false);
      expect(result.errors.idle_after_seconds).toBeDefined();
    });

    it('rejects values above 1800', () => {
      const result = validateSettings({ ...DEFAULT_SETTINGS, idle_after_seconds: 1801 });
      expect(result.isValid).toBe(false);
      expect(result.errors.idle_after_seconds).toBeDefined();
    });

    it('rejects non-integer values', () => {
      const result = validateSettings({ ...DEFAULT_SETTINGS, idle_after_seconds: 120.2 });
      expect(result.isValid).toBe(false);
      expect(result.errors.idle_after_seconds).toContain('whole number');
    });
  });

  describe('offline_after_seconds', () => {
    it('accepts boundaries 60 and 600', () => {
      expect(validateSettings({ ...DEFAULT_SETTINGS, offline_after_seconds: 60 }).isValid).toBe(true);
      expect(validateSettings({ ...DEFAULT_SETTINGS, offline_after_seconds: 600 }).isValid).toBe(true);
    });

    it('strictly rejects values below 60 to prevent false offline alarms', () => {
      const result = validateSettings({ ...DEFAULT_SETTINGS, offline_after_seconds: 59 });
      expect(result.isValid).toBe(false);
      expect(result.errors.offline_after_seconds).toContain('at least 60 seconds');
    });

    it('rejects values above 600', () => {
      const result = validateSettings({ ...DEFAULT_SETTINGS, offline_after_seconds: 601 });
      expect(result.isValid).toBe(false);
      expect(result.errors.offline_after_seconds).toBeDefined();
    });

    it('rejects non-integer values', () => {
      const result = validateSettings({ ...DEFAULT_SETTINGS, offline_after_seconds: 90.5 });
      expect(result.isValid).toBe(false);
      expect(result.errors.offline_after_seconds).toContain('whole number');
    });
  });
});

describe('presets', () => {
  it('correctly matches each defined preset', () => {
    for (const preset of PRESETS) {
      const match = findMatchingPreset(preset.values);
      expect(match).not.toBeNull();
      expect(match?.id).toBe(preset.id);
    }
  });

  it('returns null when values do not match any preset', () => {
    const custom = {
      distracted_after_seconds: 45,
      idle_after_seconds: 120,
      offline_after_seconds: 80
    };
    expect(findMatchingPreset(custom)).toBeNull();
  });
});

describe('areSettingsEqual', () => {
  it('identifies identical settings', () => {
    expect(areSettingsEqual(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS })).toBe(true);
  });

  it('identifies differences in any field', () => {
    expect(areSettingsEqual(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, distracted_after_seconds: 30 })).toBe(false);
    expect(areSettingsEqual(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, idle_after_seconds: 100 })).toBe(false);
    expect(areSettingsEqual(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, offline_after_seconds: 100 })).toBe(false);
  });
});

describe('formatSeconds', () => {
  it('formats seconds only', () => {
    expect(formatSeconds(45)).toBe('45s');
  });

  it('formats minutes evenly', () => {
    expect(formatSeconds(60)).toBe('1m');
    expect(formatSeconds(180)).toBe('3m');
  });

  it('formats minutes and seconds combined', () => {
    expect(formatSeconds(75)).toBe('1m 15s');
    expect(formatSeconds(90)).toBe('1m 30s');
  });
});
