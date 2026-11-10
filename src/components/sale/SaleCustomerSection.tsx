import { UserPlus } from 'lucide-react';
import { CustomerSearch } from '../ui/CustomerSearch';
import { useGlobalSettings } from '../../contexts/SettingsContext';
import { Kbd, PanelSection } from '../pos/PosKit';
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
  // Creating a customer is the Customers module, and the API enforces that too.
  // Without the permission the button would only ever produce a 403.
  const { hasPermission } = useGlobalSettings();
  const canCreateCustomer = hasPermission('customers', 'edit');

  return (
    <PanelSection
      title="Customer"
      hint={<Kbd>F10</Kbd>}
      action={
        canCreateCustomer && (
          <button
            type="button"
            onClick={onOpenNewCustomer}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            <UserPlus size={12} /> New <Kbd className="ml-0.5">F11</Kbd>
          </button>
        )
      }
    >
      <CustomerSearch
        value={customer}
        onSelect={setCustomer}
        inputRef={customerInputRef}
        onCreateNew={canCreateCustomer ? onOpenNewCustomer : undefined}
      />
      {!customer && <p className="mt-1.5 text-[11px] text-gray-400">Walk-in sale. Select a customer to sell on credit.</p>}
    </PanelSection>
  );
}
