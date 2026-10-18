import { useMemo } from 'react';
import type { Checkin, CheckinResponse, Participant } from '../../lib/types';
import type { Settings } from '../../lib/settings';
import { getStatus, STATUS_META } from '../../lib/status';
import {
  calculateResponseTimeSeconds,
  formatCountdown,
  calculateResponseRate
} from './helpers';
import { Clock, Check } from 'lucide-react';

interface LivePanelProps {
  latestCheckin: Checkin;
  responses: CheckinResponse[];
  participants: Participant[];
  settings: Settings;
  now: Date;
}

export function LivePanel({ latestCheckin, responses, participants, settings, now }: LivePanelProps) {
  const expiresMs = new Date(latestCheckin.expires_at).getTime();
  const secondsLeft = Math.max(0, Math.ceil((expiresMs - now.getTime()) / 1000));
  const isOpen = secondsLeft > 0;

  // Build a map of participantId -> response for fast lookup
  const responseMap = useMemo(() => {
    return new Map(responses.map((r) => [r.participant_id, r]));
  }, [responses]);

  // Non-offline students determine Y
  const nonOfflineCount = useMemo(() => {
    return participants.filter((p) => getStatus(p, settings, now) !== 'offline').length;
  }, [participants, settings, now]);

  // X = number of joined participants who responded
  const respondedCount = useMemo(() => {
    return participants.filter((p) => responseMap.has(p.id)).length;
  }, [participants, responseMap]);

  const Y = nonOfflineCount;
  const X = respondedCount;

  // Compute progress bar percent, handling edge case where responded exceeds non-offline
  const effectiveDenominator = Math.max(Y, X);
  const percent = calculateResponseRate(X, effectiveDenominator);

  // Alphabetical sort of participants
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => a.student_name.localeCompare(b.student_name));
  }, [participants]);

  const sentTimeFormatted = new Date(latestCheckin.sent_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-slate-900">Latest Check-in</h2>
            {isOpen ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Closed
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Sent at {sentTimeFormatted}</p>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <Clock className="w-4 h-4 text-slate-400" />
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              {isOpen ? 'Remaining' : 'Status'}
            </div>
            <div
              className={`text-xs font-bold font-sans tabular-nums ${
                isOpen ? (secondsLeft <= 15 ? 'text-rose-600' : 'text-slate-900') : 'text-slate-500'
              }`}
            >
              {isOpen ? `${formatCountdown(secondsLeft)} left` : 'Expired'}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-5 mb-6">
        <div className="flex justify-between items-center text-sm mb-2">
          <span className="font-medium text-gray-800 font-sans tabular-nums">
            <strong>{X}</strong> of <strong>{Y}</strong> students responded
          </span>
          <span className="text-xs font-bold font-sans tabular-nums text-gray-500">
            {Math.round(percent)}%
          </span>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              percent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          Target denominator excludes students currently offline ({Y} active/idle/distracted).
        </p>
      </div>

      {/* Student List */}
      <div>
        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">
          Students ({participants.length})
        </h3>

        {sortedParticipants.length === 0 ? (
          <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-sm">
            No students have joined this session yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
            {sortedParticipants.map((p) => {
              const resp = responseMap.get(p.id);
              const pStatus = getStatus(p, settings, now);
              const statusMeta = STATUS_META[pStatus];

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-3">
                    <span 
                      title={statusMeta.label}
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        pStatus === 'active' ? 'bg-emerald-500' :
                        pStatus === 'distracted' ? 'bg-amber-500' :
                        pStatus === 'idle' ? 'bg-slate-400' :
                        'bg-rose-500'
                      }`} 
                    />
                    <span className="font-medium text-slate-900 text-sm truncate">
                      {p.student_name}
                    </span>
                  </div>

                  <div>
                    {resp ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-sans tabular-nums">
                          Responded (
                          {calculateResponseTimeSeconds(latestCheckin.sent_at, resp.responded_at)}s)
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span>Waiting</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
