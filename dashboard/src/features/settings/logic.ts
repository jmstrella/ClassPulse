import { DEFAULT_SETTINGS, type Settings } from '../../lib/settings';

export interface SettingsValidationErrors {
  distracted_after_seconds?: string;
  idle_after_seconds?: string;
  offline_after_seconds?: string;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  values: Settings;
}

export const PRESETS: Preset[] = [
  {
    id: 'relaxed',
    name: 'Relaxed',
    description: 'Forgiving thresholds for lecture-heavy or passive viewing classes',
    values: {
      distracted_after_seconds: 120,
      idle_after_seconds: 300,
      offline_after_seconds: 120
    }
  },
  {
    id: 'normal',
    name: 'Normal',
    description: 'Balanced default thresholds suitable for most classroom sessions',
    values: {
      distracted_after_seconds: 60,
      idle_after_seconds: 180,
      offline_after_seconds: 90
    }
  },
  {
    id: 'strict',
    name: 'Strict',
    description: 'Quick detection for interactive workshops or hands-on labs',
    values: {
      distracted_after_seconds: 30,
      idle_after_seconds: 90,
      offline_after_seconds: 75
    }
  }
];

export function validateSettings(settings: Partial<Record<keyof Settings, unknown>>): {
  isValid: boolean;
  errors: SettingsValidationErrors;
} {
  const errors: SettingsValidationErrors = {};

  // Distracted: integer, 15 - 600
  const distracted = settings.distracted_after_seconds;
  if (distracted === undefined || distracted === null || distracted === '') {
    errors.distracted_after_seconds = 'Distracted threshold is required';
  } else if (typeof distracted !== 'number' || !Number.isInteger(distracted)) {
    errors.distracted_after_seconds = 'Must be a whole number of seconds';
  } else if (distracted < 15 || distracted > 600) {
    errors.distracted_after_seconds = 'Must be between 15 and 600 seconds';
  }

  // Idle: integer, 60 - 1800
  const idle = settings.idle_after_seconds;
  if (idle === undefined || idle === null || idle === '') {
    errors.idle_after_seconds = 'Idle threshold is required';
  } else if (typeof idle !== 'number' || !Number.isInteger(idle)) {
    errors.idle_after_seconds = 'Must be a whole number of seconds';
  } else if (idle < 60 || idle > 1800) {
    errors.idle_after_seconds = 'Must be between 60 and 1800 seconds (1 to 30 mins)';
  }

  // Offline: integer, 60 - 600, never less than 60
  const offline = settings.offline_after_seconds;
  if (offline === undefined || offline === null || offline === '') {
    errors.offline_after_seconds = 'Offline threshold is required';
  } else if (typeof offline !== 'number' || !Number.isInteger(offline)) {
    errors.offline_after_seconds = 'Must be a whole number of seconds';
  } else if (offline < 60) {
    errors.offline_after_seconds = 'Must be at least 60 seconds (heartbeat runs every 30s)';
  } else if (offline > 600) {
    errors.offline_after_seconds = 'Must not exceed 600 seconds (10 minutes)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function findMatchingPreset(current: Settings): Preset | null {
  for (const preset of PRESETS) {
    if (
      preset.values.distracted_after_seconds === current.distracted_after_seconds &&
      preset.values.idle_after_seconds === current.idle_after_seconds &&
      preset.values.offline_after_seconds === current.offline_after_seconds
    ) {
      return preset;
    }
  }
  return null;
}

export function areSettingsEqual(a: Settings, b: Settings): boolean {
  return (
    a.distracted_after_seconds === b.distracted_after_seconds &&
    a.idle_after_seconds === b.idle_after_seconds &&
    a.offline_after_seconds === b.offline_after_seconds
  );
}

export function formatSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (rem === 0) {
    return `${mins}m`;
  }
  return `${mins}m ${rem}s`;
}

export { DEFAULT_SETTINGS };
