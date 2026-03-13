import { useState, useEffect, useCallback } from 'react';
import { Loader2, Play, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { heldService } from '../services/pos.service';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { HeldSale } from '../types/pos';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;

export function HeldTransactions() {
  const [items, setItems] = useState<HeldSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<{ id: number } | null>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await heldService.listSales({}); setItems(r.data ?? []); }
    catch { setItems([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resume = async (id: number) => {
    try {
      await heldService.resumeSale(id);
      navigate('/sale', { state: { resumeHeldId: id } });
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const del = async () => {
    if (!confirm) return;
    try { await heldService.cancelSale(confirm.id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setConfirm(null); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Held Transactions</h1>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {loading ? <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
          : items.length === 0 ? <p className="text-center text-gray-400 py-12 text-sm">No held transactions</p>
            : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500">
                  <th className="px-4 py-2">Date</th><th className="px-4 py-2">Customer</th><th className="px-4 py-2">Items</th><th className="px-4 py-2 text-right">Total</th><th className="px-4 py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {items.map((item) => {
                    const data = item.saleData as Record<string, unknown>;
                    return (
                      <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-2.5 text-gray-500">{new Date(item.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{String((data?.customer as Record<string, unknown>)?.name ?? data?.customerName ?? item.note ?? '—')}</td>
                        <td className="px-4 py-2.5 text-gray-500">{Array.isArray(data?.lines) ? (data.lines as unknown[]).length : Array.isArray(data?.items) ? (data.items as unknown[]).length : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{fmt(Number(data?.total ?? data?.grandTotal ?? 0))}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-2">
                            <button onClick={() => resume(item.id)} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"><Play size={12} /> Resume</button>
                            <button onClick={() => setConfirm({ id: item.id })} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
      </div>
      <ConfirmDialog open={!!confirm} title="Discard Transaction" message="Discard this held transaction?" variant="danger" confirmLabel="Discard" onConfirm={del} onCancel={() => setConfirm(null)} />
    </div>
  );
}
