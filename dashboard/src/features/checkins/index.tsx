import { useState, useEffect } from 'react';
import { useSessionContext } from '../../app/SessionContext';
import { useCheckins } from './useCheckins';
import { LivePanel } from './LivePanel';
import { HistoryList } from './HistoryList';
import { isCheckinOpen } from './helpers';
import { Clock, Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function Checkins() {
  const { session, participants, settings } = useSessionContext();
  const {
    checkins,
    responsesByCheckinId,
    latestCheckin,
    earlierCheckins,
    loading,
    error,
    sending,
    sendCheckin,
    refresh
  } = useCheckins(session?.id);

  // Local ticker for reactive button enablement and live countdown updates
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isSessionEnded = session?.status === 'ended';
  const isOpen = isCheckinOpen(latestCheckin, now);
  const isSendDisabled = !session || isSessionEnded || isOpen || sending;

  const handleSendCheckin = async () => {
    try {
      await sendCheckin();
    } catch {
      // Error is captured and handled in hook state
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Check-in Prompts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Prompt students during class to confirm they are actively attending and engaged.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            id="send-checkin-btn"
            onClick={handleSendCheckin}
            disabled={isSendDisabled}
            className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-xs ${
              isSendDisabled
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-95 transition-colors'
            }`}
            title={
              isSessionEnded
                ? 'Session has ended'
                : isOpen
                ? 'A check-in is currently open'
                : 'Send check-in prompt to students'
            }
          >
            {sending ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                <span>Sending...</span>
              </>
            ) : isOpen ? (
              <>
                <Clock className="w-4 h-4 mr-1.5" />
                <span>Check-in Open</span>
              </>
            ) : isSessionEnded ? (
              <>
                <Lock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <span>Session Ended</span>
              </>
            ) : (
              <span>Send check-in</span>
            )}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center justify-between text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="text-xs font-semibold underline hover:text-rose-950 cursor-pointer ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading check-in data...</p>
        </div>
      ) : checkins.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 mb-1">No check-ins sent yet</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Click &quot;Send check-in&quot; to prompt all active students in this session. Their responses
            and response times will update right here in real time.
          </p>
          <button
            type="button"
            onClick={handleSendCheckin}
            disabled={isSendDisabled}
            className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition shadow-xs ${
              isSendDisabled
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-95 transition-colors'
            }`}
          >
            {isSessionEnded ? 'Session Ended' : 'Send first check-in'}
          </button>
        </div>
      ) : (
        /* Content: Live Panel for latest check-in + History of earlier check-ins */
        <div>
          {latestCheckin && (
            <LivePanel
              latestCheckin={latestCheckin}
              responses={responsesByCheckinId[latestCheckin.id] || []}
              participants={participants}
              settings={settings}
              now={now}
            />
          )}

          <HistoryList
            earlierCheckins={earlierCheckins}
            responsesByCheckinId={responsesByCheckinId}
            totalParticipants={participants.length}
          />
        </div>
      )}
    </div>
  );
}
