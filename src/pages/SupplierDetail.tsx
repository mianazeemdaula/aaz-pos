import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { supplierService } from '../services/pos.service';
import { formatPhone } from '../utils/formatters';
import type { Supplier, SupplierLedgerEntry } from '../types/pos';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;

export function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [ledger, setLedger] = useState<SupplierLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([supplierService.get(Number(id)), supplierService.getLedger(Number(id))])
      .then(([s, l]) => { setSupplier(s); setLedger(l.data ?? l); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>;
  if (error) return <div className="flex items-center gap-2 text-red-600 py-10 justify-center"><AlertCircle size={16} />{error}</div>;
  if (!supplier) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/suppliers" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{supplier.name}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${supplier.balance > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
          {supplier.balance > 0 ? `Payable ${fmt(supplier.balance)}` : 'Clear'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold mb-3">Contact Info</h2>
          <dl className="space-y-1.5 text-sm">
            {supplier.phone && <div className="flex gap-2"><dt className="text-gray-500 w-24">Phone</dt><dd>{formatPhone(supplier.phone)}</dd></div>}
            {supplier.email && <div className="flex gap-2"><dt className="text-gray-500 w-24">Email</dt><dd>{supplier.email}</dd></div>}
            {supplier.city && <div className="flex gap-2"><dt className="text-gray-500 w-24">City</dt><dd>{supplier.city}</dd></div>}
            {supplier.ntn && <div className="flex gap-2"><dt className="text-gray-500 w-24">NTN</dt><dd>{supplier.ntn}</dd></div>}
          </dl>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold mb-3">Ledger</h2>
          {ledger.length === 0 ? <p className="text-sm text-gray-400">No transactions</p> : (
            <div className="overflow-y-auto max-h-64 space-y-1">
              {ledger.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-gray-100 dark:border-gray-700 pb-1.5">
                  <div><p className="text-gray-700 dark:text-gray-300">{e.description ?? e.note ?? e.type}</p><p className="text-gray-400">{new Date(e.date ?? e.createdAt).toLocaleDateString()}</p></div>
                  <div className="text-right">
                    {(e.debit ?? 0) > 0 && <p className="text-red-600">- {fmt(e.debit ?? 0)}</p>}
                    {(e.credit ?? 0) > 0 && <p className="text-green-600">+ {fmt(e.credit ?? 0)}</p>}
                    <p className="text-gray-500">Bal: {fmt(e.balance)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
