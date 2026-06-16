import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Lock, Copy, Check, Loader2, Key } from 'lucide-react';

interface LicenseInfo {
    active: boolean;
    hwid: string;
    expires_at: string;
    days_remaining: number;
}

export function LicensingGuard({ children }: { children: React.ReactNode }) {
    const isTauri = !!(window as any).__TAURI_INTERNALS__;
    
    // If not running in Tauri (e.g. browser dev mode), bypass the check
    if (!isTauri) {
        return <>{children}</>;
    }

    const [status, setStatus] = useState<LicenseInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [licenseKey, setLicenseKey] = useState('');
    const [activating, setActivating] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const checkStatus = async () => {
        try {
            const res = await invoke<LicenseInfo>('get_licensing_status');
            setStatus(res);
        } catch (err: any) {
            setError(err?.toString() || 'Failed to check license status');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    const handleCopyHwid = () => {
        if (status?.hwid) {
            navigator.clipboard.writeText(status.hwid);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!licenseKey.trim()) return;
        setActivating(true);
        setError('');
        try {
            const res = await invoke<LicenseInfo>('activate_license', { key: licenseKey.trim() });
            if (res.active) {
                setStatus(res);
                setLicenseKey('');
            } else {
                setError('Activation succeeded but license remains inactive. Check key validity.');
            }
        } catch (err: any) {
            setError(err?.toString() || 'Activation failed. Invalid license key.');
        } finally {
            setActivating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white">
                <Loader2 size={36} className="animate-spin text-primary-500 mb-4" />
                <p className="text-sm font-medium text-gray-400">Verifying license key…</p>
            </div>
        );
    }

    if (status && status.active) {
        return (
            <>
                {children}
                {status.days_remaining <= 30 && (
                    <div className="fixed bottom-4 right-4 z-50 bg-amber-500 text-white px-4 py-3 rounded-xl shadow-lg border border-amber-400 flex items-center gap-3 animate-bounce max-w-sm">
                        <Lock size={18} className="shrink-0" />
                        <div className="text-xs">
                            <p className="font-bold">License Expiry Warning</p>
                            <p>Your license expires in {status.days_remaining} days ({new Date(status.expires_at).toLocaleDateString()}). Please renew.</p>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white p-6 font-sans selection:bg-primary-500 selection:text-white">
            {/* Background design accents */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -z-10 animate-pulse" />

            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
                {/* Glowing top line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary-500 to-purple-500" />
                
                <div className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-2">
                        <Lock size={20} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">License Required</h1>
                    <p className="text-xs text-gray-400">
                        {status?.expires_at === 'Clock Tampering Detected' 
                            ? 'System clock tampering detected. Set your system clock correctly.' 
                            : 'This copy of the application is unlicensed or has expired.'}
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Hardware ID display */}
                    <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
                            <span>YOUR HARDWARE ID</span>
                            <button 
                                type="button"
                                onClick={handleCopyHwid} 
                                className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors font-medium cursor-pointer"
                            >
                                {copied ? (
                                    <>
                                        <Check size={12} /> Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy size={12} /> Copy
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="font-mono text-[11px] break-all bg-gray-900/50 p-2.5 rounded border border-gray-800 text-gray-300 select-all tracking-wider text-center">
                            {status?.hwid}
                        </p>
                    </div>

                    {/* License Input Form */}
                    <form onSubmit={handleActivate} className="space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 tracking-wider block">ENTER LICENSE KEY</label>
                            <div className="relative">
                                <textarea
                                    value={licenseKey}
                                    onChange={e => setLicenseKey(e.target.value)}
                                    placeholder="Paste your 1-year activation license key here..."
                                    rows={3}
                                    className="w-full pl-3 pr-3 py-2 text-xs border border-gray-800 rounded-xl bg-gray-950 text-gray-100 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 placeholder-gray-600 resize-none font-mono"
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg text-center font-medium">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={activating || !licenseKey.trim()}
                            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:hover:bg-primary-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-primary-600/10 transition-colors cursor-pointer"
                        >
                            {activating ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" /> Activating…
                                </>
                            ) : (
                                <>
                                    <Key size={14} /> Activate License
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
