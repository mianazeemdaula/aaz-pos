import { SupplierSearch } from '../ui/SupplierSearch';
import { PanelSection } from '../pos/PosKit';
import type { Supplier } from '../../types/pos';

interface PurchaseSupplierSectionProps {
  supplier: Supplier | null;
  setSupplier: (s: Supplier | null) => void;
  refNo: string;
  setRefNo: (val: string) => void;
  onOpenQuickSupplier: () => void;
}

export function PurchaseSupplierSection({
  supplier,
  setSupplier,
  refNo,
  setRefNo,
  onOpenQuickSupplier,
}: PurchaseSupplierSectionProps) {
  return (
    <PanelSection title="Supplier">
      <SupplierSearch value={supplier} onSelect={setSupplier} onCreateNew={onOpenQuickSupplier} />
      {!supplier && <p className="mt-1.5 text-[11px] text-gray-400">No supplier: the purchase must be paid in full.</p>}

      <label className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-nowrap">Bill / Ref #</span>
        <input
          value={refNo}
          onChange={e => setRefNo(e.target.value)}
          placeholder="e.g. INV-001"
          className="w-40 px-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none"
        />
      </label>
    </PanelSection>
  );
}
