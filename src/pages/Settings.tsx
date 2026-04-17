import { useState, useEffect, useCallback } from 'react';
import {
  Save, Loader2, Wifi, Usb, Database,
  Download, Upload, CheckCircle2, AlertCircle, RefreshCw,
  ShieldCheck, ChevronRight, ArrowLeft, ShoppingCart, ToggleLeft, ToggleRight,
  Building2,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { settingsService, userService } from '../services/pos.service';
import { saveThermalConfig, loadThermalConfig, listPrinters, type ThermalPrinterConfig, type PrinterInfo } from '../utils/thermalPrinter';
import type { User } from '../types/pos';

const LS_FBR = 'pos_fbr_settings';
interface FbrSettings { url: string; enabled: boolean; }
type Module = 'overview' | 'company' | 'thermal' | 'database' | 'fbr' | 'sales' | 'user-permissions';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">{label}</label>{children}</div>);
}
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500';

function ModuleCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all text-left group w-full">
      <div className="p-2.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg border border-primary-100 dark:border-primary-800 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-primary-600 transition-colors">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <ChevronRight size={16} className="text-gray-400 group-hover:text-primary-600 shrink-0" />
    </button>
  );
}

export function Settings() {
  const [module, setModule] = useState<Module>('overview');
  const [dbBusy, setDbBusy] = useState(false);
  const [dbMsg, setDbMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [thermal, setThermal] = useState<ThermalPrinterConfig>(loadThermalConfig);
  const [thermalSaving, setThermalSaving] = useState(false);
  const [thermalMsg, setThermalMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [thermalPrinters, setThermalPrinters] = useState<PrinterInfo[]>([]);
  const [thermalLoading, setThermalLoading] = useState(false);
  const [fbr, setFbr] = useState<FbrSettings>(() => {
    try { const raw = localStorage.getItem(LS_FBR); if (raw) return JSON.parse(raw) as FbrSettings; } catch { }
    return { url: 'http://localhost:8524/api/IMSFiscal', enabled: false };
  });
  const [fbrSaving, setFbrSaving] = useState(false);
  const [fbrMsg, setFbrMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [appSettings, setAppSettings] = useState<Record<string, unknown>>({});
  const [appLoading, setAppLoading] = useState(false);
  const [appSaving, setAppSaving] = useState(false);
  const [appMsg, setAppMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [usersSettings, setUsersSettings] = useState<Record<number, Record<string, unknown>>>({});
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSaving, setUsersSaving] = useState<number | null>(null);

  // Company info
  const [company, setCompany] = useState<Record<string, string>>({ businessName: '', address: '', phone: '', ntn: '', strn: '', currency: 'PKR' });
  const [companySaving, setCompanySaving] = useState(false);
  const [companyMsg, setCompanyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);

  const loadCompany = useCallback(async () => {
    setCompanyLoading(true);
    try {
      const data = await settingsService.get();
      setCompany({
        businessName: (data.businessName as string) ?? '',
        address: (data.address as string) ?? '',
        phone: (data.phone as string) ?? '',
        ntn: (data.ntn as string) ?? '',
        strn: (data.strn as string) ?? '',
        currency: (data.currency as string) ?? 'PKR',
      });
    } catch { }
    finally { setCompanyLoading(false); }
  }, []);

  const saveCompany = async () => {
    setCompanySaving(true); setCompanyMsg(null);
    try {
      await settingsService.update(company);
      setCompanyMsg({ ok: true, text: 'Company information saved.' });
    } catch { setCompanyMsg({ ok: false, text: 'Failed to save company info.' }); }
    finally { setCompanySaving(false); }
  };

  const loadAppSettings = useCallback(async () => {
    setAppLoading(true);
    try { const data = await settingsService.getApp(); setAppSettings(data); } catch { }
    finally { setAppLoading(false); }
  }, []);

  const loadUsersAndSettings = useCallback(async () => {
    setUsersLoading(true);
    try {
      const [usersRes, settingsRes] = await Promise.all([userService.list({ pageSize: 200 }), settingsService.getAllUsersSettings()]);
      setUsers(usersRes.data ?? []); setUsersSettings(settingsRes);
    } catch { }
    finally { setUsersLoading(false); }
  }, []);

  useEffect(() => {
    if (module === 'company') loadCompany();
    if (module === 'sales') loadAppSettings();
    if (module === 'user-permissions') { loadAppSettings(); loadUsersAndSettings(); }
  }, [module, loadAppSettings, loadUsersAndSettings, loadCompany]);

  const handleBackup = async () => {
    setDbBusy(true); setDbMsg(null);
    try {
      const blob = await apiClient.getBlob(API_ENDPOINTS.settings.backup);
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `pos-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
      setDbMsg({ ok: true, text: 'Backup downloaded successfully.' });
    } catch (e: unknown) { setDbMsg({ ok: false, text: e instanceof Error ? e.message : 'Backup failed.' }); }
    finally { setDbBusy(false); }
  };
  const handleRestore = async (file: File) => {
    setDbBusy(true); setDbMsg(null);
    try { const text = await file.text(); await apiClient.post(API_ENDPOINTS.settings.restore, JSON.parse(text)); setDbMsg({ ok: true, text: 'Database restored. Please refresh.' }); }
    catch (e: unknown) { setDbMsg({ ok: false, text: e instanceof Error ? e.message : 'Restore failed.' }); }
    finally { setDbBusy(false); }
  };
  const refreshThermalPrinters = async () => {
    setThermalLoading(true);
    try { const p = await listPrinters(); setThermalPrinters(p); if (p.length > 0 && !thermal.printerName) setThermal(prev => ({ ...prev, printerName: p[0].name })); }
    catch { setThermalMsg({ ok: false, text: 'Failed to list printers.' }); }
    finally { setThermalLoading(false); }
  };
  const saveThermalSettings = () => {
    setThermalSaving(true); setThermalMsg(null);
    try { saveThermalConfig(thermal); setThermalMsg({ ok: true, text: 'Thermal printer settings saved.' }); }
    catch { setThermalMsg({ ok: false, text: 'Failed to save.' }); } finally { setThermalSaving(false); }
  };
  const saveFbr = () => {
    setFbrSaving(true); setFbrMsg(null);
    try { localStorage.setItem(LS_FBR, JSON.stringify(fbr)); setFbrMsg({ ok: true, text: 'FBR settings saved.' }); }
    catch { setFbrMsg({ ok: false, text: 'Failed to save.' }); } finally { setFbrSaving(false); }
  };
  const saveAppSetting = async (key: string, value: unknown) => {
    setAppSaving(true); setAppMsg(null);
    try { const data = await settingsService.updateApp({ [key]: value }); setAppSettings(data); setAppMsg({ ok: true, text: 'Setting saved.' }); }
    catch { setAppMsg({ ok: false, text: 'Failed to save setting.' }); } finally { setAppSaving(false); }
  };
  const toggleUserSetting = async (userId: number, key: string, currentValue: unknown) => {
    setUsersSaving(userId);
    try {
      const newVal = !(currentValue ?? appSettings[`sale.${key}`] ?? true);
      const data = await settingsService.updateUserSettings(userId, { [`sale.${key}`]: newVal });
      setUsersSettings(prev => ({ ...prev, [userId]: data }));
    } catch { } finally { setUsersSaving(null); }
  };
  const getUserSettingValue = (userId: number, key: string): boolean => {
    const userVal = usersSettings[userId]?.[`sale.${key}`];
    if (userVal !== undefined) return !!userVal;
    return appSettings[`sale.${key}`] !== false;
  };

  const BackButton = () => (
    <button onClick={() => setModule('overview')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-3">
      <ArrowLeft size={14} /> Back to Settings
    </button>
  );

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><ShieldCheck size={20} className="text-primary-600" /> Settings</h1>

      {module === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ModuleCard icon={<Building2 size={20} />} title="Company Information" description="Business name, address, phone, NTN & STRN" onClick={() => setModule('company')} />
          <ModuleCard icon={<Usb size={20} />} title="Thermal Printer" description="Configure receipt printer connection & layout" onClick={() => setModule('thermal')} />
          <ModuleCard icon={<Database size={20} />} title="Database" description="Backup & restore your database" onClick={() => setModule('database')} />
          <ModuleCard icon={<Wifi size={20} />} title="FBR Integration" description="Federal Board of Revenue settings" onClick={() => setModule('fbr')} />
          <ModuleCard icon={<ShoppingCart size={20} />} title="Sales Settings" description="Price change, discount type & other options" onClick={() => setModule('sales')} />
          <ModuleCard icon={<ShieldCheck size={20} />} title="User Permissions" description="Per-user feature access & restrictions" onClick={() => setModule('user-permissions')} />
        </div>
      )}

      {module === 'company' && (<><BackButton />
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><Building2 size={15} className="text-primary-500" /> Company Information</h2>
          <p className="text-xs text-gray-500">This info appears on reports, PDF invoices, and thermal receipts. Data is stored encrypted.</p>
          {companyLoading ? <div className="flex justify-center py-8"><Loader2 size={20} className="text-primary-600 animate-spin" /></div> : (
            <div className="space-y-3">
              <Field label="Business Name"><input value={company.businessName} onChange={e => setCompany(p => ({ ...p, businessName: e.target.value }))} className={inputCls} /></Field>
              <Field label="Address"><input value={company.address} onChange={e => setCompany(p => ({ ...p, address: e.target.value }))} className={inputCls} /></Field>
              <Field label="Phone"><input value={company.phone} onChange={e => setCompany(p => ({ ...p, phone: e.target.value }))} className={inputCls} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="NTN"><input value={company.ntn} onChange={e => setCompany(p => ({ ...p, ntn: e.target.value }))} className={inputCls} /></Field>
                <Field label="STRN"><input value={company.strn} onChange={e => setCompany(p => ({ ...p, strn: e.target.value }))} className={inputCls} /></Field>
              </div>
              <Field label="Currency"><input value={company.currency} onChange={e => setCompany(p => ({ ...p, currency: e.target.value }))} className={inputCls} /></Field>
            </div>
          )}
          <StatusMsg msg={companyMsg} /><div className="flex justify-end"><SaveBtn loading={companySaving} onClick={saveCompany} label="Save Company Info" /></div>
        </div></>)}

      {module === 'thermal' && (<><BackButton />
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><Usb size={15} className="text-primary-500" /> Thermal Printer</h2>
          <Field label="Connection Type"><div className="flex gap-1">
            {(['USB', 'IP', 'SHARED'] as const).map(t => (
              <button key={t} onClick={() => setThermal(p => ({ ...p, connectionType: t }))} className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${thermal.connectionType === t ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-400 text-primary-600' : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'}`}>
                {t === 'USB' ? '\uD83D\uDDA8 USB' : t === 'IP' ? '\uD83C\uDF10 IP' : '\uD83D\uDCC1 Shared'}
              </button>))}
          </div></Field>
          {thermal.connectionType === 'IP' && <Field label="Printer IP Address"><input value={thermal.ipAddress} onChange={e => setThermal(p => ({ ...p, ipAddress: e.target.value }))} placeholder="192.168.1.100" className={inputCls} /></Field>}
          {(thermal.connectionType === 'USB' || thermal.connectionType === 'SHARED') && (
            <div className="flex gap-2 items-end"><div className="flex-1"><Field label={thermal.connectionType === 'USB' ? 'USB Printer' : 'Shared Printer'}>
              {thermalPrinters.length > 0 ? (
                <select value={thermal.printerName} onChange={e => setThermal(p => ({ ...p, printerName: e.target.value }))} className={inputCls}>
                  <option value="">-- Select --</option>{thermalPrinters.map(p => <option key={p.name} value={p.name}>{p.name} ({p.interface_type})</option>)}
                </select>
              ) : (<input value={thermal.printerName} onChange={e => setThermal(p => ({ ...p, printerName: e.target.value }))} placeholder="Enter printer name or click Detect" className={inputCls} />)}
            </Field></div>
              <button onClick={refreshThermalPrinters} disabled={thermalLoading} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                {thermalLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Detect
              </button></div>)}
          <Field label="Paper Size"><div className="flex gap-1">
            {(['Mm58', 'Mm80'] as const).map(s => (
              <button key={s} onClick={() => setThermal(p => ({ ...p, paperSize: s }))} className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${thermal.paperSize === s ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-400 text-primary-600' : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'}`}>
                {s === 'Mm58' ? '58mm' : '80mm'}
              </button>))}
          </div></Field>
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <p className="text-xs font-medium text-gray-500">Receipt Header</p>
            <Field label="Business Name"><input value={thermal.businessName} onChange={e => setThermal(p => ({ ...p, businessName: e.target.value }))} className={inputCls} /></Field>
            <Field label="Address"><input value={thermal.businessAddress ?? ''} onChange={e => setThermal(p => ({ ...p, businessAddress: e.target.value }))} className={inputCls} /></Field>
            <Field label="Phone"><input value={thermal.businessPhone ?? ''} onChange={e => setThermal(p => ({ ...p, businessPhone: e.target.value }))} className={inputCls} /></Field>
            <Field label="NTN"><input value={thermal.businessNTN ?? ''} onChange={e => setThermal(p => ({ ...p, businessNTN: e.target.value }))} className={inputCls} /></Field>
          </div>
          <StatusMsg msg={thermalMsg} /><div className="flex justify-end"><SaveBtn loading={thermalSaving} onClick={saveThermalSettings} label="Save Thermal Settings" /></div>
        </div></>)}

      {module === 'database' && (<><BackButton />
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><Database size={15} className="text-primary-500" /> Database Backup & Restore</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Backup</p>
              <p className="text-xs text-gray-400">Download a full JSON export of all data.</p>
              <button onClick={handleBackup} disabled={dbBusy} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                {dbBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download Backup
              </button>
            </div>
            <div className="rounded-xl border border-red-100 dark:border-red-900/40 p-4 space-y-3 bg-red-50/50 dark:bg-red-900/10">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Restore</p>
              <p className="text-xs text-red-500 font-medium">Warning: Overwrites all current data.</p>
              <label className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg cursor-pointer w-fit">
                {dbBusy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Choose File...
                <input type="file" accept=".json" className="hidden" disabled={dbBusy} onChange={e => { const f = e.target.files?.[0]; if (f) handleRestore(f); e.target.value = ''; }} />
              </label>
            </div>
          </div>
          <StatusMsg msg={dbMsg} />
        </div></>)}

      {module === 'fbr' && (<><BackButton />
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><Wifi size={15} className="text-primary-500" /> FBR Integration</h2>
          <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <div onClick={() => setFbr(f => ({ ...f, enabled: !f.enabled }))} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${fbr.enabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${fbr.enabled ? 'translate-x-4' : 'translate-x-1'}`} />
            </div>
            <div><p className="text-sm font-medium text-gray-800 dark:text-gray-100">FBR Active</p><p className="text-xs text-gray-400">Invoices reported to FBR automatically.</p></div>
          </label>
          <Field label="FBR API URL"><input value={fbr.url} onChange={e => setFbr(f => ({ ...f, url: e.target.value }))} className={inputCls} /></Field>
          <StatusMsg msg={fbrMsg} /><div className="flex justify-end"><SaveBtn loading={fbrSaving} onClick={saveFbr} label="Save FBR Settings" /></div>
        </div></>)}

      {module === 'sales' && (<><BackButton />
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><ShoppingCart size={15} className="text-primary-500" /> Sales & Purchase Settings</h2>
          {appLoading ? <div className="flex justify-center py-8"><Loader2 size={20} className="text-primary-600 animate-spin" /></div> : (
            <div className="space-y-3">
              <ToggleRow label="Allow Price Change in Sale" description="Users can modify unit price during a sale. Admin always has access." checked={appSettings['sale.allowPriceChange'] !== false} loading={appSaving} onToggle={() => saveAppSetting('sale.allowPriceChange', appSettings['sale.allowPriceChange'] === false)} />
              <ToggleRow label="Allow Discount Type Switch" description="Users can switch between fixed (Rs) and percentage (%) discount per row." checked={appSettings['sale.allowDiscountTypeSwitch'] !== false} loading={appSaving} onToggle={() => saveAppSetting('sale.allowDiscountTypeSwitch', appSettings['sale.allowDiscountTypeSwitch'] === false)} />
            </div>
          )}
          <StatusMsg msg={appMsg} />
        </div></>)}

      {module === 'user-permissions' && (<><BackButton />
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2"><ShieldCheck size={15} className="text-primary-500" /> User Permissions</h2>
          <p className="text-xs text-gray-500">Override global settings for individual users. Admin always has full access.</p>
          {usersLoading ? <div className="flex justify-center py-8"><Loader2 size={20} className="text-primary-600 animate-spin" /></div> : (
            <div className="space-y-2">{users.filter(u => u.status !== false).map(u => {
              const isAdmin = u.role === 'ADMIN';
              return (<div key={u.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0">{u.name?.[0]?.toUpperCase() ?? 'U'}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{u.name}</p><p className="text-[10px] text-gray-400">{u.role} &middot; {u.username}</p></div>
                  {isAdmin && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Full Access</span>}
                </div>
                {!isAdmin && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-9">
                  <MiniToggle label="Price Change" checked={getUserSettingValue(u.id, 'allowPriceChange')} loading={usersSaving === u.id} onToggle={() => toggleUserSetting(u.id, 'allowPriceChange', usersSettings[u.id]?.['sale.allowPriceChange'])} />
                  <MiniToggle label="Discount Type Switch" checked={getUserSettingValue(u.id, 'allowDiscountTypeSwitch')} loading={usersSaving === u.id} onToggle={() => toggleUserSetting(u.id, 'allowDiscountTypeSwitch', usersSettings[u.id]?.['sale.allowDiscountTypeSwitch'])} />
                </div>)}
              </div>);
            })}</div>
          )}
        </div></>)}
    </div>
  );
}

function ToggleRow({ label, description, checked, loading, onToggle }: { label: string; description: string; checked: boolean; loading: boolean; onToggle: () => void }) {
  return (<div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50">
    <button onClick={onToggle} disabled={loading} className="mt-0.5 shrink-0">{checked ? <ToggleRight size={22} className="text-primary-500" /> : <ToggleLeft size={22} className="text-gray-400" />}</button>
    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p><p className="text-xs text-gray-400 mt-0.5">{description}</p></div>
    {loading && <Loader2 size={14} className="animate-spin text-gray-400 mt-1" />}
  </div>);
}
function MiniToggle({ label, checked, loading, onToggle }: { label: string; checked: boolean; loading: boolean; onToggle: () => void }) {
  return (<button onClick={onToggle} disabled={loading} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left">
    {checked ? <ToggleRight size={16} className="text-primary-500 shrink-0" /> : <ToggleLeft size={16} className="text-gray-400 shrink-0" />}
    <span className={checked ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>{label}</span>
    {loading && <Loader2 size={11} className="animate-spin text-gray-400" />}
  </button>);
}
function SaveBtn({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (<button onClick={onClick} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
    {loading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {label}
  </button>);
}
function StatusMsg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (<div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${msg.ok ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
    {msg.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />} {msg.text}
  </div>);
}