import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, User, Lock, Settings, X, Check, RotateCcw } from 'lucide-react';
import { AppLogo, APP_NAME } from '../components/ui/AppLogo';
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

  useEffect(() => {
    document.title = "Login | Aazify POS";
  }, []);

  // API settings state
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => apiClient.getBaseURL());
  const [apiUrlInput, setApiUrlInput] = useState(() => apiClient.getBaseURL());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  const isCustomUrl = apiUrl !== API_CONFIG.baseURL;

  // Escape closes the settings dialog, like every other dialog in the app.
  useEffect(() => {
    if (!showApiSettings) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowApiSettings(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showApiSettings]);

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

  const inputCls =
    'w-full h-10 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none transition focus:border-primary-500 focus:ring-3 focus:ring-primary-500/15';

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950">
      {/* Left panel – branding. Same chrome as the app's menu bar, so signing in
          feels like opening the product rather than visiting a website. */}
      <div className="hidden lg:flex relative flex-col justify-between w-[44%] max-w-[640px] bg-gray-900 text-white p-10 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div aria-hidden className="absolute -bottom-40 -right-40 w-[420px] h-[420px] rounded-full bg-primary-600/25 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <AppLogo size={28} />
          <span className="text-base font-semibold tracking-tight">{APP_NAME}</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Run the counter, the stockroom and the books from one place.
          </h2>
          <ul className="mt-6 space-y-2.5 text-sm text-gray-300">
            {[
              'Fast barcode checkout with returns & exchanges',
              'Live stock, purchasing and supplier ledgers',
              'FBR-ready invoicing and daily reports',
            ].map(feature => (
              <li key={feature} className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full bg-primary-500/20 text-primary-300 grid place-items-center shrink-0">
                  <Check size={10} strokeWidth={3} />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-gray-500 text-xs">© {new Date().getFullYear()} {APP_NAME}</p>
      </div>

      {/* Right panel – login form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6 relative">
        {/* API settings gear button */}
        <button
          type="button"
          onClick={openSettings}
          title="API Settings"
          aria-label="API Settings"
          className={`absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-md transition-colors ${isCustomUrl ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          <Settings size={16} />
        </button>

        {/* API Settings Modal */}
        {showApiSettings && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-950/45 backdrop-blur-[2px] p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="API Server Settings"
              className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-750 w-full max-w-sm"
            >
              <div className="flex items-center justify-between h-11 px-4 border-b border-gray-150 dark:border-gray-750">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">API Server Settings</h3>
                <button
                  type="button"
                  onClick={() => setShowApiSettings(false)}
                  aria-label="Close"
                  className="-mr-1.5 w-7 h-7 grid place-items-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Set the backend API URL if the server runs on a different port or host.
                </p>

                <label htmlFor="api-url" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Backend API URL</label>
                <input
                  id="api-url"
                  type="url"
                  value={apiUrlInput}
                  onChange={e => { setApiUrlInput(e.target.value); setTestStatus('idle'); }}
                  placeholder="http://localhost:4001/api"
                  className={`${inputCls} h-9 px-3 font-mono text-[13px]`}
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

                {isCustomUrl && (
                  <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 rounded-md">
                    Using custom URL: <span className="font-mono break-all">{apiUrl}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-150 dark:border-gray-750 rounded-b-lg">
                <button
                  type="button"
                  onClick={resetApiUrl}
                  title="Reset to default"
                  aria-label="Reset to default"
                  className="w-8 h-8 grid place-items-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-50 dark:hover:bg-gray-750 transition"
                >
                  <RotateCcw size={14} />
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={testStatus === 'testing' || !apiUrlInput.trim()}
                  className="h-8 px-3 text-[13px] font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-750 transition disabled:opacity-50"
                >
                  {testStatus === 'testing' ? 'Testing…' : 'Test'}
                </button>
                <button
                  type="button"
                  onClick={saveApiUrl}
                  disabled={!apiUrlInput.trim()}
                  className="h-8 px-4 text-[13px] font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-md transition disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center gap-2 mb-8">
            <AppLogo variant="full" size={64} />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Sign in</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter your account details to open the till.</p>
          </div>

          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 rounded-md text-[13px]">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Username</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="Enter your username"
                  className={`${inputCls} pl-9 pr-3`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="login-password" className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={`${inputCls} pl-9 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading && <Loader2 size={15} className="animate-spin" />}
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-xs text-gray-400 text-center">
            Forgot your password? Ask an administrator to reset it.
          </p>
        </div>
      </div>
    </div>
  );
}
