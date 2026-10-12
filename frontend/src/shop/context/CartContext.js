import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../shared/auth/AuthProvider';
import { countItems } from '../../shared/utils/format';
import { attachProducts, linePrice } from '../../shared/utils/products';
import { cartApi, catalogApi } from '../api';

const CartContext = createContext(null);

// The cart stores only ids and prices. Product details are cached for the session so a
// quantity change doesn't re-fetch every product in the cart.
const productCache = new Map();

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const reload = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const cart = await cartApi.get();
      setItems(await attachProducts(cart.items || [], (id) => catalogApi.product(id), productCache));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    reload().catch(() => setItems([]));
  }, [reload]);

  const mutate = useCallback(
    async (productId, action) => {
      setBusyId(productId);
      try {
        await action();
        await reload();
      } finally {
        setBusyId(null);
      }
    },
    [reload]
  );

  const value = useMemo(
    () => ({
      items,
      count: countItems(items),
      subtotal: items.reduce((sum, line) => sum + linePrice(line) * line.quantity, 0),
      loading,
      busyId,
      reload,
      add: (productId, qty = 1) => mutate(productId, () => cartApi.add(productId, qty)),
      update: (productId, qty) => mutate(productId, () => cartApi.update(productId, qty)),
      remove: (productId) => mutate(productId, () => cartApi.remove(productId)),
      clear: async () => {
        await cartApi.clear();
        setItems([]);
      },
    }),
    [items, loading, busyId, reload, mutate]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
