import { Outlet, Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function AppLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <Link
          to="/sessions"
          className="flex items-center hover:opacity-80 transition-opacity"
        >
          <img
            src="/logo-lockup.svg"
            alt="ClassPulse"
            className="h-10 w-auto"
          />
        </Link>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500 hidden sm:block">{user.email}</span>
            <button
              onClick={signOut}
              className="text-sm font-medium px-4 py-2 rounded-md text-[#E11D2E] border border-[#E11D2E] bg-transparent hover:bg-red-50 transition-colors duration-200"
            >
              Sign out
            </button>
          </div>
        )}
      </header>
      <main className="p-6 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
