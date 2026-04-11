import { useState } from 'react';
import { Tag, Loader2, X } from 'lucide-react';
import { categoryService } from '../../services/pos.service';
import type { Category } from '../../types/pos';

interface QuickCategoryAddProps {
    open: boolean;
    onClose: () => void;
    onCreated: (category: Category) => void;
}

export function QuickCategoryAdd({ open, onClose, onCreated }: QuickCategoryAddProps) {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const reset = () => { setName(''); setError(''); };
    const handleClose = () => { reset(); onClose(); };

    const save = async () => {
        if (!name.trim()) return;
        setSaving(true);
        setError('');
        try {
            const c = await categoryService.create({ name: name.trim() });
            reset();
            onCreated(c);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to create category');
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <Tag size={16} className="text-purple-500" /> New Category
                    </h3>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Category Name *</label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && save()}
                            placeholder="e.g. Electronics, Clothing..."
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                </div>
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={handleClose}
                        className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                        Cancel
                    </button>
                    <button
                        onClick={save}
                        disabled={!name.trim() || saving}
                        className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Tag size={13} />}
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
