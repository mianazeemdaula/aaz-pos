import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Eye, EyeOff, Loader2, AlertCircle, User, Lock } from 'lucide-react';
import { useAuth } from '../contexts';

export function Login() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const ok = await login(username, password);
      if (ok) {
        navigate('/dashboard');
      } else {
        setError('Invalid username or password. Please try again.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel – branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-linear-to-br from-secondary-800 via-secondary-700 to-primary-600 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <ShoppingBag size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">AAZ POS</span>
        </div>
        <div>
          <h2 className="text-4xl font-extrabold leading-tight mb-4">
            Manage your business<br />smarter & faster
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Complete point-of-sale solution — sales, purchases, inventory,<br />
            employees, reports and much more in one place.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { label: 'Sales', icon: '🛒' },
              { label: 'Inventory', icon: '📦' },
              { label: 'Reports', icon: '📊' },
            ].map(f => (
              <div key={f.label} className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">{f.icon}</div>
                <div className="text-xs font-medium text-white/80">{f.label}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/40 text-xs">© {new Date().getFullYear()} AAZ Point of Sale</p>
      </div>

      {/* Right panel – login form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-16 h-16 bg-linear-to-br from-secondary-700 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-secondary-200 dark:shadow-secondary-900">
              <ShoppingBag size={30} className="text-white" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to your POS account</p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Username</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoFocus
                    placeholder="Enter your username"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  />
                  <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-linear-to-r from-secondary-700 to-primary-600 hover:from-secondary-800 hover:to-primary-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-secondary-200 dark:shadow-secondary-900 mt-2"
              >
                {isLoading && <Loader2 size={15} className="animate-spin" />}
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
