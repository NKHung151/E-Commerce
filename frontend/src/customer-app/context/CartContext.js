import React, { createContext, useState, useEffect } from 'react';
import CartService from '../services/cart';
import ProductService from '../services/product';
import { useAuth } from '../hooks/useAuth';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  // Load cart on mount or auth change
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (isAuthenticated || token) {
      loadCart(true);
    } else {
      setCart(null);
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadCart = async (isInitial = false) => {
    const token = localStorage.getItem('access_token');
    if (!isAuthenticated && !token) return;
    
    if (isInitial) setLoading(true);
    else setIsUpdating(true);
    
    try {
      const response = await CartService.getCart();
      const cartData = response.data;
      
      // Enrich with product details
      if (cartData && cartData.items) {
        const enrichedItems = await Promise.all(
          cartData.items.map(async (item) => {
            try {
              const productRes = await ProductService.getProductById(item.product_id);
              return { ...item, product: productRes.data };
            } catch (err) {
              console.error(`Error loading product ${item.product_id}:`, err);
              return { ...item, product: { name: 'Unknown Product', price: item.unit_price } };
            }
          })
        );
        cartData.items = enrichedItems;
      }
      
      setCart(cartData);
      setError(null);
    } catch (err) {
      console.error('Error loading cart:', err);
      // Don't show error if it's just a 401 (unauthorized)
      if (err.response?.status !== 401) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  };

  const addItem = async (productId, quantity, unitPrice = null) => {
    setIsUpdating(true);
    try {
      await CartService.addItem(productId, quantity, unitPrice);
      await loadCart();
      setError(null);
    } catch (err) {
      console.error('Error adding to cart:', err);
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateItem = async (cartItemId, quantity) => {
    setIsUpdating(true);
    try {
      await CartService.updateItem(cartItemId, quantity);
      await loadCart();
      setError(null);
    } catch (err) {
      console.error('Error updating cart item:', err);
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const removeItem = async (cartItemId) => {
    setIsUpdating(true);
    try {
      await CartService.removeItem(cartItemId);
      await loadCart();
      setError(null);
    } catch (err) {
      console.error('Error removing from cart:', err);
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const clearCart = async () => {
    setIsUpdating(true);
    try {
      await CartService.clearCart();
      setCart(null);
      setError(null);
    } catch (err) {
      console.error('Error clearing cart:', err);
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        isUpdating,
        error,
        loadCart,
        addItem,
        updateItem,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
