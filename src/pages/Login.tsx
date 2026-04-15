import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Eye, EyeOff, Loader2, AlertCircle, User, Lock, Settings, X, Check, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts';
import { apiClient } from '../services/api';
import { API_CONFIG } from '../config/api';

export function Login() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  // API settings state
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => apiClient.getBaseURL());
  const [apiUrlInput, setApiUrlInput] = useState(() => apiClient.getBaseURL());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  const isCustomUrl = apiUrl !== API_CONFIG.baseURL;

  const openSettings = () => {
    setApiUrlInput(apiClient.getBaseURL());
    setTestStatus('idle');
    setShowApiSettings(true);
  };

  const saveApiUrl = () => {
    const trimmed = apiUrlInput.trim();
    if (!trimmed) return;
    apiClient.setBaseURL(trimmed);
    setApiUrl(trimmed);
    setShowApiSettings(false);
    setTestStatus('idle');
  };

  const resetApiUrl = () => {
    apiClient.resetBaseURL();
    const def = API_CONFIG.baseURL;
    setApiUrl(def);
    setApiUrlInput(def);
    setTestStatus('idle');
  };

  const testConnection = async () => {
    setTestStatus('testing');
    try {
      const trimmed = apiUrlInput.trim();
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(trimmed.replace(/\/api$/, '') + '/health', { signal: controller.signal }).catch(() =>
        fetch(trimmed + '/auth/me', { signal: controller.signal })
      );
      clearTimeout(id);
      setTestStatus(res.status < 500 ? 'ok' : 'fail');
    } catch {
      setTestStatus('fail');
    }
  };

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
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6 relative">
        {/* API settings gear button */}
        <button
          type="button"
          onClick={openSettings}
          title="API Settings"
          className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${isCustomUrl ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          <Settings size={18} />
        </button>

        {/* API Settings Modal */}
        {showApiSettings && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/20 dark:bg-black/40 backdrop-blur-sm rounded-none">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 w-full max-w-sm mx-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Settings size={16} className="text-primary-600" />
                  <h3 className="font-semibold text-sm">API Server Settings</h3>
                </div>
                <button type="button" onClick={() => setShowApiSettings(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Set the backend API URL if the server runs on a different port or host.
              </p>

              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Backend API URL</label>
              <input
                type="url"
                value={apiUrlInput}
                onChange={e => { setApiUrlInput(e.target.value); setTestStatus('idle'); }}
                placeholder="http://localhost:4001/api"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition font-mono"
              />

              {/* Test status */}
              {testStatus !== 'idle' && (
                <div className={`mt-2 flex items-center gap-1.5 text-xs ${testStatus === 'testing' ? 'text-gray-500' : testStatus === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {testStatus === 'testing' && <Loader2 size={12} className="animate-spin" />}
                  {testStatus === 'ok' && <Check size={12} />}
                  {testStatus === 'fail' && <AlertCircle size={12} />}
                  <span>{testStatus === 'testing' ? 'Testing connection…' : testStatus === 'ok' ? 'Server reachable' : 'Could not reach server'}</span>
                </div>
              )}

              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={testStatus === 'testing' || !apiUrlInput.trim()}
                  className="flex-1 py-2 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                >
                  {testStatus === 'testing' ? 'Testing…' : 'Test'}
                </button>
                <button
                  type="button"
                  onClick={resetApiUrl}
                  title="Reset to default"
                  className="p-2 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  type="button"
                  onClick={saveApiUrl}
                  disabled={!apiUrlInput.trim()}
                  className="flex-1 py-2 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition disabled:opacity-50"
                >
                  Save
                </button>
              </div>

              {isCustomUrl && (
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                  Using custom URL: <span className="font-mono break-all">{apiUrl}</span>
                </p>
              )}
            </div>
          </div>
        )}

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
