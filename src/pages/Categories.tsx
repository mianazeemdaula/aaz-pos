import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { Search, Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight, Tag } from 'lucide-react';
import { categoryService } from '../services/pos.service';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { Category } from '../types/pos';

// The categories API returns a plain array (not paginated)
type CategoryListResponse = Category[] | { data: Category[] };

function extractCategories(r: unknown): Category[] {
  if (Array.isArray(r)) return r;
  if (r && typeof r === 'object' && Array.isArray((r as { data?: unknown }).data)) return (r as { data: Category[] }).data;
  return [];
}

function flattenTree(cats: Category[]): Category[] {
  const result: Category[] = [];
  for (const c of cats) {
    result.push(c);
    if (c.subcategories?.length) result.push(...flattenTree(c.subcategories));
  }
  return result;
}

export function Categories() {
  const [roots, setRoots] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: Category } | null>(null);
  const [confirm, setConfirm] = useState<{ id: number } | null>(null);
  const [form, setForm] = useState<Partial<Category>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await categoryService.list({}) as unknown as CategoryListResponse;
      const cats = extractCategories(r);
      // API returns nested tree with subcategories populated; keep only roots
      setRoots(cats.filter(c => !c.parentId));
    } catch { setRoots([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Flat list of all categories (for parent select)
  const allFlat = useMemo(() => flattenTree(roots), [roots]);

  // Filtered flat list when searching
  const searchResults = useMemo(() =>
    q.trim() ? allFlat.filter(c => c.name.toLowerCase().includes(q.toLowerCase())) : [],
    [allFlat, q]);

  // Parent options: only root categories, excluding the item being edited
  const parentOptions = useMemo(() =>
    roots.filter(c => c.id !== form.id),
    [roots, form.id]);

  const toggle = (id: number) => setCollapsed(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, parentId: form.parentId ?? null };
      modal?.mode === 'edit' && modal.item
        ? await categoryService.update(modal.item.id, payload)
        : await categoryService.create(payload);
      setModal(null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm) return;
    try { await categoryService.delete(confirm.id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setConfirm(null); }
  };

  const openEdit = (item: Category) => {
    setForm({ ...item, parentId: item.parentId ?? undefined });
    setModal({ mode: 'edit', item });
  };

  const renderRows = (items: Category[], depth = 0): ReactNode[] =>
    items.flatMap(item => {
      const subs = item.subcategories ?? [];
      const isCollapsed = collapsed.has(item.id);
      return [
        <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <td className="px-4 py-2.5">
            <div className="flex items-center gap-1" style={{ paddingLeft: depth * 20 }}>
              {subs.length > 0 ? (
                <button onClick={() => toggle(item.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
              ) : depth > 0 ? (
                <span className="text-gray-300 dark:text-gray-600 text-xs shrink-0 w-4 text-center">└</span>
              ) : null}
              <span className={`font-medium ${depth > 0 ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {item.name}
              </span>
              {subs.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded-full font-medium">
                  {subs.length}
                </span>
              )}
            </div>
          </td>
          <td className="px-4 py-2.5 text-sm text-gray-500">{item.description ?? '—'}</td>
          <td className="px-4 py-2.5 text-sm text-gray-500">{item.taxRate != null ? `${item.taxRate}%` : '—'}</td>
          <td className="px-4 py-2.5 text-sm text-gray-500">{item._count?.products ?? 0}</td>
          <td className="px-4 py-2.5">
            <div className="flex gap-1">
              <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-blue-500 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-colors"><Pencil size={14} /></button>
              <button onClick={() => setConfirm({ id: item.id })} className="p-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"><Trash2 size={14} /></button>
            </div>
          </td>
        </tr>,
        ...(!isCollapsed && subs.length > 0 ? renderRows(subs, depth + 1) : []),
      ];
    });

  const isEmpty = q.trim() ? searchResults.length === 0 : roots.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Categories</h1>
        <button onClick={() => { setForm({}); setModal({ mode: 'add' }); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search categories..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
        ) : isEmpty ? (
          <div className="py-16 text-center text-gray-400">
            <Tag size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No categories found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Tax Rate</th>
                <th className="px-4 py-2">Products</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {q.trim()
                ? searchResults.map(item => renderRows([item], item.parentId ? 1 : 0))
                : renderRows(roots)}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Edit Category' : 'Add Category'} size="sm">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Name *</label>
            <input value={form.name ?? ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Parent Category</label>
            <select value={form.parentId ?? ''} onChange={e => setForm(p => ({ ...p, parentId: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none">
              <option value="">None (Root Category)</option>
              {parentOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Description</label>
            <textarea value={form.description ?? ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Default Tax Rate %</label>
            <input type="number" value={form.taxRate ?? 0} min={0} max={100} step="0.01"
              onChange={e => setForm(p => ({ ...p, taxRate: Number(e.target.value) }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(null)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={save} disabled={saving || !form.name} className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
              {saving && <Loader2 size={13} className="animate-spin" />} Save
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} title="Delete Category"
        message="This will delete the category. Subcategories will become root categories and products will be unlinked."
        variant="danger" confirmLabel="Delete" onConfirm={del} onCancel={() => setConfirm(null)} />
    </div>
  );
}
