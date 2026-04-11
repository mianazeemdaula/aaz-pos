import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { customerService } from '../services/pos.service';
import { formatCNIC, formatPhone } from '../utils/formatters';
import type { Customer, CustomerLedgerEntry } from '../types/pos';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<CustomerLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([customerService.get(Number(id)), customerService.getLedger(Number(id))])
      .then(([c, l]) => { setCustomer(c); setLedger(l.data ?? l); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>;
  if (error) return <div className="flex items-center gap-2 text-red-600 py-10 justify-center"><AlertCircle size={16} />{error}</div>;
  if (!customer) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/customers" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{customer.name}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${customer.balance > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {customer.balance > 0 ? `Owes ${fmt(customer.balance)}` : 'Clear'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold mb-3">Contact Info</h2>
          <dl className="space-y-1.5 text-sm">
            {customer.phone && <div className="flex gap-1"><dt className="text-gray-500 w-24">Phone</dt><dd className="text-gray-900 dark:text-gray-100">{formatPhone(customer.phone)}</dd></div>}
            {customer.email && <div className="flex gap-1"><dt className="text-gray-500 w-24">Email</dt><dd className="text-gray-900 dark:text-gray-100">{customer.email}</dd></div>}
            {customer.city && <div className="flex gap-1"><dt className="text-gray-500 w-24">City</dt><dd className="text-gray-900 dark:text-gray-100">{customer.city}</dd></div>}
            {customer.address && <div className="flex gap-1"><dt className="text-gray-500 w-24">Address</dt><dd className="text-gray-900 dark:text-gray-100">{customer.address}</dd></div>}
            {customer.ntn && <div className="flex gap-1"><dt className="text-gray-500 w-24">NTN</dt><dd className="text-gray-900 dark:text-gray-100">{customer.ntn}</dd></div>}
            {customer.cnic && <div className="flex gap-1"><dt className="text-gray-500 w-24">CNIC</dt><dd className="text-gray-900 dark:text-gray-100">{formatCNIC(customer.cnic)}</dd></div>}
            <div className="flex gap-1"><dt className="text-gray-500 w-24">Credit Limit</dt><dd className="text-gray-900 dark:text-gray-100">{fmt(customer.creditLimit ?? 0)}</dd></div>
          </dl>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold mb-3">Ledger</h2>
          {ledger.length === 0 ? <p className="text-sm text-gray-400">No transactions</p> : (
            <div className="overflow-y-auto max-h-64 space-y-1">
              {ledger.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-gray-100 dark:border-gray-700 pb-1.5">
                  <div>
                    <p className="text-gray-700 dark:text-gray-300">{e.description ?? e.note ?? e.type}</p>
                    <p className="text-gray-400">{new Date(e.date ?? e.createdAt).toLocaleDateString()}</p>
                  </div>
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
