import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Database, Download, Upload, CheckCircle2,
  AlertCircle, ShieldCheck, ShoppingCart, Building2, Trash2,
  Printer, ShieldAlert, RefreshCw, KeyRound, Check, Users, Save,
  FolderOpen, FolderClock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalSettings } from '../contexts/SettingsContext';
import { PERMISSION_MODULES, PERMISSION_LABELS, defaultPermissions, parsePermissions, flattenPermissions } from '../contexts/SettingsContext';
import type { UserPermissions } from '../contexts/SettingsContext';
import { apiClient } from '../services/api';
import { API_ENDPOINTS, FBR_CONFIG } from '../config/api';
import { userService, settingsService } from '../services/pos.service';
import { saveThermalConfig, listPrinters, type ThermalPrinterConfig, type PrinterInfo } from '../utils/thermalPrinter';
import { invalidateLogoCache } from '../utils/invoices/saleInvoice';
import type { User } from '../types/pos';
import { fbrService } from '../services/fbr.service';
import {
  backupService, readAutoBackupSettings, formatBytes, DEFAULT_AUTO_BACKUP,
  type BackupStatus, type AutoBackupSettings,
} from '../services/backup.service';
import { FolderPicker } from '../components/ui/FolderPicker';

const LS_FBR = 'pos_fbr_settings';
type Module = 'company' | 'thermal' | 'fbr' | 'sales' | 'database' | 'user-permissions';

interface FbrSettings { url?: string; enabled: boolean; posId?: number; }

const inputCls = 'w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors disabled:opacity-50';
const labelCls = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider';

