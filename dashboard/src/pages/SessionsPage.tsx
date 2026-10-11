import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '../lib/types';
import { useNavigate } from 'react-router-dom';

function parseRosterText(text: string): string[] {
  const lines = text.split('\n');
  const uniqueNames = new Set<string>();
  const parsed: string[] = [];

  for (const line of lines) {
    const col = line.split(',')[0] || '';
    let name = col.trim();
    if (!name) continue;
    if (name.length > 60) name = name.substring(0, 60);

    const lower = name.toLowerCase();
    if (!uniqueNames.has(lower)) {
      uniqueNames.add(lower);
      parsed.push(name);
    }
  }
  return parsed;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  // Create Form State
  const [className, setClassName] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [rosterText, setRosterText] = useState('');
  const [selectedPrevSession, setSelectedPrevSession] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('sessions').select('*').order('started_at', { ascending: false });
    if (!error && data) setSessions(data as Session[]);
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleCopyPrevRoster = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPrevSession(id);
    if (!id) return;
    
    const { data } = await supabase.from('roster_entries').select('student_name').eq('session_id', id).order('student_name');
    if (data && data.length > 0) {
      setRosterText(data.map(d => d.student_name).join('\n'));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const { data: sessData, error: sessErr } = await supabase.rpc('create_session', {
        p_class_name: className,
        p_meet_link: meetLink || null
      });

      if (sessErr) throw sessErr;
      const newSession = sessData as any as Session;

      const parsedNames = parseRosterText(rosterText);
      if (parsedNames.length > 0) {
        const inserts = parsedNames.map(name => ({
          session_id: newSession.id,
          student_name: name
        }));
        
        const { error: rostErr } = await supabase.from('roster_entries').insert(inserts);
        if (rostErr) throw rostErr;
      }

      navigate(`/sessions/${newSession.id}`);
    } catch (err: any) {
      setError(err.message || 'Error creating session');
      setCreating(false);
    }
  };

  const parsedPreview = parseRosterText(rosterText);

  if (loading) return <div className="p-4">Loading sessions...</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Your Sessions</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="bg-[#111827] hover:bg-slate-800 text-white transition-colors px-5 py-2.5 rounded-lg font-medium text-sm shadow-xs cursor-pointer">
          {showCreate ? 'Cancel' : 'Create Session'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-6 shadow-xs border border-slate-200 rounded-xl space-y-4">
          {error && <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-sm border border-rose-200">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Class Name</label>
              <input required maxLength={100} value={className} onChange={e => setClassName(e.target.value)} className="w-full border border-slate-300 p-2 rounded-lg text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Meet Link (Optional)</label>
              <input type="url" value={meetLink} onChange={e => setMeetLink(e.target.value)} className="w-full border border-slate-300 p-2 rounded-lg text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900" />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Roster (Optional)</label>
              <select value={selectedPrevSession} onChange={handleCopyPrevRoster} className="text-xs border border-slate-200 p-1.5 rounded-md bg-white text-slate-700">
                <option value="">-- Copy from previous session --</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>{s.class_name} ({new Date(s.started_at).toLocaleDateString()})</option>
                ))}
              </select>
            </div>
            <textarea 
              rows={4} 
              value={rosterText} 
              onChange={e => setRosterText(e.target.value)} 
              placeholder="Paste one name per line, or CSV format (first column)..."
              className="w-full border border-slate-300 p-2 rounded-lg font-mono text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
            <div className="text-xs text-slate-400 mt-1 font-medium">
              {parsedPreview.length} students found (duplicates and blank lines dropped)
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={creating} className="w-full md:w-auto bg-[#E11D2E] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#C8102E] disabled:opacity-50 transition-colors duration-200 shadow-xs cursor-pointer">
              {creating ? 'Creating...' : 'Launch Session'}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {sessions.map(s => (
          <div key={s.id} onClick={() => navigate(`/sessions/${s.id}`)} className="bg-white p-5 shadow-xs border-l-4 border-l-transparent border border-slate-200 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md hover:border-slate-300 hover:border-l-[#E11D2E] hover:bg-slate-50 flex justify-between items-center group">
            <div>
              <h3 className="font-semibold text-base text-[#111827] group-hover:text-[#E11D2E] transition-colors duration-200 flex items-center">
                {s.class_name} 
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded ml-2.5 border border-slate-200">
                  {s.class_code}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">{new Date(s.started_at).toLocaleString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              s.status === 'live' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'live' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {s.status}
            </div>
          </div>
        ))}
        {sessions.length === 0 && !showCreate && (
          <div className="text-center p-12 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
            No sessions yet. Click "Create Session" to get started.
          </div>
        )}
      </div>
    </div>
  );
}
