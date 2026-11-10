import { useCallback, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

const storageKey = (basePath: string) => `listSearch:${basePath}`;

/** Path back to a list page, including the search, filters and page it was last showing. */
export function listPath(basePath: string): string {
  try { return basePath + (sessionStorage.getItem(storageKey(basePath)) ?? ''); }
  catch { return basePath; }
}

/**
 * Keeps a list page's search, filters and page number in the URL so they survive
 * opening a detail/edit page and coming back (and a refresh). Pair with listPath()
 * on the pages that link back to the list.
 */
export function useListParams(basePath: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  useEffect(() => {
    try { sessionStorage.setItem(storageKey(basePath), location.search); } catch { /* storage unavailable */ }
  }, [basePath, location.search]);

  const get = useCallback((key: string) => searchParams.get(key) ?? '', [searchParams]);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  // Empty values and page 1 are dropped so an unfiltered list keeps a clean URL.
  const update = useCallback((patch: Record<string, string | number>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(patch)) {
        if (value === '' || (key === 'page' && value === 1)) next.delete(key);
        else next.set(key, String(value));
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setPage = useCallback((p: number) => update({ page: p }), [update]);

  return { get, page, setPage, update };
}
