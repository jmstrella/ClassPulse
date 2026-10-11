import type { Participant } from './types';
import type { Settings } from './settings';

export type ParticipantStatus = 'active' | 'distracted' | 'idle' | 'offline';
export type Status = ParticipantStatus | 'not_joined';

export function getStatus(p: Participant, settings: Settings, now: Date): ParticipantStatus {
  if (!p.last_seen_at || !p.meet_tab_open) return 'offline';

  const elapsedOffline = (now.getTime() - new Date(p.last_seen_at).getTime()) / 1000;
  if (elapsedOffline > settings.offline_after_seconds) return 'offline';

  if (!p.meet_tab_focused && p.unfocused_since) {
    const elapsedUnfocused = (now.getTime() - new Date(p.unfocused_since).getTime()) / 1000;
    if (elapsedUnfocused > settings.distracted_after_seconds) return 'distracted';
  }

  if ((p.system_state === 'idle' || p.system_state === 'locked') && p.idle_since) {
    const elapsedIdle = (now.getTime() - new Date(p.idle_since).getTime()) / 1000;
    if (elapsedIdle > settings.idle_after_seconds) return 'idle';
  }

  return 'active';
}

export const STATUS_META: Record<Status, { label: string; icon: string; classes: string }> = {
  offline: { label: 'Offline', icon: '•', classes: 'bg-rose-50 text-rose-700 border-rose-200' },
  distracted: { label: 'Distracted', icon: '•', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  idle: { label: 'Idle', icon: '•', classes: 'bg-slate-50 text-slate-600 border-slate-200' },
  active: { label: 'Active', icon: '•', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  not_joined: { label: 'Not joined', icon: '•', classes: 'bg-slate-50 text-slate-500 border-slate-200' }
};
