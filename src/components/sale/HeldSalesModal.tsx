import { useState, useRef, useEffect } from 'react';
import { Pause, Loader2, X } from 'lucide-react';
import { heldService } from '../../services/pos.service';
import type { HeldSale } from '../../types/pos';
import { fmt } from './types';

interface HeldSalesModalProps {
  onLoad: (held: HeldSale) => void;
  onClose: () => void;
}

export function HeldSalesModal({ onLoad, onClose }: HeldSalesModalProps) {
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    heldService
      .listSales({ pageSize: 50, status: 'HELD' })
      .then(r => setHeldSales(r?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, heldSales.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (heldSales[selectedIdx]) {
          onLoad(heldSales[selectedIdx]);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [heldSales, selectedIdx, onLoad, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-xl shadow-2xl flex flex-col"
        style={{ maxHeight: '75vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Pause size={16} /> Held Sales
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>↑↓ Navigate</span>
            <span>Enter Load</span>
            <span>ESC Close</span>
            <button onClick={onClose} className="ml-1 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading held sales
            </div>
          )}
          {!loading && heldSales.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Pause size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No held sales found</p>
            </div>
          )}
          {!loading &&
            heldSales.map((s, idx) => {
              const data = s.saleData as any;
              const items: any[] = data?.items ?? [];
              const total = items.reduce((acc, i) => acc + (i.qty ?? 0) * (i.price ?? 0), 0);
              const isSelected = idx === selectedIdx;
              const cust = data?.customerSnapshot;
              return (
                <button
                  key={s.id}
                  ref={isSelected ? selectedRef : undefined}
                  onClick={() => {
                    onLoad(s);
                    onClose();
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-900/30 border-l-[3px] border-l-primary-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      Hold #{s.id}
                      {cust?.name && <span className="font-normal text-gray-500 ml-1.5">— {cust.name}</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {items.length} item{items.length !== 1 ? 's' : ''} • {new Date(s.createdAt).toLocaleString()}
                    </p>
                    {s.note && <p className="text-xs text-gray-400 mt-0.5 truncate">"{s.note}"</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-primary-600">{fmt(total)}</p>
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                      {s.status}
                    </span>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