export function Settings() {
  const { user } = useAuth();
  const { settings: globalSettings, refreshSettings, updateCompanySettings, updateAppSettings, setThermalConfig, setFbrConfig } = useGlobalSettings();

  const [activeTab, setActiveTab] = useState<Module>('company');

  // Form states
  const [company, setCompany] = useState(globalSettings.company);
  const [thermal, setThermal] = useState<ThermalPrinterConfig>(globalSettings.thermal);
  const [fbr, setFbr] = useState<FbrSettings>(globalSettings.fbr);
  const [appSettings, setAppSettings] = useState<Record<string, unknown>>(globalSettings.app);

  // Status & loading indicators
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingFbr, setTestingFbr] = useState(false);
  const [thermalPrinters, setThermalPrinters] = useState<PrinterInfo[]>([]);
  const [printerLoading, setPrinterLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [dbBusy, setDbBusy] = useState(false);
  const [pgStatus, setPgStatus] = useState<BackupStatus | null>(null);
  const [autoBackup, setAutoBackup] = useState<AutoBackupSettings>(DEFAULT_AUTO_BACKUP);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);

  // Users & Permissions state
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userPermissions, setUserPermissions] = useState<UserPermissions>(defaultPermissions());
  const [permSaving, setPermSaving] = useState(false);

  // Sync form state with global settings context
  useEffect(() => {
    setCompany(globalSettings.company);
    setThermal(globalSettings.thermal);
    setFbr(globalSettings.fbr);
    setAppSettings(globalSettings.app);
  }, [globalSettings]);

  // Load logo preview
  const loadLogoPreview = useCallback(async () => {
    try {
      const res = await apiClient.get<{ base64: string }>(API_ENDPOINTS.settings.logo);
      if (res.base64) setLogoPreview(`data:image/png;base64,${res.base64}`);
    } catch {
      setLogoPreview(null);
    }
  }, []);

  const loadUsersAndPermissions = useCallback(async () => {
    setUsersLoading(true);
    try {
      const usersRes = await userService.list({ pageSize: 200 });
      const list = usersRes.data ?? [];
      setUsers(list);
      const firstId = selectedUserId ?? (list.length > 0 ? list[0].id : null);
      if (firstId && firstId !== selectedUserId) {
        setSelectedUserId(firstId);
      }
      // Load permissions for the selected user
      if (firstId) {
        const userSettings = await settingsService.getUserSettings(firstId).catch(() => ({}));
        const selectedUser = list.find(u => u.id === firstId);
        setUserPermissions(parsePermissions(userSettings, selectedUser?.role));
      }
    } catch {
    } finally {
      setUsersLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadLogoPreview();
    if (activeTab === 'user-permissions') {
      loadUsersAndPermissions();
    }
  }, [activeTab, loadLogoPreview, loadUsersAndPermissions]);

  // Admin Access Check
  if (user?.role !== 'ADMIN') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 max-w-xl mx-auto my-12 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Administrator Access Required</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You are currently signed in as <strong className="text-gray-800 dark:text-gray-200">{user?.name}</strong> ({user?.role}). System and global configuration settings require Administrator access rights.
        </p>
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
          If you require adjustments to company info, thermal printer, or fiscal setup, please contact your Administrator.
        </div>
      </div>
    );
  }

  // Handle Save All Settings
  const handleSaveAll = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      // 1. Company settings
      await updateCompanySettings(company);

      // 2. App settings (sales rules)
      await updateAppSettings(appSettings);

      // 3. Thermal printer settings
      saveThermalConfig(thermal);
      setThermalConfig(thermal);

      // 4. FBR settings
      localStorage.setItem(LS_FBR, JSON.stringify(fbr));
      setFbrConfig(fbr);

      await refreshSettings();
      setStatusMsg({ ok: true, text: 'All global settings updated and applied successfully.' });
    } catch (err) {
      setStatusMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setCompany(globalSettings.company);
    setThermal(globalSettings.thermal);
    setFbr(globalSettings.fbr);
    setAppSettings(globalSettings.app);
    setStatusMsg({ ok: true, text: 'Form fields reset to saved values.' });
  };

  const refreshPrintersList = async () => {
    setPrinterLoading(true);
    try {
      const list = await listPrinters();
      setThermalPrinters(list);
      if (list.length > 0 && !thermal.printerName) {
        setThermal(prev => ({ ...prev, printerName: list[0].name }));
      }
      setStatusMsg({ ok: true, text: `Found ${list.length} system printer(s).` });
    } catch {
      setStatusMsg({ ok: false, text: 'Failed to list system printers.' });
    } finally {
      setPrinterLoading(false);
    }
  };

  const uploadLogoFile = async (file: File) => {
    setLogoUploading(true);
    try {
      await apiClient.uploadFile(API_ENDPOINTS.settings.logo, file, 'logo');
      const reader = new FileReader();
      reader.onload = e => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
      invalidateLogoCache();
      setStatusMsg({ ok: true, text: 'Logo uploaded successfully.' });
    } catch {
      setStatusMsg({ ok: false, text: 'Failed to upload logo.' });
    } finally {
      setLogoUploading(false);
    }
  };

  const deleteLogoFile = async () => {
    if (!window.confirm("Are you sure you want to remove the logo?")) return;
    setLogoUploading(true);
    try {
      await apiClient.delete(API_ENDPOINTS.settings.logo);
      setLogoPreview(null);
      invalidateLogoCache();
      setStatusMsg({ ok: true, text: 'Logo removed successfully.' });
    } catch {
      setStatusMsg({ ok: false, text: 'Failed to remove logo.' });
    } finally {
      setLogoUploading(false);
    }
  };

  // Probe the server for the Postgres client tools when the tab is opened.
  useEffect(() => {
    if (activeTab !== 'database' || pgStatus) return;
    backupService.status()
      .then(setPgStatus)
      .catch(() => setPgStatus({ available: false, error: 'Could not reach the server.' }));
  }, [activeTab, pgStatus]);

  // Keep the local auto-backup form in step with the saved app settings.
  useEffect(() => {
    setAutoBackup(readAutoBackupSettings(globalSettings.app));
  }, [globalSettings.app]);

  const saveAutoBackup = async (patch: Partial<AutoBackupSettings>) => {
    const next = { ...autoBackup, ...patch };
    setAutoBackup(next);
    setDbBusy(true);
    try {
      // Validate the folder before it becomes the backup target, so a typo is
      // caught now rather than at closing time.
      if (patch.backupDir) {
        const check = await backupService.validateDir(patch.backupDir);
        next.backupDir = check.path;
        setAutoBackup({ ...next });
      }
      await updateAppSettings({ ...next });
      setStatusMsg({ ok: true, text: 'Automatic backup settings saved.' });
      setPgStatus(await backupService.status());
    } catch (e: unknown) {
      setAutoBackup(readAutoBackupSettings(globalSettings.app)); // roll the form back
      setStatusMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not save backup settings.' });
    } finally {
      setDbBusy(false);
    }
  };

  const runFolderBackup = async () => {
    setDbBusy(true);
    try {
      const result = await backupService.run();
      const pruned = result.removed.length ? ` · removed ${result.removed.length} old backup(s)` : '';
      setStatusMsg({ ok: true, text: `Saved ${result.filename} (${formatBytes(result.bytes)})${pruned}` });
      setPgStatus(await backupService.status());
    } catch (e: unknown) {
      setStatusMsg({ ok: false, text: e instanceof Error ? e.message : 'Backup failed.' });
    } finally {
      setDbBusy(false);
    }
  };

  const handleBackup = async (format: 'custom' | 'plain') => {
    setDbBusy(true);
    try {
      const { blob, filename } = await apiClient.downloadFile(API_ENDPOINTS.settings.backup, {
        params: { format },
        timeout: 15 * 60 * 1000, // pg_dump on a large database is not quick
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? `pos-backup.${format === 'custom' ? 'dump' : 'sql'}`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg({
        ok: true,
        text: `Backup downloaded (${(blob.size / 1024 / 1024).toFixed(2)} MB). ` +
          (format === 'custom' ? 'Restore with pg_restore.' : 'Restore with psql.'),
      });
    } catch (e: unknown) {
      setStatusMsg({ ok: false, text: e instanceof Error ? e.message : 'Backup failed.' });
    } finally {
      setDbBusy(false);
    }
  };

  const handleRestore = async (file: File) => {
    if (!window.confirm(
      `Restore from "${file.name}"?\n\n` +
      'This DROPS every existing table and replaces it with the contents of the backup. ' +
      'Current records cannot be recovered afterwards.',
    )) return;

    setDbBusy(true);
    try {
      const result = await apiClient.uploadFile<{ message: string; warnings?: string }>(
        API_ENDPOINTS.settings.restore, file, 'backup',
      );
      if (result.warnings) console.warn('Restore warnings:', result.warnings);
      setStatusMsg({ ok: true, text: `${result.message}. Please refresh the page.` });
    } catch (e: unknown) {
      setStatusMsg({ ok: false, text: e instanceof Error ? e.message : 'Restore failed.' });
    } finally {
      setDbBusy(false);
    }
  };

  const testFbrConnection = async () => {
    setTestingFbr(true);
    try {
      const res = await fbrService.checkHealth();
      if (res.isAvailable) {
        setStatusMsg({ ok: true, text: `FBR Connection Success: ${res.message}` });
      } else {
        setStatusMsg({ ok: false, text: `FBR Connection Failed: ${res.message}` });
      }
    } catch (err) {
      setStatusMsg({ ok: false, text: err instanceof Error ? err.message : 'FBR test failed.' });
    } finally {
      setTestingFbr(false);
    }
  };

  const tabs: { id: Module; label: string; icon: typeof Building2 }[] = [
    { id: 'company', label: 'Company Profile', icon: Building2 },
    { id: 'thermal', label: 'Thermal Printer', icon: Printer },
    { id: 'fbr', label: 'FBR Fiscal Gateway', icon: ShieldCheck },
    { id: 'sales', label: 'Sales & Inventory Rules', icon: ShoppingCart },
    { id: 'database', label: 'Database Backup', icon: Database },
    { id: 'user-permissions', label: 'User Permissions', icon: Users },
  ];

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            Settings & Global Configuration
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configure system business details, thermal printer routing, FBR fiscal integration, and operational rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 rounded-full text-xs font-semibold">
            <KeyRound size={13} /> Admin Access Granted
          </span>
        </div>
      </div>

      {/* TAB NAVIGATION BAR */}
      <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* MAIN SETTINGS FORM CARD CONTAINER */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6">

        {/* TAB 1: COMPANY PROFILE */}
        {activeTab === 'company' && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Building2 className="text-primary-600" size={18} /> Business Profile & Receipt Information
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                These settings appear on customer receipts, invoices, and financial reports across the application.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Business Name *</label>
                <input
                  type="text"
                  value={company.businessName}
                  onChange={e => setCompany(c => ({ ...c, businessName: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. AAZ Supermarket"
                />
              </div>

              <div>
                <label className={labelCls}>Phone / Contact</label>
                <input
                  type="text"
                  value={company.phone}
                  onChange={e => setCompany(c => ({ ...c, phone: e.target.value }))}
                  className={inputCls}
                  placeholder="+92 300 1234567"
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelCls}>Business Address</label>
                <input
                  type="text"
                  value={company.address}
                  onChange={e => setCompany(c => ({ ...c, address: e.target.value }))}
                  className={inputCls}
                  placeholder="Shop #12, Commercial Market, Main Boulevard"
                />
              </div>

              <div>
                <label className={labelCls}>NTN Number</label>
                <input
                  type="text"
                  value={company.ntn}
                  onChange={e => setCompany(c => ({ ...c, ntn: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. 1234567-8"
                />
              </div>

              <div>
                <label className={labelCls}>STRN Number</label>
                <input
                  type="text"
                  value={company.strn}
                  onChange={e => setCompany(c => ({ ...c, strn: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. 3277876543210"
                />
              </div>

              <div>
                <label className={labelCls}>Currency Symbol</label>
                <select
                  value={company.currency}
                  onChange={e => setCompany(c => ({ ...c, currency: e.target.value }))}
                  className={inputCls}
                >
                  <option value="PKR">PKR (Rs)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED (AED)</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Default Sales Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={company.defaultTaxRate}
                  onChange={e => setCompany(c => ({ ...c, defaultTaxRate: Number(e.target.value) }))}
                  className={inputCls}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelCls}>Invoice Footer Note / Terms</label>
                <textarea
                  rows={3}
                  value={company.invoiceNote}
                  onChange={e => setCompany(c => ({ ...c, invoiceNote: e.target.value }))}
                  className={`${inputCls} resize-none`}
                  placeholder="Thank you for shopping with us! Goods once sold can be returned within 7 days with original receipt."
                />
              </div>
            </div>

            {/* Logo Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className={labelCls}>Business Logo (Receipt Header)</label>
              <div className="flex items-center gap-4 mt-2">
                {logoPreview ? (
                  <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white">
                    <img src={logoPreview} alt="Logo" className="h-14 w-auto max-w-[140px] object-contain" />
                    <button
                      type="button"
                      onClick={deleteLogoFile}
                      disabled={logoUploading}
                      className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-sm"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="h-14 w-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-xs text-gray-400">
                    No Logo
                  </div>
                )}
                <div>
                  <label className="cursor-pointer px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-lg flex items-center gap-2 border border-gray-300 dark:border-gray-600 transition-colors">
                    <Upload size={14} /> Upload New Logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && uploadLogoFile(e.target.files[0])}
                      disabled={logoUploading}
                    />
                  </label>
                  <p className="text-[11px] text-gray-400 mt-1">PNG or JPG recommended. Max width 250px.</p>
                </div>
                {logoUploading && <Loader2 size={18} className="animate-spin text-primary-600" />}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: THERMAL PRINTER */}
        {activeTab === 'thermal' && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Printer className="text-primary-600" size={18} /> Thermal Receipt Printer Setup
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Configure direct ESC/POS thermal receipt printing, paper width, and hardware parameters.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Printer Connection Type</label>
                <select
                  value={thermal.connectionType}
                  onChange={e => setThermal(t => ({ ...t, connectionType: e.target.value as ThermalPrinterConfig['connectionType'] }))}
                  className={inputCls}
                >
                  <option value="USB">USB Direct Connection</option>
                  <option value="IP">Network / IP Printer</option>
                  <option value="SHARED">Shared Windows Printer</option>
                </select>
              </div>

              {thermal.connectionType === 'IP' ? (
                <div>
                  <label className={labelCls}>Printer IP Address</label>
                  <input
                    type="text"
                    value={thermal.ipAddress || ''}
                    onChange={e => setThermal(t => ({ ...t, ipAddress: e.target.value }))}
                    className={inputCls}
                    placeholder="192.168.1.100"
                  />
                </div>
              ) : (
                <div>
                  <label className={labelCls}>Printer Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={thermal.printerName || ''}
                      onChange={e => setThermal(t => ({ ...t, printerName: e.target.value }))}
                      className={inputCls}
                      placeholder="e.g. POS-80, EPSON TM-T20"
                    />
                    <button
                      type="button"
                      onClick={refreshPrintersList}
                      disabled={printerLoading}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center gap-1 shrink-0"
                    >
                      {printerLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Detect
                    </button>
                  </div>
                </div>
              )}

              {thermalPrinters.length > 0 && thermal.connectionType !== 'IP' && (
                <div className="md:col-span-2">
                  <label className={labelCls}>Detected System Printers</label>
                  <select
                    onChange={e => setThermal(t => ({ ...t, printerName: e.target.value }))}
                    value={thermal.printerName}
                    className={inputCls}
                  >
                    {thermalPrinters.map(p => (
                      <option key={p.name} value={p.name}>{p.name} ({p.interface_type})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={labelCls}>Paper Width</label>
                <select
                  value={thermal.paperSize}
                  onChange={e => setThermal(t => ({ ...t, paperSize: e.target.value as 'Mm58' | 'Mm80' }))}
                  className={inputCls}
                >
                  <option value="Mm80">80mm (Standard Desktop Receipt Printer)</option>
                  <option value="Mm58">58mm (Compact Mobile Thermal Printer)</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Invoice Render Mode</label>
                <select
                  value={thermal.invoiceMode}
                  onChange={e => setThermal(t => ({ ...t, invoiceMode: e.target.value as 'html' | 'native' }))}
                  className={inputCls}
                >
                  <option value="html">HTML Graphics Pipeline (Rich Formatting & Logos)</option>
                  <option value="native">Native ESC/POS Text Mode (Ultra-fast Printing)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FBR FISCAL GATEWAY */}
        {activeTab === 'fbr' && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <ShieldCheck className="text-primary-600" size={18} /> FBR Real-time Fiscal Integration
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
                  className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <label htmlFor="fbr-enable" className="text-sm font-semibold text-gray-800 dark:text-gray-200 cursor-pointer">
                  Enable FBR Real-time Invoice Fiscalization
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg text-xs border border-gray-300 dark:border-gray-600 flex items-center gap-2 transition-colors"
                >
                  {testingFbr ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Test FBR Gateway Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SALES & INVENTORY RULES */}
        {activeTab === 'sales' && (
          <div className="space-y-4">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <ShoppingCart className="text-primary-600" size={16} /> Sales & Inventory Operational Rules
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Set cashier checkout permissions, negative inventory policies, and discount limits.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 text-xs">
              <div className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="pr-4">
                  <label htmlFor="rule-below-cost" className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer block">
                    Allow Sale Below Cost Price
                  </label>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                    Permit cashiers to sell products below weighted average cost price
                  </span>
                </div>
                <input
                  type="checkbox"
                  id="rule-below-cost"
                  checked={!!appSettings.allowSaleBelowCost}
                  onChange={e => setAppSettings(a => ({ ...a, allowSaleBelowCost: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer shrink-0"
                />
              </div>

              <div className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="pr-4">
                  <label htmlFor="rule-negative-stock" className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer block">
                    Allow Negative Inventory Checkout
                  </label>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                    Allow sale checkout even if item stock quantity is zero or negative
                  </span>
                </div>
                <input
                  type="checkbox"
                  id="rule-negative-stock"
                  checked={!!appSettings.allowNegativeStock}
                  onChange={e => setAppSettings(a => ({ ...a, allowNegativeStock: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer shrink-0"
                />
              </div>

              <div className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="pr-4">
                  <label htmlFor="rule-barcode-price" className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer block">
                    Show Retail Price on Barcode Stickers
                  </label>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                    Include item retail price when generating and printing barcode labels
                  </span>
                </div>
                <input
                  type="checkbox"
                  id="rule-barcode-price"
                  checked={appSettings.showBarcodePrice !== false}
                  onChange={e => setAppSettings(a => ({ ...a, showBarcodePrice: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer shrink-0"
                />
              </div>

              <div className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="pr-4">
                  <label htmlFor="rule-cart-profit" className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer block">
                    Allow Cashiers to View Cart Profit
                  </label>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                    Permit non-admin cashiers to see estimated profit and margin icon/modal for items in active cart
                  </span>
                </div>
                <input
                  type="checkbox"
                  id="rule-cart-profit"
                  checked={!!appSettings['sale.allowCartProfitView']}
                  onChange={e => setAppSettings(a => ({ ...a, 'sale.allowCartProfitView': e.target.checked }))}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer shrink-0"
                />
              </div>

              <div className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="pr-4">
                  <label htmlFor="rule-price-change" className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer block">
                    Allow Cashiers to Edit Unit Prices
                  </label>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                    Permit non-admin cashiers to override unit price in cart lines
                  </span>
                </div>
                <input
                  type="checkbox"
                  id="rule-price-change"
                  checked={appSettings['sale.allowPriceChange'] !== false}
                  onChange={e => setAppSettings(a => ({ ...a, 'sale.allowPriceChange': e.target.checked }))}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer shrink-0"
                />
              </div>

              <div className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="pr-4">
                  <label htmlFor="rule-discount-switch" className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer block">
                    Allow Cashiers to Switch Discount Type (% / Rs)
                  </label>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                    Permit non-admin cashiers to toggle between percentage and fixed rupee discounts
                  </span>
                </div>
                <input
                  type="checkbox"
                  id="rule-discount-switch"
                  checked={appSettings['sale.allowDiscountTypeSwitch'] !== false}
                  onChange={e => setAppSettings(a => ({ ...a, 'sale.allowDiscountTypeSwitch': e.target.checked }))}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer shrink-0"
                />
              </div>

              <div className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="pr-4">
                  <label htmlFor="rule-max-discount" className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer block">
                    Max Cashier Discount Limit (%)
                  </label>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                    Maximum percentage discount allowed for non-admin cashiers
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    id="rule-max-discount"
                    max={100}
                    min={0}
                    value={(appSettings.maxCashierDiscount as number) ?? 10}
                    onChange={e => setAppSettings(a => ({ ...a, maxCashierDiscount: Number(e.target.value) }))}
                    className="w-20 text-right px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500 outline-none font-semibold"
                  />
                  <span className="text-xs text-gray-500 font-semibold">%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DATABASE BACKUP */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Database className="text-primary-600" size={18} /> Database Backup & Maintenance
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Native PostgreSQL backups created with pg_dump — restorable with standard Postgres tools.
              </p>
            </div>

            {/* Server-side tool availability */}
            {pgStatus && (
              pgStatus.available ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs text-green-800 dark:text-green-300">
                  <span className="flex items-center gap-1.5 font-semibold"><CheckCircle2 size={13} /> Postgres tools ready</span>
                  <span className="font-mono">{pgStatus.database} @ {pgStatus.host}</span>
                  <span className="text-green-600/70 dark:text-green-400/70">{pgStatus.pgDump}</span>
                </div>
              ) : (
                <div className="px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                  <span className="flex items-center gap-1.5 font-semibold"><AlertCircle size={13} /> Native backups unavailable</span>
                  <p className="mt-1 leading-relaxed">{pgStatus.error}</p>
                  <p className="mt-1 text-amber-700/80 dark:text-amber-400/80">
                    Install the PostgreSQL client tools on the server machine, or set <code className="font-mono">PG_BIN_DIR</code> in
                    the server <code className="font-mono">.env</code> to the folder containing <code className="font-mono">pg_dump</code>.
                  </p>
                </div>
              )
            )}

            {/* Automatic backups to a folder */}
            <div className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <FolderClock size={15} className="text-primary-600" /> Automatic Backups
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Pick a folder on the server machine and the database is backed up there automatically every time
                  the app is closed.
                </p>
              </div>

              <div>
                <label className={labelCls}>Backup folder</label>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={autoBackup.backupDir}
                    onChange={e => setAutoBackup(a => ({ ...a, backupDir: e.target.value }))}
                    onBlur={e => {
                      const value = e.target.value.trim();
                      if (value && value !== readAutoBackupSettings(globalSettings.app).backupDir) {
                        saveAutoBackup({ backupDir: value });
                      }
                    }}
                    placeholder="No folder selected — automatic backups are off"
                    className={`${inputCls} flex-1 min-w-[240px] font-mono text-xs`}
                  />
                  <button
                    type="button"
                    onClick={() => setFolderPickerOpen(true)}
                    disabled={dbBusy}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg text-xs flex items-center gap-2 disabled:opacity-50"
                  >
                    <FolderOpen size={14} /> Browse…
                  </button>
                  {autoBackup.backupDir && (
                    <button
                      type="button"
                      onClick={() => saveAutoBackup({ backupDir: '' })}
                      disabled={dbBusy}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 rounded-lg text-xs disabled:opacity-50"
                      title="Clear folder and disable automatic backups"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {autoBackup.backupDir && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoBackup.backupOnClose}
                        onChange={e => saveAutoBackup({ backupOnClose: e.target.checked })}
                        disabled={dbBusy}
                        className="mt-0.5 rounded text-primary-600 focus:ring-primary-500"
                      />
                      <span>
                        <span className="block text-xs font-semibold text-gray-800 dark:text-gray-200">Back up on app close</span>
                        <span className="block text-[11px] text-gray-500 dark:text-gray-400">Runs before the window closes</span>
                      </span>
                    </label>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">Format</label>
                      <select
                        value={autoBackup.backupFormat}
                        onChange={e => saveAutoBackup({ backupFormat: e.target.value as 'custom' | 'plain' })}
                        disabled={dbBusy}
                        className={`${inputCls} text-xs py-1.5`}
                      >
                        <option value="custom">Compressed archive (.dump)</option>
                        <option value="plain">SQL script (.sql)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">Keep last</label>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={autoBackup.backupKeep}
                        onChange={e => setAutoBackup(a => ({ ...a, backupKeep: Math.max(1, parseInt(e.target.value) || 1) }))}
                        onBlur={() => saveAutoBackup({ backupKeep: autoBackup.backupKeep })}
                        disabled={dbBusy}
                        className={`${inputCls} text-xs py-1.5`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {pgStatus?.lastBackup
                        ? <>Last backup: <span className="font-mono">{pgStatus.lastBackup.filename}</span>{' '}
                          ({formatBytes(pgStatus.lastBackup.bytes)}) · {new Date(pgStatus.lastBackup.at).toLocaleString()}</>
                        : 'No backups in this folder yet.'}
                    </p>
                    <button
                      type="button"
                      onClick={runFolderBackup}
                      disabled={dbBusy || pgStatus?.available === false}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-2 shadow-sm"
                    >
                      {dbBusy ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />} Back up now
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-400">
                    Older backups beyond the retention count are deleted automatically. Only files named
                    <code className="font-mono"> pos-backup-*.dump/.sql </code> are ever removed.
                  </p>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 space-y-3">
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Download Database Backup</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    A complete <code className="font-mono">pg_dump</code> of the live database — schema, data, indexes and
                    constraints. Restorable on any PostgreSQL server, with or without this application.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleBackup('custom')}
                    disabled={dbBusy || pgStatus?.available === false}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-2 shadow-sm transition-colors"
                  >
                    {dbBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Backup (.dump)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBackup('plain')}
                    disabled={dbBusy || pgStatus?.available === false}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200 font-semibold rounded-lg text-xs flex items-center gap-2 transition-colors"
                  >
                    <Download size={14} /> SQL script (.sql)
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  <code className="font-mono">.dump</code> is compressed — restore with{' '}
                  <code className="font-mono">pg_restore --clean --if-exists -d dbname file.dump</code>.<br />
                  <code className="font-mono">.sql</code> is plain text — restore with{' '}
                  <code className="font-mono">psql -d dbname -f file.sql</code>.
                </p>
              </div>

              <div className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 space-y-3">
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Restore Database</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Upload a <code className="font-mono">.dump</code> or <code className="font-mono">.sql</code> backup — the format
                    is detected automatically. <span className="text-red-500 font-medium">Every existing table is dropped and
                    replaced.</span>
                  </p>
                </div>
                <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs shadow-sm transition-colors ${dbBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                  {dbBusy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Restore from File
                  <input
                    type="file"
                    accept=".dump,.sql,.backup,.json"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      e.target.value = ''; // allow re-selecting the same file
                      if (file) handleRestore(file);
                    }}
                    disabled={dbBusy}
                  />
                </label>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  The restore runs in a single transaction — if it fails partway, the current database is left untouched.
                  Legacy <code className="font-mono">.json</code> backups are still accepted.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: USER PERMISSIONS */}
        {activeTab === 'user-permissions' && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Users className="text-primary-600" size={18} /> User Access & Module Permissions
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Configure which modules each user can view, edit, or delete records in. Admin users always have full access.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select User Account:</label>
                <select
                  value={selectedUserId ?? ''}
                  onChange={async (e) => {
                    const uid = Number(e.target.value);
                    setSelectedUserId(uid);
                    // Load permissions for the newly selected user
                    try {
                      const userSettings = await settingsService.getUserSettings(uid).catch(() => ({}));
                      const selectedUser = users.find(u => u.id === uid);
                      setUserPermissions(parsePermissions(userSettings, selectedUser?.role));
                    } catch {
                      const selectedUser = users.find(u => u.id === uid);
                      setUserPermissions(defaultPermissions(selectedUser?.role));
                    }
                  }}
                  className="px-3.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.username} — {u.role})</option>
                  ))}
                </select>
              </div>

              {/* ADMIN notice */}
              {users.find(u => u.id === selectedUserId)?.role === 'ADMIN' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-xs">
                  <ShieldCheck size={14} />
                  <span>Admin users always have full access to all modules. Permission changes below will not affect admin accounts.</span>
                </div>
              )}

              {usersLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
              ) : (
                <>
                  <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Module</th>
                          <th className="px-4 py-3 text-center">Can View</th>
                          <th className="px-4 py-3 text-center">Can Edit</th>
                          <th className="px-4 py-3 text-center">Can Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {PERMISSION_MODULES.map(mod => {
                          const isAdminUser = users.find(u => u.id === selectedUserId)?.role === 'ADMIN';
                          return (
                            <tr key={mod} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{PERMISSION_LABELS[mod]}</td>
                              {(['view', 'edit', 'delete'] as const).map(action => (
                                <td key={action} className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isAdminUser ? true : userPermissions[mod]?.[action] ?? false}
                                    disabled={isAdminUser}
                                    onChange={(e) => {
                                      setUserPermissions(prev => ({
                                        ...prev,
                                        [mod]: {
                                          ...prev[mod],
                                          [action]: e.target.checked,
                                          // If unchecking view, also uncheck edit & delete
                                          ...(action === 'view' && !e.target.checked ? { edit: false, delete: false } : {}),
                                          // If checking edit or delete, also check view
                                          ...(action !== 'view' && e.target.checked ? { view: true } : {}),
                                        },
                                      }));
                                    }}
                                    className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 disabled:opacity-40"
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Save Permissions Button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={permSaving || users.find(u => u.id === selectedUserId)?.role === 'ADMIN'}
                      onClick={async () => {
                        if (!selectedUserId) return;
                        setPermSaving(true);
                        setStatusMsg(null);
                        try {
                          const flat = flattenPermissions(userPermissions);
                          await settingsService.updateUserSettings(selectedUserId, flat);
                          setStatusMsg({ ok: true, text: `Permissions saved for ${users.find(u => u.id === selectedUserId)?.name ?? 'user'}.` });
                        } catch (err) {
                          setStatusMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to save permissions.' });
                        } finally {
                          setPermSaving(false);
                        }
                      }}
                      className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                    >
                      {permSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      <span>Save Permissions</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* BOTTOM ACTION & NOTIFICATION BAR */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            {statusMsg && (
              <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
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
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg text-sm transition-colors"
            >
              Reset Form
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm flex items-center gap-2 shadow-sm transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>Save Settings</span>
            </button>
          </div>
        </div>

      </div>

      {folderPickerOpen && (
        <FolderPicker
          initialPath={autoBackup.backupDir || undefined}
          onClose={() => setFolderPickerOpen(false)}
          onSelect={path => {
            setFolderPickerOpen(false);
            if (path) saveAutoBackup({ backupDir: path });
          }}
        />
      )}
    </div>
  );
}