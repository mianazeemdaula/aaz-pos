import { useState, useEffect } from 'react';
import {
  Save, Loader2, Wifi, Usb, Network, Database,
  Download, Upload, CheckCircle2, AlertCircle, RefreshCw,
} from 'lucide-react';
import { settingsService } from '../services/pos.service';
import { apiClient } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { savePrinterConfig, loadPrinterConfig } from '../utils/printer';
import { saveThermalConfig, loadThermalConfig, listPrinters, type ThermalPrinterConfig, type PrinterInfo } from '../utils/thermalPrinter';

// ─── LocalStorage keys ────────────────────────────────────────────────────────
const LS_API_URL = 'pos_api_url';
const LS_FBR = 'pos_fbr_settings';

// ─── Types ────────────────────────────────────────────────────────────────────
type PrinterType = 'USB' | 'NETWORK' | 'SHARED';

interface PrinterSettings {
  type: PrinterType;
  ip: string;
  port: string;
  sharedName: string;
  usbPort: string;
}

interface FbrSettings {
  url: string;
  enabled: boolean;
}

type Tab = 'api' | 'printer' | 'thermal' | 'database' | 'fbr';

// ─── Field helper ─────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500';

// ─── Main Component ───────────────────────────────────────────────────────────
export function Settings() {
  const [tab, setTab] = useState<Tab>('api');

  // ── API URL ──────────────────────────────────────────────────────────────
  const [apiUrl, setApiUrl] = useState(() =>
    localStorage.getItem(LS_API_URL) || 'http://localhost:3000/api'
  );
  const [apiSaving, setApiSaving] = useState(false);
  const [apiMsg, setApiMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Business settings (from server) ─────────────────────────────────────
  const [serverData, setServerData] = useState<Record<string, unknown>>({});
  const [serverLoading, setServerLoading] = useState(false);
  const [serverSaving, setServerSaving] = useState(false);

  // ── Printer ──────────────────────────────────────────────────────────────
  const [printer, setPrinter] = useState<PrinterSettings>(() => {
    const cfg = loadPrinterConfig();
    return {
      type: (cfg?.connection_type === 'NETWORK' ? 'NETWORK' : cfg?.connection_type === 'SERIAL' ? 'USB' : 'USB') as PrinterType,
      ip: String(cfg?.ip_address ?? '192.168.1.100'),
      port: String(cfg?.port ?? '9100'),
      sharedName: String(cfg?.shared_name ?? ''),
      usbPort: String(cfg?.usb_port ?? 'COM1'),
    };
  });
  const [printerSaving, setPrinterSaving] = useState(false);
  const [printerMsg, setPrinterMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Database ─────────────────────────────────────────────────────────────
  const [dbBusy, setDbBusy] = useState(false);
  const [dbMsg, setDbMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Thermal Printer ──────────────────────────────────────────────────────
  const [thermal, setThermal] = useState<ThermalPrinterConfig>(loadThermalConfig);
  const [thermalSaving, setThermalSaving] = useState(false);
  const [thermalMsg, setThermalMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [thermalPrinters, setThermalPrinters] = useState<PrinterInfo[]>([]);
  const [thermalLoading, setThermalLoading] = useState(false);

  // ── FBR ──────────────────────────────────────────────────────────────────
  const [fbr, setFbr] = useState<FbrSettings>(() => {
    try {
      const raw = localStorage.getItem(LS_FBR);
      if (raw) return JSON.parse(raw) as FbrSettings;
    } catch { /* ignore */ }
    return { url: 'http://localhost:8524/api/IMSFiscal', enabled: false };
  });
  const [fbrSaving, setFbrSaving] = useState(false);
  const [fbrMsg, setFbrMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Load server settings on mount
  useEffect(() => {
    setServerLoading(true);
    settingsService.get().then(setServerData).catch(() => { }).finally(() => setServerLoading(false));
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const saveApiUrl = async () => {
    setApiSaving(true);
    setApiMsg(null);
    try {
      const url = apiUrl.trim().replace(/\/$/, '');
      localStorage.setItem(LS_API_URL, url);
      apiClient.setBaseURL(url);
      // Verify connectivity
      await settingsService.get();
      setServerLoading(true);
      settingsService.get().then(setServerData).catch(() => { }).finally(() => setServerLoading(false));
      setApiMsg({ ok: true, text: 'API URL saved and connection verified.' });
    } catch {
      setApiMsg({ ok: false, text: 'URL saved but connection failed — check the server.' });
    } finally {
      setApiSaving(false);
    }
  };

  const saveServerSettings = async () => {
    setServerSaving(true);
    try {
      await settingsService.update(serverData);
      setApiMsg({ ok: true, text: 'Business settings saved.' });
    } catch (e: unknown) {
      setApiMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setServerSaving(false);
    }
  };

  const sf = (key: string, val: unknown) => setServerData(p => ({ ...p, [key]: val }));

  const savePrinter = () => {
    setPrinterSaving(true);
    setPrinterMsg(null);
    try {
      savePrinterConfig({
        connection_type: printer.type === 'NETWORK' ? 'NETWORK' : 'USB',
        ip_address: printer.type === 'NETWORK' ? printer.ip : undefined,
        port: printer.type === 'NETWORK' ? printer.port : printer.usbPort,
        shared_name: printer.type === 'SHARED' ? printer.sharedName : undefined,
      });
      setPrinterMsg({ ok: true, text: 'Printer settings saved.' });
    } catch {
      setPrinterMsg({ ok: false, text: 'Failed to save printer settings.' });
    } finally {
      setPrinterSaving(false);
    }
  };

  const handleBackup = async () => {
    setDbBusy(true);
    setDbMsg(null);
    try {
      const blob = await apiClient.getBlob(API_ENDPOINTS.settings.backup);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDbMsg({ ok: true, text: 'Backup downloaded successfully.' });
    } catch (e: unknown) {
      setDbMsg({ ok: false, text: e instanceof Error ? e.message : 'Backup failed.' });
    } finally {
      setDbBusy(false);
    }
  };

  const handleRestore = async (file: File) => {
    setDbBusy(true);
    setDbMsg(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text); // validate JSON
      await apiClient.post(API_ENDPOINTS.settings.restore, parsed);
      setDbMsg({ ok: true, text: 'Database restored successfully. Please refresh the app.' });
    } catch (e: unknown) {
      setDbMsg({ ok: false, text: e instanceof Error ? e.message : 'Restore failed.' });
    } finally {
      setDbBusy(false);
    }
  };

  const refreshThermalPrinters = async () => {
    setThermalLoading(true);
    try {
      const printers = await listPrinters();
      setThermalPrinters(printers);
      if (printers.length > 0 && !thermal.printerName) {
        setThermal(p => ({ ...p, printerName: printers[0].name }));
      }
    } catch {
      setThermalMsg({ ok: false, text: 'Failed to list printers.' });
    } finally {
      setThermalLoading(false);
    }
  };

  const saveThermalSettings = () => {
    setThermalSaving(true);
    setThermalMsg(null);
    try {
      saveThermalConfig(thermal);
      setThermalMsg({ ok: true, text: 'Thermal printer settings saved.' });
    } catch {
      setThermalMsg({ ok: false, text: 'Failed to save thermal printer settings.' });
    } finally {
      setThermalSaving(false);
    }
  };

  const saveFbr = () => {
    setFbrSaving(true);
    setFbrMsg(null);
    try {
      localStorage.setItem(LS_FBR, JSON.stringify(fbr));
      setFbrMsg({ ok: true, text: 'FBR settings saved.' });
    } catch {
      setFbrMsg({ ok: false, text: 'Failed to save FBR settings.' });
    } finally {
      setFbrSaving(false);
    }
  };

  // ── Tab definitions ───────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'api', label: 'API / Server', icon: <Network size={14} /> },
    { id: 'printer', label: 'Printer', icon: <Usb size={14} /> },
    { id: 'thermal', label: 'Thermal Printer', icon: <Usb size={14} /> },
    { id: 'database', label: 'Database', icon: <Database size={14} /> },
    { id: 'fbr', label: 'FBR', icon: <Wifi size={14} /> },
  ];

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t.id
              ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: API / Server ────────────────────────────────────────────── */}
      {tab === 'api' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Network size={15} className="text-primary-500" /> API Connection
          </h2>

          <Field label="Backend API URL">
            <input
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
              placeholder="http://localhost:3000/api"
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">Change this to point to a different server. Takes effect immediately.</p>
          </Field>

          <StatusMsg msg={apiMsg} />

          <div className="flex justify-end">
            <SaveBtn loading={apiSaving} onClick={saveApiUrl} label="Save & Test Connection" />
          </div>

          {/* Business settings from server */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Business Info</h2>
            {serverLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm"><Loader2 size={14} className="animate-spin" /> Loading…</div>
            ) : (
              <>
                {[
                  { key: 'businessName', label: 'Business Name' },
                  { key: 'address', label: 'Address' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'ntn', label: 'NTN' },
                  { key: 'strn', label: 'STRN' },
                ].map(({ key, label }) => (
                  <Field key={key} label={label}>
                    <input value={String(serverData[key] ?? '')} onChange={e => sf(key, e.target.value)} className={inputCls} />
                  </Field>
                ))}
                <Field label="Default Tax Rate (%)">
                  <input type="number" min={0} step="0.01" value={Number(serverData.defaultTaxRate ?? 0)} onChange={e => sf('defaultTaxRate', Number(e.target.value))} className={inputCls} />
                </Field>
                <Field label="Currency">
                  <input value={String(serverData.currency ?? 'PKR')} onChange={e => sf('currency', e.target.value)} className={inputCls} />
                </Field>
                <div className="flex justify-end pt-1">
                  <SaveBtn loading={serverSaving} onClick={saveServerSettings} label="Save Business Settings" />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Printer ─────────────────────────────────────────────────── */}
      {tab === 'printer' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Usb size={15} className="text-primary-500" /> Printer Settings
          </h2>

          {/* Connection type selector */}
          <div className="flex gap-1">
            {(['USB', 'NETWORK', 'SHARED'] as PrinterType[]).map(t => (
              <button
                key={t}
                onClick={() => setPrinter(p => ({ ...p, type: t }))}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${printer.type === t
                  ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-400 text-primary-600 dark:text-primary-400'
                  : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'
                  }`}
              >
                {t === 'USB' ? '🖨 USB / Serial' : t === 'NETWORK' ? '🌐 Network / IP' : '📁 Windows Shared'}
              </button>
            ))}
          </div>

          {/* USB */}
          {printer.type === 'USB' && (
            <Field label="USB / Serial Port (e.g. COM1, /dev/usb/lp0)">
              <input value={printer.usbPort} onChange={e => setPrinter(p => ({ ...p, usbPort: e.target.value }))} placeholder="COM1" className={inputCls} />
            </Field>
          )}

          {/* Network */}
          {printer.type === 'NETWORK' && (
            <div className="space-y-3">
              <Field label="Printer IP Address">
                <input value={printer.ip} onChange={e => setPrinter(p => ({ ...p, ip: e.target.value }))} placeholder="192.168.1.100" className={inputCls} />
              </Field>
              <Field label="Port">
                <input value={printer.port} onChange={e => setPrinter(p => ({ ...p, port: e.target.value }))} placeholder="9100" className={inputCls} />
              </Field>
            </div>
          )}

          {/* Shared */}
          {printer.type === 'SHARED' && (
            <Field label="Windows Shared Printer Name (e.g. \\\\PCNAME\\PrinterName)">
              <input value={printer.sharedName} onChange={e => setPrinter(p => ({ ...p, sharedName: e.target.value }))} placeholder="\\PCNAME\Printer" className={inputCls} />
            </Field>
          )}

          <StatusMsg msg={printerMsg} />

          <div className="flex justify-end">
            <SaveBtn loading={printerSaving} onClick={savePrinter} label="Save Printer Settings" />
          </div>
        </div>
      )}

      {/* ── Tab: Thermal Printer ─────────────────────────────────────────── */}
      {tab === 'thermal' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Usb size={15} className="text-primary-500" /> Thermal Printer (Invoice Printing)
          </h2>

          {/* Connection type */}
          <Field label="Connection Type">
            <div className="flex gap-1">
              {(['USB', 'IP', 'SHARED'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setThermal(p => ({ ...p, connectionType: t }))}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${thermal.connectionType === t
                    ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-400 text-primary-600 dark:text-primary-400'
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'
                    }`}
                >
                  {t === 'USB' ? '🖨 USB' : t === 'IP' ? '🌐 IP / Network' : '📁 Shared'}
                </button>
              ))}
            </div>
          </Field>

          {/* IP: only IP address */}
          {thermal.connectionType === 'IP' && (
            <Field label="Printer IP Address">
              <input
                value={thermal.ipAddress}
                onChange={e => setThermal(p => ({ ...p, ipAddress: e.target.value }))}
                placeholder="192.168.1.100"
                className={inputCls}
              />
            </Field>
          )}

          {/* USB: select from detected printers */}
          {thermal.connectionType === 'USB' && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Field label="USB Printer">
                  {thermalPrinters.filter(p => p.interface_type?.toLowerCase().includes('usb')).length > 0 ? (
                    <select
                      value={thermal.printerName}
                      onChange={e => setThermal(p => ({ ...p, printerName: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">— Select USB printer —</option>
                      {thermalPrinters
                        .filter(p => p.interface_type?.toLowerCase().includes('usb'))
                        .map(p => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                    </select>
                  ) : thermalPrinters.length > 0 ? (
                    <select
                      value={thermal.printerName}
                      onChange={e => setThermal(p => ({ ...p, printerName: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">— Select printer —</option>
                      {thermalPrinters.map(p => (
                        <option key={p.name} value={p.name}>{p.name} ({p.interface_type})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={thermal.printerName}
                      onChange={e => setThermal(p => ({ ...p, printerName: e.target.value }))}
                      placeholder="Enter printer name or click Detect"
                      className={inputCls}
                    />
                  )}
                </Field>
              </div>
              <button
                onClick={refreshThermalPrinters}
                disabled={thermalLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {thermalLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Detect
              </button>
            </div>
          )}

          {/* SHARED: text input for shared printer name */}
          {thermal.connectionType === 'SHARED' && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Field label="Shared Printer Name (e.g. \\\\PCNAME\\PrinterName)">
                  {thermalPrinters.filter(p => p.interface_type?.toLowerCase().includes('share') || p.interface_type?.toLowerCase().includes('network')).length > 0 ? (
                    <select
                      value={thermal.printerName}
                      onChange={e => setThermal(p => ({ ...p, printerName: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">— Select shared printer —</option>
                      {thermalPrinters.map(p => (
                        <option key={p.name} value={p.name}>{p.name} ({p.interface_type})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={thermal.printerName}
                      onChange={e => setThermal(p => ({ ...p, printerName: e.target.value }))}
                      placeholder="\\PCNAME\PrinterName"
                      className={inputCls}
                    />
                  )}
                </Field>
              </div>
              <button
                onClick={refreshThermalPrinters}
                disabled={thermalLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {thermalLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Detect
              </button>
            </div>
          )}

          {/* Paper size */}
          <Field label="Paper Size">
            <div className="flex gap-1">
              {(['Mm58', 'Mm80'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => setThermal(p => ({ ...p, paperSize: size }))}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${thermal.paperSize === size
                    ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-400 text-primary-600 dark:text-primary-400'
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'
                    }`}
                >
                  {size === 'Mm58' ? '58mm (32 chars)' : '80mm (48 chars)'}
                </button>
              ))}
            </div>
          </Field>

          {/* Business info for receipt header */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Receipt Header Info</p>
            <Field label="Business Name">
              <input
                value={thermal.businessName}
                onChange={e => setThermal(p => ({ ...p, businessName: e.target.value }))}
                placeholder="Your Business Name"
                className={inputCls}
              />
            </Field>
            <Field label="Address">
              <input
                value={thermal.businessAddress ?? ''}
                onChange={e => setThermal(p => ({ ...p, businessAddress: e.target.value }))}
                placeholder="Business address"
                className={inputCls}
              />
            </Field>
            <Field label="Phone">
              <input
                value={thermal.businessPhone ?? ''}
                onChange={e => setThermal(p => ({ ...p, businessPhone: e.target.value }))}
                placeholder="Phone number"
                className={inputCls}
              />
            </Field>
            <Field label="NTN">
              <input
                value={thermal.businessNTN ?? ''}
                onChange={e => setThermal(p => ({ ...p, businessNTN: e.target.value }))}
                placeholder="National Tax Number"
                className={inputCls}
              />
            </Field>
          </div>

          <StatusMsg msg={thermalMsg} />

          <div className="flex justify-end">
            <SaveBtn loading={thermalSaving} onClick={saveThermalSettings} label="Save Thermal Printer Settings" />
          </div>
        </div>
      )}

      {/* ── Tab: Database ─────────────────────────────────────────────────── */}
      {tab === 'database' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Database size={15} className="text-primary-500" /> Database Backup &amp; Restore
          </h2>

          {/* Backup */}
          <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Backup</p>
            <p className="text-xs text-gray-400">Download a full JSON backup of all data from the server.</p>
            <button
              onClick={handleBackup}
              disabled={dbBusy}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              {dbBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download Backup
            </button>
          </div>

          {/* Restore */}
          <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Restore</p>
            <p className="text-xs text-red-400 font-medium">⚠ This will overwrite all existing data. Make sure you have a backup first.</p>
            <label className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg cursor-pointer w-fit">
              {dbBusy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Choose Backup File…
              <input
                type="file"
                accept=".json"
                className="hidden"
                disabled={dbBusy}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleRestore(f); e.target.value = ''; }}
              />
            </label>
          </div>

          <StatusMsg msg={dbMsg} />
        </div>
      )}

      {/* ── Tab: FBR ─────────────────────────────────────────────────────── */}
      {tab === 'fbr' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Wifi size={15} className="text-primary-500" /> FBR Integration
          </h2>

          <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div
              onClick={() => setFbr(f => ({ ...f, enabled: !f.enabled }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${fbr.enabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${fbr.enabled ? 'translate-x-4' : 'translate-x-1'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">FBR Integration Active</p>
              <p className="text-xs text-gray-400">When enabled, invoices are automatically reported to FBR.</p>
            </div>
          </label>

          <Field label="FBR API URL">
            <input
              value={fbr.url}
              onChange={e => setFbr(f => ({ ...f, url: e.target.value }))}
              placeholder="http://localhost:8524/api/IMSFiscal"
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">Default: <span className="font-mono">http://localhost:8524/api/IMSFiscal</span></p>
          </Field>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <RefreshCw size={13} className="mt-0.5 shrink-0" />
            <span>FBR settings are stored locally (client-side). The FBR service must be running on the specified URL for integration to work.</span>
          </div>

          <StatusMsg msg={fbrMsg} />

          <div className="flex justify-end">
            <SaveBtn loading={fbrSaving} onClick={saveFbr} label="Save FBR Settings" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function SaveBtn({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
      {label}
    </button>
  );
}

function StatusMsg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${msg.ok ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
      {msg.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
      {msg.text}
    </div>
  );
}
