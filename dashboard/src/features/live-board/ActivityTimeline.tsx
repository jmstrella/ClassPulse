import { useMemo } from 'react';
import type { Session } from '../../lib/types';
import { STATUS_META, type Status } from '../../lib/status';

export interface TimelineSegment {
  id: string | number;
  status: Status;
  startMs: number;
  endMs: number;
  label: string;
}

export interface ActivityTimelineProps {
  heartbeats?: any[];
  isLoading?: boolean;
  participant?: {
    id: string;
    joined_at: string;
    last_seen_at?: string | null;
  } | null;
  fallbackStatus: Status;
  session: Session | null;
  now: Date;
}

export function computeTimelineSegments(
  heartbeats: any[] | undefined,
  participant: { joined_at: string; last_seen_at?: string | null } | null | undefined,
  session: Session | null,
  now: Date,
  fallbackStatus: Status
): { segments: TimelineSegment[]; durationLabel: string; durationMinutes: number } {
  const NUM_BUCKETS = 30;
  const sessionEndMs = session?.ended_at ? new Date(session.ended_at).getTime() : now.getTime();
  const rawStartMs = session?.started_at
    ? new Date(session.started_at).getTime()
    : participant?.joined_at
      ? new Date(participant.joined_at).getTime()
      : sessionEndMs - 30 * 60 * 1000;

  // Guard against invalid or future start times
  const sessionStartMs =
    !isNaN(rawStartMs) && rawStartMs < sessionEndMs ? rawStartMs : sessionEndMs - 30 * 60 * 1000;

  const totalDurationMs = Math.max(sessionEndMs - sessionStartMs, 60 * 1000);
  const durationMinutes = Math.max(1, Math.round(totalDurationMs / (60 * 1000)));
  const durationLabel =
    durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
      : `${durationMinutes}m`;

  const bucketDurationMs = totalDurationMs / NUM_BUCKETS;
  const joinedMs = participant?.joined_at ? new Date(participant.joined_at).getTime() : NaN;

  // Fallback: If heartbeats array is empty or missing, always render colored segments matching known state
  if (!heartbeats || heartbeats.length === 0) {
    const validFallbackStatus: Status = fallbackStatus || 'active';
    const fallbackSegments: TimelineSegment[] = Array.from({ length: NUM_BUCKETS }, (_, i) => {
      const bStart = sessionStartMs + i * bucketDurationMs;
      const bEnd = bStart + bucketDurationMs;

      let segStatus: Status = validFallbackStatus;
      if (!isNaN(joinedMs) && bEnd < joinedMs) {
        segStatus = 'offline';
      }

      return {
        id: `fb-${i}`,
        status: segStatus,
        startMs: bStart,
        endMs: bEnd,
        label: STATUS_META[segStatus]?.label || 'Active'
      };
    });

    return { segments: fallbackSegments, durationLabel, durationMinutes };
  }

  // Parse and sort heartbeats by timestamp
  const sortedHeartbeats = [...heartbeats]
    .map((hb) => {
      let status: Status = 'active';
      if (!hb.meet_tab_open) status = 'offline';
      else if (!hb.meet_tab_focused) status = 'distracted';
      else if (hb.system_state === 'idle' || hb.system_state === 'locked') status = 'idle';

      return {
        timestamp: new Date(hb.created_at).getTime(),
        status
      };
    })
    .filter((hb) => !isNaN(hb.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (sortedHeartbeats.length === 0) {
    const validFallbackStatus: Status = fallbackStatus || 'active';
    const fallbackSegments: TimelineSegment[] = Array.from({ length: NUM_BUCKETS }, (_, i) => ({
      id: `fb-empty-${i}`,
      status: validFallbackStatus,
      startMs: sessionStartMs + i * bucketDurationMs,
      endMs: sessionStartMs + (i + 1) * bucketDurationMs,
      label: STATUS_META[validFallbackStatus]?.label || 'Active'
    }));

    return { segments: fallbackSegments, durationLabel, durationMinutes };
  }

  const offlineThresholdMs = (session?.settings?.offline_after_seconds ?? 90) * 1000;

  // Bucket heartbeats into dynamic segments across the session duration
  const segments: TimelineSegment[] = Array.from({ length: NUM_BUCKETS }, (_, i) => {
    const bStart = sessionStartMs + i * bucketDurationMs;
    const bEnd = bStart + bucketDurationMs;

    // Before student joined
    if (!isNaN(joinedMs) && bEnd < joinedMs) {
      return {
        id: `bucket-${i}`,
        status: 'offline',
        startMs: bStart,
        endMs: bEnd,
        label: 'Offline (Not joined yet)'
      };
    }

    // Heartbeats strictly within this bucket
    const inBucket = sortedHeartbeats.filter((hb) => hb.timestamp >= bStart && hb.timestamp <= bEnd);

    let status: Status;
    if (inBucket.length > 0) {
      // Pick the latest status in the bucket
      status = inBucket[inBucket.length - 1].status;
    } else {
      // Look for the most recent heartbeat before this bucket
      const previousHbs = sortedHeartbeats.filter((hb) => hb.timestamp < bStart);
      if (previousHbs.length > 0) {
        const lastHb = previousHbs[previousHbs.length - 1];
        if (bStart - lastHb.timestamp > offlineThresholdMs) {
          status = 'offline';
        } else {
          status = lastHb.status;
        }
      } else {
        status = 'offline';
      }
    }

    return {
      id: `bucket-${i}`,
      status,
      startMs: bStart,
      endMs: bEnd,
      label: STATUS_META[status]?.label || 'Active'
    };
  });

  return { segments, durationLabel, durationMinutes };
}

export default function ActivityTimeline({
  heartbeats = [],
  isLoading = false,
  participant,
  fallbackStatus,
  session,
  now
}: ActivityTimelineProps) {
  const { segments, durationLabel, durationMinutes } = useMemo(
    () => computeTimelineSegments(heartbeats, participant, session, now, fallbackStatus),
    [heartbeats, participant, session, now, fallbackStatus]
  );

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Session Activity
        </h3>
        <span className="text-[11px] font-medium text-slate-400 font-sans tabular-nums">
          {durationLabel}
        </span>
      </div>

      {isLoading ? (
        <div className="w-full h-10 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
      ) : (
        <>
          <div className="flex w-full h-10 gap-0.5 rounded-xl overflow-hidden bg-slate-50 border border-slate-200/60 shadow-inner p-1">
            {segments.map((seg) => {
              let bgColor = 'bg-slate-300';
              if (seg.status === 'active') bgColor = 'bg-emerald-500';
              if (seg.status === 'distracted') bgColor = 'bg-amber-500';
              if (seg.status === 'idle') bgColor = 'bg-slate-400';
              if (seg.status === 'offline') bgColor = 'bg-rose-500';

              const timeStart = new Date(seg.startMs).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });
              const timeEnd = new Date(seg.endMs).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={seg.id}
                  className={`flex-1 ${bgColor} rounded-xs opacity-90 hover:opacity-100 hover:scale-y-110 transition-all cursor-pointer`}
                  title={`${timeStart} – ${timeEnd} • ${seg.label}`}
                />
              );
            })}
          </div>

          {/* Timeline Markers */}
          <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-2 px-1 tracking-wide font-sans tabular-nums">
            <span>-{durationLabel}</span>
            <span>-{Math.round(durationMinutes / 2)}m</span>
            <span>{session?.ended_at ? 'Ended' : 'Now'}</span>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs font-medium mt-5 justify-center bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" /> Active
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" /> Distracted
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-slate-400" /> Idle
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" /> Offline
            </div>
          </div>
        </>
      )}
    </div>
  );
}
