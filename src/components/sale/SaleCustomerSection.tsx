import { UserPlus } from 'lucide-react';
import { CustomerSearch } from '../ui/CustomerSearch';
import type { Customer } from '../../types/pos';

interface SaleCustomerSectionProps {
  customer: Customer | null;
  setCustomer: (c: Customer | null) => void;
  customerInputRef: React.RefObject<HTMLInputElement | null>;
  onOpenNewCustomer: () => void;
}

export function SaleCustomerSection({
  customer,
  setCustomer,
  customerInputRef,
  onOpenNewCustomer,
}: SaleCustomerSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase">
          Customer <span className="normal-case font-normal text-gray-400">(optional)</span>
        </p>
        <button
          onClick={onOpenNewCustomer}
          className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-0.5"
        >
          <UserPlus size={11} /> New <span className="text-gray-400 ml-0.5">(F11)</span>
        </button>
      </div>
      <CustomerSearch
        value={customer}
        onSelect={setCustomer}
        inputRef={customerInputRef}
        onCreateNew={onOpenNewCustomer}
      />
    </div>
  );
}
