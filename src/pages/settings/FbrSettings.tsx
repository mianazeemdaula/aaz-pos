import { useState, useEffect } from 'react';
import {
  Loader2, ShieldCheck, CheckCircle2, AlertCircle, Check
} from 'lucide-react';
import { useGlobalSettings } from '../../contexts/SettingsContext';
import { FBR_CONFIG } from '../../config/api';
import { fbrService } from '../../services/fbr.service';
import { SettingsHeader } from './SettingsHeader';
import { inputCls, labelCls } from './formStyles';

const LS_FBR = 'pos_fbr_settings';
interface FbrSettingsState { url?: string; enabled: boolean; posId?: number; }

export function FbrSettings() {
  const { settings: globalSettings, refreshSettings, setFbrConfig } = useGlobalSettings();

  const [fbr, setFbr] = useState<FbrSettingsState>(globalSettings.fbr);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingFbr, setTestingFbr] = useState(false);

  useEffect(() => {
    setFbr(globalSettings.fbr);
  }, [globalSettings.fbr]);

  const testFbrConnection = async () => {
    setTestingFbr(true);
    setStatusMsg(null);
    try {
      const ok = await fbrService.checkHealth();
      if (ok) {
        setStatusMsg({ ok: true, text: 'Successfully connected to FBR IMS Fiscal Gateway.' });
      } else {
        setStatusMsg({ ok: false, text: 'Could not reach FBR IMS Fiscal Gateway endpoint.' });
      }
    } catch (err) {
      setStatusMsg({ ok: false, text: `FBR test failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      setTestingFbr(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      localStorage.setItem(LS_FBR, JSON.stringify(fbr));
      setFbrConfig(fbr);
      await refreshSettings();
      setStatusMsg({ ok: true, text: 'FBR fiscal settings saved successfully.' });
    } catch (err) {
      setStatusMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to save FBR settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFbr(globalSettings.fbr);
    setStatusMsg({ ok: true, text: 'Form fields reset to saved values.' });
  };

  return (
    <div className="space-y-4">
      <SettingsHeader />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
          <h2 className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
            <ShieldCheck className="text-primary-600" size={16} /> FBR Real-time Fiscal Integration
          </h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
            Configure real-time invoice reporting to Federal Board of Revenue (FBR) IMS fiscal server.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
            <input
              type="checkbox"
              id="fbr-enable"
              checked={fbr.enabled}
              onChange={e => setFbr(f => ({ ...f, enabled: e.target.checked }))}
              className="h-3.5 w-3.5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
            />
            <label htmlFor="fbr-enable" className="text-xs font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
              Enable FBR Real-time Invoice Fiscalization
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2.5">
            <div>
              <label className={labelCls}>FBR POS ID</label>
              <input
                type="number"
                value={fbr.posId ?? FBR_CONFIG.posId}
                onChange={e => setFbr(f => ({ ...f, posId: Number(e.target.value) }))}
                className={inputCls}
                placeholder="123456"
              />
            </div>

            <div>
              <label className={labelCls}>FBR IMS Service Endpoint</label>
              <input
                type="text"
                value={fbr.url || FBR_CONFIG.baseURL}
                onChange={e => setFbr(f => ({ ...f, url: e.target.value }))}
                className={inputCls}
                placeholder="http://localhost:8524/api/IMSFiscal"
              />
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={testFbrConnection}
              disabled={testingFbr}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-md text-xs border border-gray-300 dark:border-gray-600 flex items-center gap-1.5 transition-colors"
            >
              {testingFbr ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Test FBR Gateway Connection
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div>
            {statusMsg && (
              <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border ${
                statusMsg.ok
                  ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
              }`}>
                {statusMsg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{statusMsg.text}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-md text-xs transition-colors"
            >
              Reset Form
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              <span>Save FBR Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
