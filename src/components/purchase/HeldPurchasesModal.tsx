import { useState, useRef, useEffect } from 'react';
import { Pause, Loader2, X } from 'lucide-react';
import { heldService } from '../../services/pos.service';
import type { HeldPurchase } from '../../types/pos';
import { fmt } from './types';

interface HeldPurchasesModalProps {
  onLoad: (held: HeldPurchase) => void;
  onClose: () => void;
}

export function HeldPurchasesModal({ onLoad, onClose }: HeldPurchasesModalProps) {
  const [held, setHeld] = useState<HeldPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    heldService
      .listPurchases({ pageSize: 50, status: 'HELD' })
      .then(r => setHeld(r?.data ?? []))
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
        setSelectedIdx(i => Math.min(i + 1, held.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (held[selectedIdx]) {
          onLoad(held[selectedIdx]);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [held, selectedIdx, onLoad, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-xl shadow-2xl flex flex-col"
        style={{ maxHeight: '75vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Pause size={16} /> Held Purchases
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
              <Loader2 size={18} className="animate-spin mr-2" /> Loading held purchases…
            </div>
          )}
          {!loading && held.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Pause size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No held purchases found</p>
            </div>
          )}
          {!loading &&
            held.map((h, idx) => {
              const data = h.purchaseData as {
                items?: { qty?: number; totalCost?: number }[];
                supplierSnapshot?: { name?: string } | null;
                refNo?: string;
              };
              const items = data?.items ?? [];
              const total = items.reduce((acc, i) => acc + (i.totalCost ?? 0), 0);
              const isSelected = idx === selectedIdx;
              return (
                <button
                  key={h.id}
                  ref={isSelected ? selectedRef : undefined}
                  onClick={() => {
                    onLoad(h);
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
                      Hold #{h.id}
                      {data?.supplierSnapshot?.name && (
                        <span className="font-normal text-gray-500 ml-1.5"> {data.supplierSnapshot.name}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {items.length} item{items.length !== 1 ? 's' : ''} &nbsp;·&nbsp;{' '}
                      {new Date(h.createdAt).toLocaleString()}
                    </p>
                    {data?.refNo && <p className="text-xs text-gray-400 mt-0.5 truncate">Ref: "{data.refNo}"</p>}
                    {h.note && <p className="text-xs text-gray-400 mt-0.5 truncate">"{h.note}"</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-primary-600">{fmt(total)}</p>
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                      {h.status}
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
