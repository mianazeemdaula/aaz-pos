import { SupplierSearch } from '../ui/SupplierSearch';
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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
          Supplier <span className="normal-case font-normal text-gray-400">(optional)</span>
        </p>
        <SupplierSearch value={supplier} onSelect={setSupplier} onCreateNew={onOpenQuickSupplier} />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Ref / Bill #</label>
        <input
          value={refNo}
          onChange={e => setRefNo(e.target.value)}
          placeholder="e.g. INV-001"
          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
    </div>
  );
}
