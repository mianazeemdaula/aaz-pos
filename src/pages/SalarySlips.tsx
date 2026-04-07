import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Banknote, CheckCircle2, XCircle } from 'lucide-react';
import { Pagination } from '../components/ui/Pagination';
import { salarySlipService, employeeService, accountService } from '../services/pos.service';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { SalarySlip, Employee, Account } from '../types/pos';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const statusColors: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

export function SalarySlips() {
  const [items, setItems] = useState<SalarySlip[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate modal
  const [genModal, setGenModal] = useState(false);
  const [genForm, setGenForm] = useState({
    employeeId: 0,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    bonus: 0,
    otherDeductions: 0,
    note: '',
  });
  const [genSaving, setGenSaving] = useState(false);

  // Pay modal
  const [paySlip, setPaySlip] = useState<SalarySlip | null>(null);
  const [payAccountId, setPayAccountId] = useState<number>(0);
  const [paying, setPaying] = useState(false);

  // Cancel confirm
  const [cancelSlip, setCancelSlip] = useState<SalarySlip | null>(null);

  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await salarySlipService.list({ page, pageSize: PAGE_SIZE });
      setItems(r.data);
      setTotal(r.pagination?.total ?? 0);
    } catch { setItems([]); } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    employeeService.list({ pageSize: 200, active: true }).then(r => setEmployees(r.data)).catch(() => { });
    accountService.list({ pageSize: 100 }).then(r => {
      setAccounts((r.data as any[]).filter((a: Account) => a.type === 'ASSET' && (a as any).active !== false));
    }).catch(() => { });
  }, []);

  const selectedEmployee = employees.find(e => e.id === genForm.employeeId);

  const openGenerate = () => {
    setGenForm({ employeeId: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear(), bonus: 0, otherDeductions: 0, note: '' });
    setGenModal(true);
  };

  const generate = async () => {
    if (!genForm.employeeId) { alert('Please select an employee'); return; }
    setGenSaving(true);
    try {
      await salarySlipService.create({
        employeeId: genForm.employeeId,
        month: genForm.month,
        year: genForm.year,
        bonus: genForm.bonus,
        otherDeductions: genForm.otherDeductions,
        note: genForm.note || undefined,
      });
      setGenModal(false);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed to generate slip'); }
    finally { setGenSaving(false); }
  };

  const openPay = (slip: SalarySlip) => {
    setPaySlip(slip);
    setPayAccountId(accounts[0]?.id ?? 0);
  };

  const pay = async () => {
    if (!paySlip) return;
    if (!payAccountId) { alert('Please select a payment account'); return; }
    setPaying(true);
    try {
      await salarySlipService.pay(paySlip.id, { accountId: payAccountId });
      setPaySlip(null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed to pay salary slip'); }
    finally { setPaying(false); }
  };

  const cancelSlipConfirmed = async () => {
    if (!cancelSlip) return;
    try {
      await salarySlipService.cancel(cancelSlip.id);
      setCancelSlip(null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed to cancel'); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Salary Slips</h1>
        <button onClick={openGenerate} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">
          <Plus size={14} /> Generate Slip
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {loading
          ? <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
          : items.length === 0
            ? <p className="text-center text-gray-400 py-12 text-sm">No salary slips yet</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500">
                      <th className="px-4 py-2">Employee</th>
                      <th className="px-4 py-2">Period</th>
                      <th className="px-4 py-2 text-right">Basic</th>
                      <th className="px-4 py-2 text-right">Bonus</th>
                      <th className="px-4 py-2 text-right">Deductions</th>
                      <th className="px-4 py-2 text-right">Net Payable</th>
                      <th className="px-4 py-2">Paid From</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                          {item.employee?.name ?? item.employee?.user?.name ?? '—'}
                          {item.employee?.designation && (
                            <p className="text-xs text-gray-400 font-normal">{item.employee.designation}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{months[item.month - 1]} {item.year}</td>
                        <td className="px-4 py-2.5 text-right">{fmt(item.baseSalary)}</td>
                        <td className="px-4 py-2.5 text-right text-green-600">{item.bonus ? fmt(item.bonus) : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-red-600">{(item.totalAdvances || item.otherDeductions) ? fmt((item.totalAdvances ?? 0) + (item.otherDeductions ?? 0)) : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{fmt(item.netPayable)}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">
                          {(item as any).account?.name ?? (item.status === 'PAID' ? '—' : '')}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColors[item.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1.5">
                            {item.status !== 'PAID' && item.status !== 'CANCELLED' && (
                              <button
                                onClick={() => openPay(item)}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 whitespace-nowrap"
                              >
                                <Banknote size={12} /> Pay
                              </button>
                            )}
                            {item.status === 'PAID' && (
                              <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 size={13} /> Paid</span>
                            )}
                            {item.status !== 'PAID' && item.status !== 'CANCELLED' && (
                              <button
                                onClick={() => setCancelSlip(item)}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-700 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <XCircle size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={PAGE_SIZE} onPageChange={setPage} />
        )}
      </div>

      {/* ── Generate Salary Slip Modal ── */}
      <Modal open={genModal} onClose={() => setGenModal(false)} title="Generate Salary Slip" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Employee *</label>
              <select
                value={genForm.employeeId}
                onChange={e => setGenForm(p => ({ ...p, employeeId: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={0}>Select employee...</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.name}{e.designation ? ` — ${e.designation}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Month</label>
              <select
                value={genForm.month}
                onChange={e => setGenForm(p => ({ ...p, month: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none"
              >
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Year</label>
              <input
                type="number"
                value={genForm.year}
                onChange={e => setGenForm(p => ({ ...p, year: Number(e.target.value) }))}
                min={2020}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Bonus (Rs)</label>
              <input
                type="number"
                value={genForm.bonus}
                min={0}
                onChange={e => setGenForm(p => ({ ...p, bonus: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Other Deductions (Rs)</label>
              <input
                type="number"
                value={genForm.otherDeductions}
                min={0}
                onChange={e => setGenForm(p => ({ ...p, otherDeductions: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Note</label>
              <input
                value={genForm.note}
                onChange={e => setGenForm(p => ({ ...p, note: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {selectedEmployee && (
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-xs text-blue-700 dark:text-blue-400 space-y-0.5">
              <div className="flex justify-between">
                <span>Basic Salary</span>
                <span className="font-semibold">{fmt(selectedEmployee.baseSalary)}</span>
              </div>
              {genForm.bonus > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>+ Bonus</span><span>{fmt(genForm.bonus)}</span>
                </div>
              )}
              {genForm.otherDeductions > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>– Deductions</span><span>{fmt(genForm.otherDeductions)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t border-blue-200 dark:border-blue-700 pt-0.5 mt-0.5">
                <span>Est. Net</span>
                <span>{fmt(selectedEmployee.baseSalary + genForm.bonus - genForm.otherDeductions)}</span>
              </div>
              <p className="text-gray-500 pt-0.5">Pending advances will be auto-deducted.</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setGenModal(false)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={generate} disabled={genSaving || !genForm.employeeId} className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
              {genSaving && <Loader2 size={13} className="animate-spin" />} Generate
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Pay Salary Modal ── */}
      <Modal open={!!paySlip} onClose={() => setPaySlip(null)} title="Pay Salary" size="sm">
        {paySlip && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Employee</span>
                <span className="font-medium">{paySlip.employee?.name ?? paySlip.employee?.user?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Period</span>
                <span>{months[paySlip.month - 1]} {paySlip.year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Basic</span>
                <span>{fmt(paySlip.baseSalary)}</span>
              </div>
              {paySlip.bonus > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>+ Bonus</span><span>{fmt(paySlip.bonus)}</span>
                </div>
              )}
              {((paySlip.totalAdvances ?? 0) + (paySlip.otherDeductions ?? 0)) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>– Deductions</span><span>{fmt((paySlip.totalAdvances ?? 0) + (paySlip.otherDeductions ?? 0))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
                <span>Net Payable</span>
                <span className="text-primary-600">{fmt(paySlip.netPayable)}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Pay From Account *</label>
              <select
                value={payAccountId}
                onChange={e => setPayAccountId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={0}>Select account...</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setPaySlip(null)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button
                onClick={pay}
                disabled={paying || !payAccountId}
                className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5 font-medium"
              >
                {paying ? <Loader2 size={13} className="animate-spin" /> : <Banknote size={14} />}
                Pay {fmt(paySlip.netPayable)}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Cancel Confirm ── */}
      <ConfirmDialog
        open={!!cancelSlip}
        title="Cancel Salary Slip"
        message={`Cancel the ${cancelSlip ? months[cancelSlip.month - 1] + ' ' + cancelSlip.year : ''} slip for ${cancelSlip?.employee?.name ?? ''}? This cannot be undone.`}
        variant="danger"
        confirmLabel="Cancel Slip"
        onConfirm={cancelSlipConfirmed}
        onCancel={() => setCancelSlip(null)}
      />
    </div>
  );
}
