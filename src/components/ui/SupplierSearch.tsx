import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, UserPlus } from 'lucide-react';
import { supplierService } from '../../services/pos.service';
import type { Supplier } from '../../types/pos';

interface SupplierSearchProps {
  value?: Supplier | null;
  onSelect: (supplier: Supplier | null) => void;
  onCreateNew?: () => void;
  placeholder?: string;
  className?: string;
}

export function SupplierSearch({ value, onSelect, onCreateNew, placeholder = 'Search supplier...', className }: SupplierSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const resp = await supplierService.list({ q, pageSize: 10 });
      setResults(resp.data);
      setOpen(true);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer.current);
  }, [query, search]);

  const pick = (s: Supplier) => { onSelect(s); setQuery(''); setOpen(false); };

  if (value) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm ${className ?? ''}`}>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{value.name}</p>
          {value.phone && <p className="text-xs text-gray-500">{value.phone}</p>}
        </div>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${value.balance > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {value.balance > 0 ? `Payable Rs ${value.balance.toLocaleString()}` : 'Clear'}
        </span>
        <button type="button" onClick={() => onSelect(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder}
          className="w-full pl-9 pr-9 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
        {!loading && query && (
          <button type="button" onClick={() => { setQuery(''); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {onCreateNew && (
            <button type="button" onMouseDown={onCreateNew}
              className="w-full text-left px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center gap-2 text-sm text-primary-600 border-b border-gray-100 dark:border-gray-700">
              <UserPlus size={14} /> Add New Supplier
            </button>
          )}
          {results.map(s => (
            <button key={s.id} type="button" onMouseDown={() => pick(s)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between gap-2 text-sm border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{s.name}</p>
                <p className="text-xs text-gray-500">{s.phone ?? 'No phone'}</p>
              </div>
              {s.balance !== 0 && <span className="text-xs shrink-0 text-amber-600">Rs {s.balance.toLocaleString()}</span>}
            </button>
          ))}
          {results.length === 0 && !loading && <p className="px-3 py-2 text-sm text-gray-500">No suppliers found</p>}
        </div>
      )}
    </div>
  );
}
