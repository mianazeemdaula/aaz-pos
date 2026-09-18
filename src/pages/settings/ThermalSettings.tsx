import { useState, useEffect } from 'react';
import {
  Loader2, Printer, CheckCircle2, AlertCircle, RefreshCw, Check
} from 'lucide-react';
import { useGlobalSettings } from '../../contexts/SettingsContext';
import { saveThermalConfig, listPrinters, printTestSlip, type ThermalPrinterConfig, type PrinterInfo } from '../../utils/thermalPrinter';
import { SettingsHeader } from './SettingsHeader';
import { inputCls, labelCls, hintCls, sectionNoteCls } from './formStyles';

export function ThermalSettings() {
  const { settings: globalSettings, refreshSettings, setThermalConfig } = useGlobalSettings();

  const [thermal, setThermal] = useState<ThermalPrinterConfig>(globalSettings.thermal);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [thermalPrinters, setThermalPrinters] = useState<PrinterInfo[]>([]);
  const [printerLoading, setPrinterLoading] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);

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

  // Prints against the values currently in the form, not the saved ones, so a
  // new IP can be tried before committing it.
  const sendTestPrint = async () => {
    setTestingPrint(true);
    setStatusMsg(null);
    try {
      await printTestSlip(thermal);
      setStatusMsg({ ok: true, text: 'Test slip sent — check the printer.' });
    } catch (e) {
      setStatusMsg({
        ok: false,
        text: e instanceof Error ? e.message : 'Test print failed.',
      });
    } finally {
      setTestingPrint(false);
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
    <div className="space-y-4">
      <SettingsHeader />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
          <h2 className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
            <Printer className="text-primary-600" size={16} /> Thermal Receipt Printer Setup
          </h2>
          <p className={sectionNoteCls}>
            Connection, paper width and render mode.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2.5">
          <div>
            <label className={labelCls}>Connection</label>
            <select
              value={thermal.connectionType}
              onChange={e => setThermal(t => ({ ...t, connectionType: e.target.value as ThermalPrinterConfig['connectionType'] }))}
              className={inputCls}
            >
              <option value="USB">USB direct</option>
              <option value="IP">Network / IP</option>
              <option value="SHARED">Shared Windows printer</option>
            </select>
          </div>

          {thermal.connectionType === 'IP' ? (
            <div>
              <label className={labelCls}>IP address</label>
              <input
                type="text"
                value={thermal.ipAddress || ''}
                onChange={e => setThermal(t => ({ ...t, ipAddress: e.target.value }))}
                className={inputCls}
                placeholder="192.168.1.100"
              />
              <p className={hintCls}>
                RAW/JetDirect socket, no driver needed. Port 9100; append <code>:port</code> to override.
              </p>
            </div>
          ) : (
            <div>
              <label className={labelCls}>Printer name</label>
              <div className="flex gap-1.5">
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
                  className="px-2 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-[11px] font-medium text-gray-700 dark:text-gray-200 rounded-md border border-gray-300 dark:border-gray-600 flex items-center gap-1 shrink-0"
                >
                  {printerLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Detect
                </button>
              </div>
            </div>
          )}

          {thermalPrinters.length > 0 && thermal.connectionType !== 'IP' && (
            <div className="col-span-2">
              <label className={labelCls}>Detected printers</label>
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
            <label className={labelCls}>Paper width</label>
            <select
              value={thermal.paperSize}
              onChange={e => setThermal(t => ({ ...t, paperSize: e.target.value as 'Mm58' | 'Mm80' }))}
              className={inputCls}
            >
              <option value="Mm80">80mm (standard desktop)</option>
              <option value="Mm58">58mm (compact / mobile)</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Printing Engine</label>
            <div className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded border border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-primary-600 dark:text-primary-400">Tauri / Rust Engine</span>: Skia 2D canvas, HarfBuzz Urdu text shaping, 203 DPI raster & 1-bit ESC/POS.
            </div>
          </div>
        </div>

        {/* Test print — the only way to check a receipt is on paper. */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            type="button"
            onClick={sendTestPrint}
            disabled={testingPrint}
            title="Sends a short slip through the same path a real invoice takes, so it proves the connection, the paper width and the font settings together."
            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md text-[11px] flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
          >
            {testingPrint ? <Loader2 size={12} className="animate-spin" /> : <Printer size={12} />}
            Send test print
          </button>
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
                {statusMsg.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                <span>{statusMsg.text}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-md text-xs transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
