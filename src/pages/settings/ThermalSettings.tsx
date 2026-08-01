import { useState, useEffect } from 'react';
import {
  Loader2, Printer, CheckCircle2, AlertCircle, RefreshCw, Check, Image as ImageIcon
} from 'lucide-react';
import { useGlobalSettings } from '../../contexts/SettingsContext';
import { saveThermalConfig, listPrinters, type ThermalPrinterConfig, type PrinterInfo } from '../../utils/thermalPrinter';
import { previewSampleSaleInvoice, previewSamplePaymentSlip } from '../../utils/invoices/sampleReceipt';
import { SettingsHeader } from './SettingsHeader';

const inputCls = 'w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors disabled:opacity-50';
const labelCls = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider';

export function ThermalSettings() {
  const { settings: globalSettings, refreshSettings, setThermalConfig } = useGlobalSettings();

  const [thermal, setThermal] = useState<ThermalPrinterConfig>(globalSettings.thermal);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [thermalPrinters, setThermalPrinters] = useState<PrinterInfo[]>([]);
  const [printerLoading, setPrinterLoading] = useState(false);
  const [previewing, setPreviewing] = useState<'invoice' | 'payment' | null>(null);

  useEffect(() => {
    setThermal(globalSettings.thermal);
  }, [globalSettings.thermal]);



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

  const previewSample = async (kind: 'invoice' | 'payment') => {
    setPreviewing(kind);
    try {
      const render = kind === 'invoice' ? previewSampleSaleInvoice : previewSamplePaymentSlip;
      await render(thermal, { ...globalSettings.company });
    } catch (e) {
      setStatusMsg({
        ok: false,
        text: `Failed to render sample receipt: ${e instanceof Error ? e.message : 'Unknown error'}`,
      });
    } finally {
      setPreviewing(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      saveThermalConfig(thermal);
      setThermalConfig(thermal);
      await refreshSettings();
      setStatusMsg({ ok: true, text: 'Thermal printer settings saved successfully.' });
    } catch (err) {
      setStatusMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to save printer settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setThermal(globalSettings.thermal);
    setStatusMsg({ ok: true, text: 'Form fields reset to saved values.' });
  };

  return (
    <div className="space-y-6">
      <SettingsHeader />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6">
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

        {/* Test / preview without a physical printer */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ImageIcon className="text-primary-600" size={16} /> Receipt Testing
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Render receipts to an image on screen so layout can be checked without wasting paper.
            </p>
          </div>

          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <input
              type="checkbox"
              id="thermal-export-mode"
              checked={!!thermal.exportInsteadOfPrint}
              onChange={e => setThermal(t => ({ ...t, exportInsteadOfPrint: e.target.checked }))}
              className="h-4 w-4 mt-0.5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
            />
            <label htmlFor="thermal-export-mode" className="cursor-pointer">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Export Image Instead of Printing (Test Mode)
              </span>
              <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                Every sale invoice and payment slip opens as a downloadable image instead of going to the
                printer. Applies to the HTML render mode. Remember to turn this off for live billing.
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => previewSample('invoice')}
              disabled={previewing !== null}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg text-xs border border-gray-300 dark:border-gray-600 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {previewing === 'invoice' ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
              Preview Sample Invoice
            </button>
            <button
              type="button"
              onClick={() => previewSample('payment')}
              disabled={previewing !== null}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg text-xs border border-gray-300 dark:border-gray-600 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {previewing === 'payment' ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
              Preview Sample Payment Slip
            </button>
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
              <span>Save Printer Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
