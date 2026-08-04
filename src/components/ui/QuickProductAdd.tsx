import { useState, useEffect, useRef } from 'react';
import { Package, Loader2, X, Plus } from 'lucide-react';
import { productService, categoryService, brandService } from '../../services/pos.service';
import { buildCategoryTree, renderCategorySelectOptions } from '../../utils/categories';
import { QuickCategoryAdd } from './QuickCategoryAdd';
import { QuickBrandAdd } from './QuickBrandAdd';
import type { Product, ProductVariant, Category, Brand } from '../../types/pos';

interface QuickProductAddProps {
  open: boolean;
  onClose: () => void;
  onCreated: (product: Product, variant: ProductVariant) => void;
  initialBarcode?: string;
}

export function QuickProductAdd({ open, onClose, onCreated, initialBarcode = '' }: QuickProductAddProps) {
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState(initialBarcode);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [quickAddCat, setQuickAddCat] = useState(false);
  const [quickAddBrand, setQuickAddBrand] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setBarcode(initialBarcode || '');
      setError('');
      categoryService
        .listAll({})
        .then(cats => {
          setCategories(cats);
          if (cats.length > 0 && !categoryId) {
            setCategoryId(cats[0].id);
          }
        })
        .catch(() => {});
      brandService
        .listAll({})
        .then(b => setBrands(b))
        .catch(() => {});

      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [open, initialBarcode]);

  const reset = () => {
    setName('');
    setBarcode('');
    setCategoryId('');
    setBrandId('');
    setCostPrice('');
    setSalePrice('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const save = async () => {
    if (!name.trim()) {
      setError('Product Name is required');
      return;
    }
    if (!barcode.trim()) {
      setError('Barcode is required');
      return;
    }
    if (!categoryId) {
      setError('Category is required');
      return;
    }

    const cPrice = costPrice !== '' ? Number(costPrice) : 0;
    const sPrice = salePrice !== '' ? Number(salePrice) : 0;

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        categoryId: Number(categoryId),
        brandId: brandId ? Number(brandId) : undefined,
        reorderLevel: 5,
        allowNegative: false,
        active: true,
        costPrice: cPrice,
        saleBelowCost: sPrice <= cPrice,
        defaultVariantPrice: sPrice,
        defaultVariantRetail: sPrice,
        stock: 0,
        variants: [
          {
            name: 'unit',
            barcode: barcode.trim(),
            price: sPrice,
            retail: sPrice,
            factor: 1,
            isDefault: true,
          },
        ],
      };

      const createdProduct = await productService.create(payload);
      const createdVariant =
        createdProduct.variants?.find(v => v.barcode === barcode.trim()) ||
        createdProduct.variants?.find(v => v.isDefault) ||
        createdProduct.variants?.[0];

      if (createdVariant) {
        const fullVariant = { ...createdVariant, product: createdProduct };
        reset();
        onCreated(createdProduct, fullVariant);
      } else {
        throw new Error('Failed to retrieve created variant');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as any)?.response?.data?.error || 'Failed to create product';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const categoryTree = buildCategoryTree(categories);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-base">
            <Package size={18} className="text-primary-600" /> Quick Add Product
          </h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={18} />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-3.5 text-sm">
          {/* Barcode & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Barcode *</label>
              <input
                type="text"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && save()}
                placeholder="Scan or enter barcode"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Product Name *</label>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && save()}
                placeholder="e.g. Milk 1L, Pepsi 500ml"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>

          {/* Category & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Category *</label>
              <div className="flex gap-1.5">
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(Number(e.target.value) || '')}
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">-- Select Category --</option>
                  {renderCategorySelectOptions(categoryTree)}
                </select>
                <button
                  type="button"
                  onClick={() => setQuickAddCat(true)}
                  title="Add New Category"
                  className="px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Brand (Optional)</label>
              <div className="flex gap-1.5">
                <select
                  value={brandId}
                  onChange={e => setBrandId(Number(e.target.value) || '')}
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">-- None --</option>
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setQuickAddBrand(true)}
                  title="Add New Brand"
                  className="px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Purchase Cost & Sale Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Purchase / Cost Price</label>
              <input
                type="number"
                min="0"
                step="any"
                value={costPrice}
                onChange={e => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && save()}
                placeholder="0.00"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Sale / Retail Price</label>
              <input
                type="number"
                min="0"
                step="any"
                value={salePrice}
                onChange={e => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && save()}
                placeholder="0.00"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
              {error}
            </p>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex gap-2 mt-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!name.trim() || !barcode.trim() || !categoryId || saving}
            className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Package size={15} />}
            Save &amp; Add
          </button>
        </div>
      </div>

      {/* Sub-modals for Category and Brand */}
      <QuickCategoryAdd
        open={quickAddCat}
        onClose={() => setQuickAddCat(false)}
        onCreated={c => {
          setCategories(prev => [...prev, c]);
          setCategoryId(c.id);
          setQuickAddCat(false);
        }}
      />
      <QuickBrandAdd
        open={quickAddBrand}
        onClose={() => setQuickAddBrand(false)}
        onCreated={b => {
          setBrands(prev => [...prev, b]);
          setBrandId(b.id);
          setQuickAddBrand(false);
        }}
      />
    </div>
  );
}
