import { useState, useMemo, type ChangeEvent } from 'react';
import { useSessionContext } from '../../app/SessionContext';
import { supabase } from '../../lib/supabase';
import { getStatus, STATUS_META, type ParticipantStatus } from '../../lib/status';
import type { Settings } from '../../lib/settings';
import {
  validateSettings,
  findMatchingPreset,
  areSettingsEqual,
  formatSeconds,
  PRESETS,
  DEFAULT_SETTINGS,
  type Preset
} from './logic';
import {
  Sliders,
  RotateCcw,
  Undo2,
  Save,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Users
} from 'lucide-react';

interface FormState {
  distracted_after_seconds: number | string;
  idle_after_seconds: number | string;
  offline_after_seconds: number | string;
}

export default function SettingsView() {
  const { session, settings, participants, now } = useSessionContext();

  const [formValues, setFormValues] = useState<FormState>(() => ({
    distracted_after_seconds: settings.distracted_after_seconds,
    idle_after_seconds: settings.idle_after_seconds,
    offline_after_seconds: settings.offline_after_seconds
  }));

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync from context when external settings change, only if the user hasn't made unsaved edits
  const [prevSettings, setPrevSettings] = useState(settings);
  if (prevSettings !== settings) {
    setPrevSettings(settings);
    const parsedCurrent: Settings = {
      distracted_after_seconds: Number(formValues.distracted_after_seconds),
      idle_after_seconds: Number(formValues.idle_after_seconds),
      offline_after_seconds: Number(formValues.offline_after_seconds)
    };
    if (areSettingsEqual(parsedCurrent, prevSettings)) {
      setFormValues({
        distracted_after_seconds: settings.distracted_after_seconds,
        idle_after_seconds: settings.idle_after_seconds,
        offline_after_seconds: settings.offline_after_seconds
      });
    }
  }

  // Numeric parsed settings for validation and comparison
  const parsedCurrentSettings = useMemo<Settings>(() => ({
    distracted_after_seconds: Number(formValues.distracted_after_seconds),
    idle_after_seconds: Number(formValues.idle_after_seconds),
    offline_after_seconds: Number(formValues.offline_after_seconds)
  }), [formValues]);

  // Validation
  const validation = useMemo(() => {
    return validateSettings(parsedCurrentSettings);
  }, [parsedCurrentSettings]);

  // Unsaved changes check
  const isDirty = useMemo(() => {
    return !areSettingsEqual(parsedCurrentSettings, settings);
  }, [parsedCurrentSettings, settings]);

  // Active preset check
  const activePreset = useMemo<Preset | null>(() => {
    return findMatchingPreset(parsedCurrentSettings);
  }, [parsedCurrentSettings]);

  // Handle number input changes
  const handleInputChange = (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setFormValues((prev) => ({
      ...prev,
      [field]: rawVal === '' ? '' : Number(rawVal)
    }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Preset selection
  const applyPreset = (preset: Preset) => {
    setFormValues({
      distracted_after_seconds: preset.values.distracted_after_seconds,
      idle_after_seconds: preset.values.idle_after_seconds,
      offline_after_seconds: preset.values.offline_after_seconds
    });
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Reset to default
  const handleResetToDefaults = () => {
    setFormValues({
      distracted_after_seconds: DEFAULT_SETTINGS.distracted_after_seconds,
      idle_after_seconds: DEFAULT_SETTINGS.idle_after_seconds,
      offline_after_seconds: DEFAULT_SETTINGS.offline_after_seconds
    });
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Discard changes
  const handleDiscard = () => {
    setFormValues({
      distracted_after_seconds: settings.distracted_after_seconds,
      idle_after_seconds: settings.idle_after_seconds,
      offline_after_seconds: settings.offline_after_seconds
    });
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Save changes
  const handleSave = async () => {
    if (!session || !validation.isValid || !isDirty || saving) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const mergedSettings = {
        ...(session.settings || {}),
        distracted_after_seconds: parsedCurrentSettings.distracted_after_seconds,
        idle_after_seconds: parsedCurrentSettings.idle_after_seconds,
        offline_after_seconds: parsedCurrentSettings.offline_after_seconds
      };

      const { error } = await supabase
        .from('sessions')
        .update({ settings: mergedSettings })
        .eq('id', session.id);

      if (error) {
        throw error;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Live status preview computation (saved vs current form values)
  const previewComparison = useMemo(() => {
    const statuses: ParticipantStatus[] = ['active', 'distracted', 'idle', 'offline'];
    const currentCounts: Record<ParticipantStatus, number> = { active: 0, distracted: 0, idle: 0, offline: 0 };
    const previewCounts: Record<ParticipantStatus, number> = { active: 0, distracted: 0, idle: 0, offline: 0 };

    const effectivePreviewSettings = validation.isValid ? parsedCurrentSettings : settings;

    participants.forEach((p) => {
      const curStatus = getStatus(p, settings, now);
      currentCounts[curStatus] = (currentCounts[curStatus] || 0) + 1;

      const prevStatus = getStatus(p, effectivePreviewSettings, now);
      previewCounts[prevStatus] = (previewCounts[prevStatus] || 0) + 1;
    });

    return {
      statuses,
      currentCounts,
      previewCounts,
      totalParticipants: participants.length
    };
  }, [participants, settings, parsedCurrentSettings, validation.isValid, now]);

  const distractedDisplay = typeof parsedCurrentSettings.distracted_after_seconds === 'number' && parsedCurrentSettings.distracted_after_seconds > 0
    ? formatSeconds(parsedCurrentSettings.distracted_after_seconds)
    : '60s';
  const idleDisplay = typeof parsedCurrentSettings.idle_after_seconds === 'number' && parsedCurrentSettings.idle_after_seconds > 0
    ? formatSeconds(parsedCurrentSettings.idle_after_seconds)
    : '3m';
  const offlineDisplay = typeof parsedCurrentSettings.offline_after_seconds === 'number' && parsedCurrentSettings.offline_after_seconds > 0
    ? formatSeconds(parsedCurrentSettings.offline_after_seconds)
    : '90s';

  return (
    <div className="w-full space-y-6">
      {/* Header & Actions bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-red-600" />
            Session Attendance Thresholds
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Fine-tune when students are marked as Distracted, Idle, or Offline during class.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDirty && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Unsaved changes
            </span>
          )}

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            title="Reset thresholds to default (60s / 180s / 90s)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Reset to defaults
          </button>

          {isDirty && (
            <button
              type="button"
              onClick={handleDiscard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5 text-slate-500" />
              Discard
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || !validation.isValid || saving || !session}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="flex items-center gap-2 p-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Thresholds saved successfully! The Live Board updates in real-time.</span>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 p-4 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-2xl shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Error saving thresholds: {saveError}</span>
        </div>
      )}

      {/* Presets Bar */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-sm font-semibold text-slate-900">Quick Presets</h3>
          {activePreset && (
            <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full font-medium font-sans tabular-nums">
              Preset active: {activePreset.name}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {PRESETS.map((preset) => {
            const isSelected = activePreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-red-600 ring-2 ring-red-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${isSelected ? 'text-red-700' : 'text-slate-900'}`}>
                    {preset.name}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {preset.description}
                </p>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-3 text-[11px] text-slate-600 font-sans tabular-nums">
                  <span>Distracted: {preset.values.distracted_after_seconds}s</span>
                  <span>•</span>
                  <span>Idle: {preset.values.idle_after_seconds}s</span>
                  <span>•</span>
                  <span>Offline: {preset.values.offline_after_seconds}s</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Settings Form Inputs */}
      <div className="bg-slate-50/40 border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <h3 className="text-base font-semibold text-slate-900">
          Threshold Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Distracted */}
          <div className="space-y-2">
            <label htmlFor="distracted_after_seconds" className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
              Mark as Distracted after
              <span className="relative group">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 rounded-lg bg-slate-900 text-[11px] text-white leading-relaxed shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-20">
                  Mark a student distracted if they switch away from the Google Meet tab. Default: 60s (Range: 15–600s).
                </span>
              </span>
            </label>
            <div className="relative rounded-xl shadow-xs">
              <input
                id="distracted_after_seconds"
                type="number"
                min="15"
                max="600"
                step="1"
                value={formValues.distracted_after_seconds}
                onChange={handleInputChange('distracted_after_seconds')}
                className={`w-full rounded-xl py-2.5 px-3.5 text-sm font-sans tabular-nums bg-white outline-none transition-all ${
                  validation.errors.distracted_after_seconds
                    ? 'border border-rose-300 text-rose-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 bg-rose-50/20'
                    : 'border border-slate-200 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 hover:border-slate-300'
                }`}
                placeholder="60"
              />
            </div>
            {validation.errors.distracted_after_seconds && (
              <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {validation.errors.distracted_after_seconds}
              </p>
            )}
          </div>

          {/* Idle */}
          <div className="space-y-2">
            <label htmlFor="idle_after_seconds" className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
              Mark as Idle after
              <span className="relative group">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 rounded-lg bg-slate-900 text-[11px] text-white leading-relaxed shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-20">
                  Mark a student idle if no mouse or keyboard activity is detected. Default: 180s (Range: 60–1800s).
                </span>
              </span>
            </label>
            <div className="relative rounded-xl shadow-xs">
              <input
                id="idle_after_seconds"
                type="number"
                min="60"
                max="1800"
                step="1"
                value={formValues.idle_after_seconds}
                onChange={handleInputChange('idle_after_seconds')}
                className={`w-full rounded-xl py-2.5 px-3.5 text-sm font-sans tabular-nums bg-white outline-none transition-all ${
                  validation.errors.idle_after_seconds
                    ? 'border border-rose-300 text-rose-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 bg-rose-50/20'
                    : 'border border-slate-200 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 hover:border-slate-300'
                }`}
                placeholder="180"
              />
            </div>
            {validation.errors.idle_after_seconds && (
              <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {validation.errors.idle_after_seconds}
              </p>
            )}
          </div>

          {/* Offline */}
          <div className="space-y-2">
            <label htmlFor="offline_after_seconds" className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
              Mark as Offline after
              <span className="relative group">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 rounded-lg bg-slate-900 text-[11px] text-white leading-relaxed shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-20">
                  Mark a student offline if they lose connection or leave. Default: 90s (Range: 60–600s).
                </span>
              </span>
            </label>
            <div className="relative rounded-xl shadow-xs">
              <input
                id="offline_after_seconds"
                type="number"
                min="60"
                max="600"
                step="1"
                value={formValues.offline_after_seconds}
                onChange={handleInputChange('offline_after_seconds')}
                className={`w-full rounded-xl py-2.5 px-3.5 text-sm font-sans tabular-nums bg-white outline-none transition-all ${
                  validation.errors.offline_after_seconds
                    ? 'border border-rose-300 text-rose-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 bg-rose-50/20'
                    : 'border border-slate-200 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 hover:border-slate-300'
                }`}
                placeholder="90"
              />
            </div>
            {validation.errors.offline_after_seconds && (
              <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {validation.errors.offline_after_seconds}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Explanation Panel & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* How statuses are decided */}
        <div className="bg-slate-50/40 border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">How statuses are decided</h3>
            <p className="text-xs text-slate-500 mb-4">
              Evaluated strictly in priority order: <strong className="text-slate-700">Offline &gt; Distracted &gt; Idle &gt; Active</strong>. Updates in real-time as you adjust values above:
            </p>

            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div>
                  <span className="font-semibold text-emerald-900">Active</span>
                  <p className="text-emerald-700 mt-0.5">
                    Google Meet tab is open and focused, and computer has recent user activity.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                <div>
                  <span className="font-semibold text-amber-900">Distracted</span>
                  <p className="text-amber-700 mt-0.5">
                    Meet tab is open, but student has switched to another tab or application for more than <strong className="font-sans tabular-nums">{distractedDisplay}</strong>.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-slate-500 mt-1 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900">Idle (No input)</span>
                  <p className="text-slate-600 mt-0.5">
                    No keyboard or mouse activity detected for more than <strong className="font-sans tabular-nums">{idleDisplay}</strong> (passive listener).
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/60 border border-rose-100 text-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                <div>
                  <span className="font-semibold text-rose-900">Offline</span>
                  <p className="text-rose-700 mt-0.5">
                    No signal received for more than <strong className="font-sans tabular-nums">{offlineDisplay}</strong>, or the Google Meet tab has been closed.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Live Preview Comparison */}
        <div className="bg-slate-50/40 border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col h-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Live Status Preview</h3>
            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {previewComparison.totalParticipants} joined students
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Comparing student distribution under currently saved thresholds versus your unsaved values:
          </p>

          <div className="flex-1 flex flex-col justify-between gap-3">
            {previewComparison.statuses.map((statusKey) => {
              const meta = STATUS_META[statusKey];
              const savedCount = previewComparison.currentCounts[statusKey] || 0;
              const previewCount = previewComparison.previewCounts[statusKey] || 0;
              const diff = previewCount - savedCount;

              return (
                <div
                  key={statusKey}
                  className="flex-1 flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold border ${meta.classes}`}>
                      {meta.icon}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 font-sans">
                      {meta.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 mr-1">Saved:</span>
                      <span className="text-xs font-semibold text-slate-600 font-sans tabular-nums">{savedCount}</span>
                    </div>

                    <span className="text-slate-300">→</span>

                    <div className="text-right min-w-[70px]">
                      <span className="text-xs text-red-600 font-semibold font-sans tabular-nums">{previewCount}</span>
                      {isDirty && diff !== 0 && (
                        <span
                          className={`ml-1.5 text-[10px] font-bold font-sans tabular-nums px-1.5 py-0.5 rounded ${
                            diff > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : `${diff}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {previewComparison.totalParticipants === 0 && (
            <div className="mt-4 p-4 rounded-xl bg-white border border-dashed border-slate-200 text-center text-xs text-slate-500">
              No students have joined this session yet. Start the simulator or have students connect to view live shifts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
