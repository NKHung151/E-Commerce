import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cartApi, catalogApi } from '../api/shop';
import { useAuth } from '../lib/auth';

const CartContext = createContext(null);

// Product details are cached for the session: the cart only stores ids and prices,
// and re-fetching every product on each cart change was N requests per update.
const productCache = new Map();

async function withProducts(items) {
  return Promise.all(
    items.map(async (item) => {
      if (!productCache.has(item.product_id)) {
        productCache.set(
          item.product_id,
          catalogApi.product(item.product_id).catch(() => null)
        );
      }
      return { ...item, product: await productCache.get(item.product_id) };
    })
  );
}

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
      setItems(await withProducts(cart.items || []));
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

  const value = useMemo(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + Number(i.product?.price ?? i.unit_price) * i.quantity, 0);
    return {
      items,
      count,
      subtotal,
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
    };
  }, [items, loading, busyId, reload, mutate]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
