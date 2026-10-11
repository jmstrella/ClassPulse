import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Zap, CheckCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '../app/AuthProvider';

const FEATURES = [
  { Icon: Zap,         text: 'Live focus & attention board'   },
  { Icon: CheckCircle, text: 'Instant check-in prompts'       },
  { Icon: BarChart3,   text: 'Per-student engagement reports' },
] as const;

export default function LoginPage() {
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp]   = useState(false);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  if (authLoading) return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
        <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-[#E11D2E] animate-spin" />
        Loading…
      </div>
    </div>
  );

  if (user) return <Navigate to="/sessions" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    if (authError) {
      setError(authError.message);
    } else if (isSignUp) {
      setError('Success! If email confirmations are on, check your inbox.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex">

      {/* ── Left column — branding ── */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center bg-slate-50 border-r border-slate-200 p-12">

        {/* Logo lockup */}
        <img src="/logo-lockup.svg" alt="ClassPulse" className="h-12 w-auto" />

        {/* Tagline */}
        <p className="text-3xl font-bold text-slate-900 tracking-tight text-center max-w-md mt-8 leading-snug">
          Real-time student engagement tracking for modern classrooms.
        </p>

        {/* Sub-tagline */}
        <p className="text-slate-500 text-center mt-4 max-w-sm leading-relaxed text-[15px]">
          Track student focus and identify who needs attention without
          interrupting your lesson.
        </p>

        {/* Feature list */}
        <ul className="mt-10 flex flex-col gap-3 w-full max-w-xs">
          {FEATURES.map(({ Icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs"
            >
              <Icon className="w-4 h-4 shrink-0 text-[#E11D2E]" strokeWidth={2} />
              <span className="text-sm font-medium text-slate-600">{text}</span>
            </li>
          ))}
        </ul>

      </div>

      {/* ── Right column — form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-6 py-10">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src="/logo-lockup.svg" alt="ClassPulse" className="h-10 w-auto" />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
              {isSignUp ? 'Create an account' : 'Sign in to your account'}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              {isSignUp
                ? 'Start tracking student engagement in minutes.'
                : 'Enter your details to access your dashboard.'}
            </p>
          </div>

          {/* Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8">

            {error && (
              <div className={`p-3 mb-6 rounded-lg text-sm font-medium border ${
                error.startsWith('Success')
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-xs font-semibold tracking-wider text-slate-500 uppercase mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@school.edu"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-slate-300 px-3.5 py-2.5 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E11D2E] focus:ring-2 focus:ring-[#E11D2E]/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-wider text-slate-500 uppercase mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-slate-300 px-3.5 py-2.5 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E11D2E] focus:ring-2 focus:ring-[#E11D2E]/10 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#E11D2E] hover:bg-[#C8102E] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors duration-200 shadow-sm mt-1 text-sm cursor-pointer"
              >
                {loading ? 'Processing…' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>

            </form>
          </div>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              className="text-sm font-medium text-slate-500 hover:text-[#E11D2E] transition-colors duration-200"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
