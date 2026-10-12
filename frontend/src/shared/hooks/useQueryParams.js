import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * URL query string as filter state, so filters survive reloads, back/forward and sharing.
 *
 *   const [query, setQuery] = useQueryParams();
 *   query.category    // undefined when absent
 *   setQuery({ category: '3' })   // empty values are removed; any change resets `page`
 */
export function useQueryParams() {
  const [params, setParams] = useSearchParams();

  const query = useMemo(() => Object.fromEntries(params), [params]);

  const setQuery = useCallback(
    (changes, { replace = false } = {}) => {
      const next = replace ? new URLSearchParams() : new URLSearchParams(params);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === '' || value == null) next.delete(key);
        else next.set(key, String(value));
      });
      if (!('page' in changes)) next.delete('page');
      setParams(next);
    },
    [params, setParams]
  );

  return [query, setQuery];
}

/** Current page number from the query string (1-based). */
export const pageOf = (query) => Math.max(1, Number(query.page) || 1);
