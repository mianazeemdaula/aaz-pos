import { useState } from 'react';
import { Printer, X, Loader2 } from 'lucide-react';

interface PrintConfirmDialogProps {
    open: boolean;
    onPrint: () => Promise<void>;
    onSkip: () => void;
    title?: string;
    message?: string;
}

export function PrintConfirmDialog({
    open,
    onPrint,
    onSkip,
    title = 'Print Invoice',
    message = 'Would you like to print the invoice?',
}: PrintConfirmDialogProps) {
    const [printing, setPrinting] = useState(false);

    if (!open) return null;

    const handlePrint = async () => {
        setPrinting(true);
        try {
            await onPrint();
        } catch (e) {
            console.error('Print failed:', e);
        } finally {
            setPrinting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={printing ? undefined : onSkip} />
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-xl shadow-xl p-5">
                <div className="flex items-start gap-3 mb-4">
                    <Printer size={20} className="text-primary-500 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
                    </div>
                    {!printing && (
                        <button onClick={onSkip} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onSkip}
                        disabled={printing}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                        Skip
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        disabled={printing}
                        className="px-3 py-1.5 text-sm rounded-lg text-white font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-70 flex items-center gap-1.5"
                    >
                        {printing ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                        {printing ? 'Printing...' : 'Print'}
                    </button>
                </div>
            </div>
        </div>
    );
}
