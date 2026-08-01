import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Building2, Trash2, Upload, CheckCircle2, AlertCircle, Check, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalSettings } from '../../contexts/SettingsContext';
import { apiClient } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { SettingsHeader } from './SettingsHeader';

const inputCls = 'w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors disabled:opacity-50';
const labelCls = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider';

export function CompanySettings() {
  const { user } = useAuth();
  const { settings: globalSettings, refreshSettings, updateCompanySettings } = useGlobalSettings();

  const [company, setCompany] = useState(globalSettings.company);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    setCompany(globalSettings.company);
  }, [globalSettings.company]);

  const loadLogoPreview = useCallback(async () => {
    try {
      const res = await apiClient.get<{ base64: string }>(API_ENDPOINTS.settings.logo);
      if (res.base64) setLogoPreview(`data:image/png;base64,${res.base64}`);
    } catch {
      setLogoPreview(null);
    }
  }, []);

  useEffect(() => {
    loadLogoPreview();
  }, [loadLogoPreview]);

  if (user?.role !== 'ADMIN') {
    return (
      <div>
        <SettingsHeader />
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 max-w-xl mx-auto my-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Administrator Access Required</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You are currently signed in as <strong className="text-gray-800 dark:text-gray-200">{user?.name}</strong> ({user?.role}). System and global configuration settings require Administrator access rights.
          </p>
        </div>
      </div>
    );
  }

  const uploadLogoFile = async (file: File) => {
    setLogoUploading(true);
    setStatusMsg(null);
    try {
      await apiClient.uploadFile(API_ENDPOINTS.settings.logo, file, 'logo');
      await loadLogoPreview();
      setStatusMsg({ ok: true, text: 'Company logo uploaded successfully.' });
    } catch (err) {
      setStatusMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to upload logo.' });
    } finally {
      setLogoUploading(false);
    }
  };

  const deleteLogoFile = async () => {
    setLogoUploading(true);
    setStatusMsg(null);
    try {
      await apiClient.delete(API_ENDPOINTS.settings.logo);
      setLogoPreview(null);
      setStatusMsg({ ok: true, text: 'Company logo removed.' });
    } catch (err) {
      setStatusMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to delete logo.' });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      await updateCompanySettings(company);
      await refreshSettings();
      setStatusMsg({ ok: true, text: 'Company profile updated successfully.' });
    } catch (err) {
      setStatusMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setCompany(globalSettings.company);
    setStatusMsg({ ok: true, text: 'Form fields reset to saved values.' });
  };

  return (
    <div className="space-y-6">
      <SettingsHeader />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6">
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

        {/* Action Bar */}
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
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm flex items-center gap-2 shadow-sm transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
