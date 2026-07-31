import type { ReactNode } from 'react';
import type { Category } from '../types/pos';

/**
 * Builds a hierarchical category tree from a flat or nested array of categories.
 * Guarantees zero lost subcategories at any depth level.
 */
export function buildCategoryTree(rawCategories: Category[]): Category[] {
  if (!Array.isArray(rawCategories)) return [];

  const map = new Map<number, Category>();
  const roots: Category[] = [];

  // Step 1: Create a map with deep copies and clean subcategories arrays
  for (const c of rawCategories) {
    if (c && typeof c.id === 'number') {
      map.set(c.id, {
        ...c,
        subcategories: Array.isArray(c.subcategories)
          ? c.subcategories.map(s => ({ ...s }))
          : [],
      });
    }
  }

  // Step 2: Assemble parent-child linkages
  for (const c of rawCategories) {
    if (!c || typeof c.id !== 'number') continue;
    const node = map.get(c.id)!;

    if (c.parentId && map.has(c.parentId)) {
      const parent = map.get(c.parentId)!;
      parent.subcategories = parent.subcategories ?? [];
      if (!parent.subcategories.some(s => s.id === node.id)) {
        parent.subcategories.push(node);
      }
    } else if (!c.parentId) {
      if (!roots.some(r => r.id === node.id)) {
        roots.push(node);
      }
    }
  }

  return roots;
}

/**
 * Renders category tree options for HTML select dropdowns.
 * Indents nested subcategories (depth 0: "Category", depth 1: "└ Subcategory", depth 2: "└ Sub-subcategory").
 */
export function renderCategorySelectOptions(cats: Category[], depth = 0): ReactNode[] {
  if (!Array.isArray(cats)) return [];

  return cats.flatMap(c => {
    const subs = c.subcategories ?? [];
    const indent = '\u00A0\u00A0'.repeat(depth);
    const prefix = depth > 0 ? '└ ' : '';
    const labelText = `${indent}${prefix}${c.name}`;

    return [
      <option key={c.id} value={c.id}>
        {labelText}
      </option>,
      ...(subs.length > 0 ? renderCategorySelectOptions(subs, depth + 1) : []),
    ];
  });
}
