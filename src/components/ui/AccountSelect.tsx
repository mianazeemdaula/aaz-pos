import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { accountService } from '../../services/pos.service';
import type { Account } from '../../types/pos';

interface AccountSelectProps {
  value?: number | null;
  onChange: (id: number, account: Account) => void;
  placeholder?: string;
  className?: string;
  filter?: 'all' | 'cash' | 'bank' | 'asset';
}

export function AccountSelect({ value, onChange, placeholder = 'Select account...', className, filter = 'all' }: AccountSelectProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    accountService.list({ pageSize: 100 }).then(r => {
      if (filter === 'all') setAccounts(r.data);
      else if (filter === 'cash') setAccounts(r.data.filter(a => a.name?.toLowerCase().includes('cash')));
      else if (filter === 'bank') setAccounts(r.data.filter(a => a.name?.toLowerCase().includes('bank')));
      else setAccounts(r.data.filter(a => a.type === 'ASSET'));
    }).catch(() => { });
  }, [filter]);

  return (
    <div className={`relative ${className ?? ''}`}>
      <select
        value={value ?? ''}
        onChange={e => {
          const id = Number(e.target.value);
          const acct = accounts.find(a => a.id === id);
          if (acct) onChange(id, acct);
        }}
        className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
      >
        <option value="">{placeholder}</option>
        {accounts.map(a => (
          <option key={a.id} value={a.id}>{a.name} — Rs {(a.balance ?? 0).toLocaleString()}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}
