import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Run an async loader and track { data, loading, error }. Re-runs when `deps` change;
 * results of stale runs are ignored so fast navigation never shows old data.
 */
export function useAsync(loader, deps = [], { initial = null, enabled = true } = {}) {
  const [state, setState] = useState({ data: initial, loading: enabled, error: null });
  const runId = useRef(0);

  const run = useCallback(async () => {
    const id = ++runId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loader();
      if (id === runId.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (id === runId.current) setState((s) => ({ ...s, loading: false, error }));
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (enabled) run();
    else setState((s) => ({ ...s, loading: false }));
  }, [run, enabled]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload: run, setData };
}

