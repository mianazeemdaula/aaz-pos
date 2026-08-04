import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  msg: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  if (!toast) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all duration-200 ${
        toast.type === 'success'
          ? 'bg-green-600'
          : toast.type === 'info'
          ? 'bg-blue-600'
          : 'bg-red-600'
      }`}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 size={18} className="shrink-0" />
      ) : (
        <AlertCircle size={18} className="shrink-0" />
      )}
      <span className="font-medium">{toast.msg}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-2 opacity-80 hover:opacity-100 p-0.5 rounded transition-opacity"
        title="Close notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
