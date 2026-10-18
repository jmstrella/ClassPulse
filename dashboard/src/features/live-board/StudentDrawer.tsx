import { useEffect, useState, useRef } from 'react';
import { useSessionContext } from '../../app/SessionContext';
import { supabase } from '../../lib/supabase';
import { STATUS_META } from '../../lib/status';
import { formatTimeAgo } from '../../lib/format';
import type { BoardRow } from '../../lib/board';
import ActivityTimeline from './ActivityTimeline';

export { default as ActivityTimeline } from './ActivityTimeline';

type StudentDrawerProps = {
  row: BoardRow;
  onClose: () => void;
};

function formatDuration(ms: number) {
  if (ms < 0) ms = 0;
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function getStatusReason(row: BoardRow, now: Date, sessionEndedAt?: string | null) {
  if (!row.participant) return '';

  const referenceTime = sessionEndedAt ? new Date(sessionEndedAt) : now;

  switch (row.status) {
    case 'offline': {
      const ts = row.participant.last_seen_at || row.participant.joined_at;
      const duration = formatDuration(referenceTime.getTime() - new Date(ts).getTime());
      return sessionEndedAt
        ? `Offline: No signal for ${duration} prior to session end.`
        : `No signal received for ${duration}`;
    }
    case 'idle': {
      const ts = row.participant.idle_since || row.participant.last_seen_at || row.participant.joined_at;
      const duration = formatDuration(referenceTime.getTime() - new Date(ts).getTime());
      return sessionEndedAt
        ? `Idle: No input for ${duration} prior to session end.`
        : `No mouse or keyboard input for ${duration}`;
    }
    case 'distracted': {
      const ts = row.participant.unfocused_since || row.participant.last_seen_at || row.participant.joined_at;
      const duration = formatDuration(referenceTime.getTime() - new Date(ts).getTime());
      return sessionEndedAt
        ? `Distracted: Tab unfocused for ${duration} prior to session end.`
        : `Meet tab not focused for ${duration}`;
    }
    case 'active':
      return sessionEndedAt ? 'Active until session ended.' : 'Active in Google Meet';
    default:
      return '';
  }
}

export default function StudentDrawer({ row, onClose }: StudentDrawerProps) {
  const { now, session } = useSessionContext();
  const [heartbeats, setHeartbeats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Animate in
  useEffect(() => {
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setTimeout(onClose, 300);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scrolling while drawer is open
  useEffect(() => {
    document.body.classList.add('overflow-hidden');
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.classList.remove('overflow-hidden');
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Focus the drawer on mount
  useEffect(() => {
    drawerRef.current?.focus();
  }, []);

  // Fetch heartbeats if joined
  useEffect(() => {
    if (!row.participant) return;

    async function fetchHeartbeats() {
      if (!row.participant) return;

      let query = supabase
        .from('heartbeats')
        .select('*')
        .eq('participant_id', row.participant.id)
        .order('created_at', { ascending: true });

      if (session?.started_at) {
        query = query.gte('created_at', session.started_at);
      }
      if (session?.ended_at) {
        query = query.lte('created_at', session.ended_at);
      }

      const { data, error } = await query.limit(2000);

      if (!error && data) {
        setHeartbeats(data);
      }
      setIsLoading(false);
    }

    fetchHeartbeats();
    if (session?.ended_at) return;
    
    const interval = setInterval(fetchHeartbeats, 15000);
    return () => clearInterval(interval);
  }, [row.participant, session?.started_at, session?.ended_at]);

  const meta = STATUS_META[row.status];

  return (
    <>
      <div 
        className={`fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm w-screen h-screen transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={handleClose} 
        aria-hidden="true" 
      />
      <div 
        ref={drawerRef}
        role="dialog" 
        aria-modal="true" 
        aria-label={`Student details for ${row.name}`}
        tabIndex={-1}
        className={`fixed inset-y-0 right-0 w-full sm:w-[26rem] bg-white/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col outline-none overflow-y-auto transform transition-transform duration-500 ease-out border-l border-slate-200/50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 pb-4 border-b border-slate-200/60 flex justify-between items-start bg-white/60">
          <div>
            <h2 className="text-xl font-bold text-slate-900 truncate pr-4 tracking-tight">{row.name}</h2>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mt-2.5 border ${meta.classes}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
              {meta.label}
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-2 focus:outline-none focus:ring-2 focus:ring-slate-400 rounded-full transition-all"
            aria-label="Close drawer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 flex-1 space-y-6">
          {!row.participant ? (
            <div className="text-slate-500 text-center mt-12 bg-slate-50/50 p-8 rounded-2xl border border-slate-100 border-dashed text-sm">
              Has not joined yet
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Reason Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-colors">
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  row.status === 'active' ? 'bg-emerald-500' :
                  row.status === 'distracted' ? 'bg-amber-500' :
                  row.status === 'idle' ? 'bg-slate-400' :
                  row.status === 'offline' ? 'bg-rose-500' : 'bg-slate-300'
                }`}></div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block ml-2">Current State</span>
                <p className="text-slate-800 font-semibold ml-2 text-sm leading-relaxed">
                  {getStatusReason(row, now, session?.ended_at)}
                </p>
              </div>

              {/* Timestamps */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4 block">Session Times</span>
                <div className="space-y-4 text-sm text-slate-700">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100/80">
                    <span className="font-medium text-slate-500 text-xs">Joined</span> 
                    <span className="text-slate-800 font-semibold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60 text-xs font-sans tabular-nums">{new Date(row.participant.joined_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  {row.participant.last_seen_at && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-500 text-xs">Last Seen</span> 
                      <span className="text-slate-800 font-semibold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60 text-xs">{formatTimeAgo(row.participant.last_seen_at, now)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Activity Timeline */}
              <ActivityTimeline
                heartbeats={heartbeats}
                isLoading={isLoading}
                participant={row.participant}
                fallbackStatus={row.status}
                session={session}
                now={now}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
