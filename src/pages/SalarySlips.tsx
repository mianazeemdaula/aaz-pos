import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { salarySlipService, employeeService } from '../services/pos.service';
import { Modal } from '../components/ui/Modal';
import type { SalarySlip, Employee } from '../types/pos';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function SalarySlips() {
  const [items, setItems] = useState<SalarySlip[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ employeeId: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear(), basicSalary: 0, allowances: 0, deductions: 0, advance: 0, note: '' });
  const [saving, setSaving] = useState(false);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await salarySlipService.list({ page, pageSize: PAGE_SIZE }); setItems(r.data); setTotal(r.pagination.total); }
    catch { setItems([]); } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { employeeService.list({ pageSize: 200 }).then(r => setEmployees(r.data)).catch(() => { }); }, []);

  const onEmployeeChange = (id: number) => {
    const emp = employees.find(e => e.id === id);
    setForm(p => ({ ...p, employeeId: id, basicSalary: emp?.baseSalary ?? emp?.salary ?? 0 }));
  };

  const save = async () => {
    setSaving(true);
    const net = form.basicSalary + form.allowances - form.deductions - form.advance;
    try {
      await salarySlipService.create({ ...form, netSalary: net });
      setModal(false); load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Salary Slips</h1>
        <button onClick={() => setModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg"><Plus size={14} /> Generate Slip</button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {loading ? <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
          : items.length === 0 ? <p className="text-center text-gray-400 py-12 text-sm">No salary slips yet</p>
            : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500">
                  <th className="px-4 py-2">Employee</th><th className="px-4 py-2">Period</th><th className="px-4 py-2 text-right">Basic</th>
                  <th className="px-4 py-2 text-right">Allowances</th><th className="px-4 py-2 text-right">Deductions</th><th className="px-4 py-2 text-right">Net</th><th className="px-4 py-2">Status</th>
                </tr></thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{item.employee?.user?.name ?? item.employee?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{months[item.month - 1]} {item.year}</td>
                      <td className="px-4 py-2.5 text-right">{fmt(item.baseSalary)}</td>
                      <td className="px-4 py-2.5 text-right text-green-600">{item.bonus ? fmt(item.bonus) : '—'}</td>
                      <td className="px-4 py-2.5 text-right text-red-600">{item.otherDeductions ? fmt(item.otherDeductions) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{fmt(item.netPayable)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${item.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{item.status === 'PAID' ? 'Paid' : item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
            <span className="text-gray-500">{total} total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"><ChevronLeft size={16} /></button>
              <span>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Generate Salary Slip" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Employee *</label>
              <select value={form.employeeId} onChange={e => onEmployeeChange(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none">
                <option value={0}>Select employee...</option>
                {employees.filter(e => e.active).map(e => <option key={e.id} value={e.id}>{e.user?.name ?? e.name ?? `Employee ${e.id}`}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Month</label>
              <select value={form.month} onChange={e => setForm(p => ({ ...p, month: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none">
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Year</label>
              <input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: Number(e.target.value) }))} min={2020}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Basic Salary</label>
              <input type="number" value={form.basicSalary} min={0} onChange={e => setForm(p => ({ ...p, basicSalary: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Allowances</label>
              <input type="number" value={form.allowances} min={0} onChange={e => setForm(p => ({ ...p, allowances: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Deductions</label>
              <input type="number" value={form.deductions} min={0} onChange={e => setForm(p => ({ ...p, deductions: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Advance Deduction</label>
              <input type="number" value={form.advance} min={0} onChange={e => setForm(p => ({ ...p, advance: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-sm flex justify-between font-semibold">
            <span>Net Salary</span>
            <span>{fmt(form.basicSalary + form.allowances - form.deductions - form.advance)}</span>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setModal(false)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={save} disabled={saving || !form.employeeId} className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
              {saving && <Loader2 size={13} className="animate-spin" />} Generate
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
