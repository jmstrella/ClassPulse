import { useParams, Link } from 'react-router-dom';
import { SessionProvider, useSessionContext } from '../app/SessionContext';
import { sessionTabs } from '../features/registry';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Copy, Check, ExternalLink, ChevronLeft } from 'lucide-react';

function RosterManager() {
  const { session, roster, refresh } = useSessionContext();
  const [open, setOpen] = useState(false);
  const [addText, setAddText] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!session) return null;

  const handleAdd = async () => {
    const lines = addText.split('\n');
    const uniqueNames = new Set<string>();
    const parsed: string[] = [];
    
    for (const line of lines) {
      const col = line.split(',')[0] || '';
      let name = col.trim();
      if (!name) continue;
      if (name.length > 60) name = name.substring(0, 60);
      const lower = name.toLowerCase();
      
      const exists = roster.some(r => r.student_name.toLowerCase() === lower);
      if (!uniqueNames.has(lower) && !exists) {
        uniqueNames.add(lower);
        parsed.push(name);
      }
    }

    if (parsed.length === 0) {
      alert("No new valid names found.");
      return;
    }

    setProcessing(true);
    const inserts = parsed.map(n => ({ session_id: session.id, student_name: n }));
    await supabase.from('roster_entries').insert(inserts);
    setAddText('');
    setProcessing(false);
    refresh();
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this unclaimed name from the roster?')) return;
    setProcessing(true);
    await supabase.from('roster_entries').delete().eq('id', id);
    setProcessing(false);
  };

  const handleRelease = async (id: string) => {
    if (!confirm("Release this entry? This deletes the student's data for this session.")) return;
    setProcessing(true);
    const { error } = await supabase.rpc('release_roster_entry', { p_entry_id: id });
    if (error) alert(error.message);
    setProcessing(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-sm font-medium rounded-md transition-colors border border-slate-200 text-slate-700">
        Manage Roster
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-xl border border-slate-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Manage Roster</h2>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg leading-none">&times;</button>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Add Students</label>
          <textarea 
            value={addText} 
            onChange={e => setAddText(e.target.value)} 
            placeholder="One per line or CSV..." 
            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm font-mono focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none" 
            rows={3} 
          />
          <button 
            onClick={handleAdd} 
            disabled={processing} 
            className="mt-2 bg-[#E11D2E] text-white px-4 py-1.5 rounded-md text-sm font-semibold disabled:opacity-50 hover:bg-[#C8102E] transition-colors duration-200 shadow-xs"
          >
            Add Names
          </button>
        </div>

        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-slate-900">
            Current Roster 
            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-mono">{roster.length}</span>
          </h3>
          <ul className="space-y-2">
            {roster.sort((a,b) => a.student_name.localeCompare(b.student_name)).map(r => (
              <li key={r.id} className="flex justify-between items-center text-sm p-2.5 border border-slate-200 rounded-lg bg-slate-50/50">
                <span className="flex items-center gap-1.5 text-slate-800 font-medium">
                  {r.student_name}
                  {r.participant_id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </span>
                {r.participant_id ? (
                  <button onClick={() => handleRelease(r.id)} disabled={processing} className="text-rose-600 hover:text-rose-800 disabled:opacity-50 text-xs font-semibold uppercase tracking-wider">Release</button>
                ) : (
                  <button onClick={() => handleRemove(r.id)} disabled={processing} className="text-slate-500 hover:text-slate-700 disabled:opacity-50 text-xs font-semibold uppercase tracking-wider">Remove</button>
                )}
              </li>
            ))}
            {roster.length === 0 && <p className="text-sm text-slate-400 italic">No roster entries.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SessionInner() {
  const { session, loading, error, refresh } = useSessionContext();
  const [activeTab, setActiveTab] = useState(sessionTabs[0].id);
  const [copiedCode, setCopiedCode] = useState(false);

  if (loading) return <div className="p-4 text-sm text-slate-500 font-medium">Loading session...</div>;
  if (error || !session) return <div className="p-4 text-rose-700 bg-rose-50 rounded-lg border border-rose-200 text-sm">{error || 'Session not found'}</div>;

  const handleEndSession = async () => {
    if (!confirm('Are you sure you want to end this session?')) return;
    await supabase.from('sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', session.id);
    refresh();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(session.class_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const ActiveComponent = sessionTabs.find(t => t.id === activeTab)?.component;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 shadow-xs border border-slate-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link
            to="/sessions"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#E11D2E] transition-colors duration-200 mb-2 group"
          >
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{session.class_name}</h1>
          <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              session.status === 'live' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${session.status === 'live' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {session.status}
            </span>
            <button 
              onClick={handleCopyCode} 
              className="font-mono bg-slate-100 hover:bg-slate-200/80 text-slate-700 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Copy Class Code"
            >
              <span>{session.class_code}</span>
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>
            {session.meet_link && (
              <a href={session.meet_link} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 text-xs font-medium bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors">
                <span>Google Meet</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2.5">
          {session.status === 'live' && (
            <button onClick={handleEndSession} className="px-3.5 py-1.5 bg-[#E11D2E] text-white rounded-md text-sm font-semibold hover:bg-[#C8102E] transition-colors duration-200 shadow-xs">
              End Session
            </button>
          )}
          <RosterManager />
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {sessionTabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-[#E11D2E] text-[#E11D2E] font-semibold' 
                : 'border-transparent text-slate-500 hover:text-[#E11D2E] hover:border-[#E11D2E]/40 font-medium'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 shadow-xs border border-slate-200 rounded-xl min-h-[400px]">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}

export default function SessionPage() {
  const { sessionId } = useParams();
  if (!sessionId) return null;
  return (
    <SessionProvider sessionId={sessionId}>
      <SessionInner />
    </SessionProvider>
  );
}
