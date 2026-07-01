import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, Loader2, Banknote } from 'lucide-react';
import { Pagination } from '../components/ui/Pagination';
import { employeeService, accountService } from '../services/pos.service';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { formatCNIC, formatPhone, handleCNICInput, handlePhoneInput, MONTH_NAMES, getMonthName } from '../utils/formatters';
import type { Employee, EmployeeAdvance, Account } from '../types/pos';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface EmployeeForm {
  name?: string;
  phone?: string;
  cnic?: string;
  designation?: string;
  baseSalary?: number;
  advanceLimit?: number;
  joiningDate?: string;
  active?: boolean;
}

export function Employees() {
  const [items, setItems] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: Employee } | null>(null);
  const [confirm, setConfirm] = useState<{ id: number } | null>(null);
  const [form, setForm] = useState<EmployeeForm>({});
  const [saving, setSaving] = useState(false);
  const PAGE_SIZE = 20;

  // Advance state
  const [advanceModal, setAdvanceModal] = useState<Employee | null>(null);
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);
  const [advLoading, setAdvLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [advForm, setAdvForm] = useState({ amount: 0, accountId: 0, reason: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [advSaving, setAdvSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await employeeService.list({ q, page, pageSize: PAGE_SIZE });
      setItems(r.data);
      setTotal(r.pagination?.total ?? 0);
    } catch { setItems([]); } finally { setLoading(false); }
  }, [q, page]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setForm({ active: true, baseSalary: 0, advanceLimit: 0, joiningDate: new Date().toISOString().slice(0, 10) });
    setModal({ mode: 'add' });
  };

  const openEdit = (item: Employee) => {
    setForm({
      name: item.name ?? '',
      phone: item.phone ?? '',
      cnic: item.cnic ?? '',
      designation: item.designation ?? '',
      baseSalary: item.baseSalary ?? 0,
      advanceLimit: item.advanceLimit ?? 0,
      joiningDate: item.joiningDate?.toString().slice(0, 10) ?? '',
      active: item.active ?? true,
    });
    setModal({ mode: 'edit', item });
  };

  const getErrMsg = (e: unknown) =>
    e instanceof Error ? e.message
      : (e as any)?.error?.message || 'An unexpected error occurred';

  const save = async () => {
    if (!form.name?.trim()) { alert('Employee name is required'); return; }
    setSaving(true);
    try {
      if (modal?.mode === 'edit' && modal.item) {
        await employeeService.update(modal.item.id, form);
      } else {
        await employeeService.create(form);
      }
      setModal(null);
      load();
    } catch (e: unknown) { alert(getErrMsg(e)); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm) return;
    try { await employeeService.delete(confirm.id); load(); }
    catch (e: unknown) { alert(getErrMsg(e)); }
    finally { setConfirm(null); }
  };

  const openAdvances = async (emp: Employee) => {
    setAdvanceModal(emp);
    setAdvForm({ amount: 0, accountId: 0, reason: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    setAdvLoading(true);
    try {
      const [advRes, accRes] = await Promise.all([
        employeeService.getAdvances(emp.id, { pageSize: 100 }),
        accountService.list({ pageSize: 200 }),
      ]);
      setAdvances(advRes.data);
      setAccounts(accRes.data);
      if (accRes.data.length > 0 && !advForm.accountId) setAdvForm(p => ({ ...p, accountId: accRes.data[0].id }));
    } catch { setAdvances([]); }
    finally { setAdvLoading(false); }
  };

  const createAdvance = async () => {
    if (!advanceModal || !advForm.amount || !advForm.accountId) { alert('Amount and Account are required'); return; }

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    if (advForm.year < curYear || (advForm.year === curYear && advForm.month < curMonth)) {
      alert('Advance cannot be created for a previous month.');
      return;
    }

    setAdvSaving(true);
    try {
      await employeeService.createAdvance(advanceModal.id, advForm);
      const advRes = await employeeService.getAdvances(advanceModal.id, { pageSize: 100 });
      setAdvances(advRes.data);
      setAdvForm(p => ({ ...p, amount: 0, reason: '' }));
      load(); // refresh balance in table
    } catch (e: unknown) { alert(getErrMsg(e)); }
    finally { setAdvSaving(false); }
  };

  const advanceAction = async (action: 'approve' | 'reject' | 'repay' | 'waive', adv: EmployeeAdvance) => {
    if (!advanceModal) return;
    const labels = { approve: 'approve', reject: 'reject', repay: 'mark as repaid', waive: 'waive off' };
    if (!window.confirm(`Are you sure you want to ${labels[action]} this advance of ${fmt(adv.amount)}?`)) return;
    try {
      const methods = {
        approve: () => employeeService.approveAdvance(advanceModal.id, adv.id),
        reject: () => employeeService.rejectAdvance(advanceModal.id, adv.id),
        repay: () => employeeService.repayAdvance(advanceModal.id, adv.id),
        waive: () => employeeService.waiveAdvance(advanceModal.id, adv.id),
      };
      await methods[action]();
      const advRes = await employeeService.getAdvances(advanceModal.id, { pageSize: 100 });
      setAdvances(advRes.data);
      load();
    } catch (e: unknown) { alert(getErrMsg(e)); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const f = (key: keyof EmployeeForm, val: unknown) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Employees</h1>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">
          <Plus size={14} /> Add Employee
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
              placeholder="Search by name, designation, phone..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {loading
          ? <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
          : items.length === 0
            ? <p className="text-center text-gray-400 py-12 text-sm">No employees found</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500">
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Designation</th>
                      <th className="px-4 py-2">Phone</th>
                      <th className="px-4 py-2">CNIC</th>
                      <th className="px-4 py-2 text-right">Monthly Salary</th>
                      <th className="px-4 py-2 text-right">Balance</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const isActive = item.active;
                      return (
                        <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                          <td className="px-4 py-2.5 text-gray-500">{item.designation ?? '—'}</td>
                          <td className="px-4 py-2.5 text-gray-500">{formatPhone(item.phone)}</td>
                          <td className="px-4 py-2.5 text-gray-500">{formatCNIC(item.cnic)}</td>
                          <td className="px-4 py-2.5 text-right font-medium">{fmt(item.baseSalary ?? 0)}</td>
                          <td className="px-4 py-2.5 text-right font-medium">
                            <span className={item.balance < 0 ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}>{fmt(item.balance ?? 0)}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1 items-center">
                              <button onClick={() => openAdvances(item)} title="Advances" className="relative p-1.5 rounded-lg text-gray-500 bg-gray-50 hover:bg-gray-100 dark:text-gray-400 dark:bg-gray-500/10 dark:hover:bg-gray-500/20 transition-colors">
                                <Banknote size={14} />
                                {item.pendingAdvancesCount && item.pendingAdvancesCount > 0 ? (
                                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white ring-1 ring-white dark:ring-gray-800">
                                    {item.pendingAdvancesCount}
                                  </span>
                                ) : null}
                              </button>
                              <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-blue-500 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-colors"><Pencil size={14} /></button>
                              <button onClick={() => setConfirm({ id: item.id })} className="p-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={PAGE_SIZE} onPageChange={setPage} />
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Edit Employee' : 'Add Employee'} size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Full Name *</label>
              <input
                value={form.name ?? ''}
                onChange={e => f('name', e.target.value)}
                placeholder="e.g. Ali Hassan"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Phone</label>
              <input
                value={formatPhone(form.phone) === '—' ? '' : (form.phone ? handlePhoneInput(form.phone).display : '')}
                onChange={e => { const { raw } = handlePhoneInput(e.target.value); f('phone', raw); }}
                placeholder="03xx-xxxxxxx"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">CNIC</label>
              <input
                value={formatCNIC(form.cnic) === '—' ? '' : (form.cnic ? handleCNICInput(form.cnic).display : '')}
                onChange={e => { const { raw } = handleCNICInput(e.target.value); f('cnic', raw); }}
                placeholder="xxxxx-xxxxxxx-x"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Designation</label>
              <input
                value={form.designation ?? ''}
                onChange={e => f('designation', e.target.value)}
                placeholder="e.g. Cashier"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Monthly Salary (Rs)</label>
              <input
                type="number"
                value={form.baseSalary ?? 0}
                min={0}
                onChange={e => f('baseSalary', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Advance Limit (Rs, 0 = no limit)</label>
              <input
                type="number"
                value={form.advanceLimit ?? 0}
                min={0}
                onChange={e => f('advanceLimit', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Join Date</label>
              <input
                type="date"
                value={form.joiningDate ?? ''}
                onChange={e => f('joiningDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active ?? true} onChange={e => f('active', e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Active Employee</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModal(null)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !form.name?.trim()}
              className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5"
            >
              {saving && <Loader2 size={13} className="animate-spin" />} Save
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Delete Employee"
        message="Delete this employee? This cannot be undone."
        variant="danger"
        confirmLabel="Delete"
        onConfirm={del}
        onCancel={() => setConfirm(null)}
      />

      {/* Advances Modal */}
      <Modal open={!!advanceModal} onClose={() => setAdvanceModal(null)} title={`Advances — ${advanceModal?.name ?? ''}`} size="w-1/2">
        {advLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-sm items-start">
            {/* Left Column: Give Advance Form */}
            <div className="lg:col-span-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-4 border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Give Advance</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Amount *</label>
                  <input type="number" value={advForm.amount} min={1} onChange={e => setAdvForm(p => ({ ...p, amount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Account *</label>
                  <select value={advForm.accountId} onChange={e => setAdvForm(p => ({ ...p, accountId: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500">
                    <option value={0} disabled>Select account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Month</label>
                    <select value={advForm.month} onChange={e => setAdvForm(p => ({ ...p, month: Number(e.target.value) }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500">
                      {MONTH_NAMES.map((m, i) => {
                        const isDisabled = advForm.year === new Date().getFullYear() && (i + 1) < (new Date().getMonth() + 1);
                        return <option key={i} value={i + 1} disabled={isDisabled}>{m}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Year</label>
                    <input type="number" value={advForm.year} min={new Date().getFullYear()} onChange={e => setAdvForm(p => ({ ...p, year: Number(e.target.value) }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Reason</label>
                  <input value={advForm.reason} onChange={e => setAdvForm(p => ({ ...p, reason: e.target.value }))} placeholder="Optional reason"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <button onClick={createAdvance} disabled={advSaving || !advForm.amount || !advForm.accountId}
                className="w-full px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-1.5 font-semibold transition-colors">
                {advSaving && <Loader2 size={13} className="animate-spin" />} Give Advance
              </button>
            </div>

            {/* Right Column: Advance History */}
            <div className="lg:col-span-8 space-y-3 flex flex-col">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Advance History</p>
              {advances.length === 0 ? (
                <div className="flex-1 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 min-h-[250px]">
                  <p className="text-gray-400 text-sm">No advances recorded</p>
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 flex flex-col">
                  <div className="overflow-x-auto max-h-[350px]">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 border-b border-gray-200 dark:border-gray-700 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-500 font-semibold">Date</th>
                          <th className="px-3 py-2 text-right text-gray-500 font-semibold">Amount</th>
                          <th className="px-3 py-2 text-left text-gray-500 font-semibold">Account</th>
                          <th className="px-3 py-2 text-left text-gray-500 font-semibold">Month/Year</th>
                          <th className="px-3 py-2 text-left text-gray-500 font-semibold">Reason</th>
                          <th className="px-3 py-2 text-left text-gray-500 font-semibold">Status</th>
                          <th className="px-3 py-2 text-left text-gray-500 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {advances.map(adv => (
                          <tr key={adv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{new Date(adv.date).toLocaleDateString('en-PK')}</td>
                            <td className="px-3 py-2 text-right font-medium text-red-600 whitespace-nowrap">{fmt(adv.amount)}</td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{adv.account?.name ?? '—'}</td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{getMonthName(adv.month)} {adv.year}</td>
                            <td className="px-3 py-2 text-gray-500 max-w-[120px] truncate" title={adv.reason ?? ''}>{adv.reason ?? '—'}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${adv.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                adv.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                  adv.status === 'DEDUCTED' ? 'bg-green-100 text-green-700' :
                                    adv.status === 'REPAID' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-500'
                                }`}>{adv.status}</span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {adv.status === 'PENDING' && (
                                <div className="flex gap-1">
                                  <button onClick={() => advanceAction('approve', adv)}
                                    className="px-1.5 py-0.5 text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                    title="Approve this advance">Approve</button>
                                  <button onClick={() => advanceAction('repay', adv)}
                                    className="px-1.5 py-0.5 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                    title="Mark as repaid by employee">Repay</button>
                                  <button onClick={() => advanceAction('reject', adv)}
                                    className="px-1.5 py-0.5 text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 rounded hover:bg-red-100 dark:hover:bg-red-900/40"
                                    title="Reject and reverse this advance">Reject</button>
                                </div>
                              )}
                              {adv.status === 'APPROVED' && (
                                <div className="flex gap-1">
                                  <button onClick={() => advanceAction('repay', adv)}
                                    className="px-1.5 py-0.5 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                    title="Mark as repaid by employee">Repay</button>
                                  <button onClick={() => advanceAction('waive', adv)}
                                    className="px-1.5 py-0.5 text-[10px] bg-gray-50 dark:bg-gray-600/20 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600/40"
                                    title="Waive off this advance">Waive</button>
                                  <button onClick={() => advanceAction('reject', adv)}
                                    className="px-1.5 py-0.5 text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 rounded hover:bg-red-100 dark:hover:bg-red-900/40"
                                    title="Reject and reverse this advance">Reject</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
