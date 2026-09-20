import api from './api';

export const CartService = {
  // Customer: Get cart
  getCart() {
    return api.get('/cart/list_cart/');
  },

  // Customer: Add item to cart
  addItem(productId, quantity, unitPrice = null) {
    const body = { product_id: productId, quantity };
    if (unitPrice !== null && unitPrice !== undefined) body.unit_price = unitPrice;
    return api.post('/cart/add_item/', body);
  },

  // Customer: Update item quantity
  updateItem(productId, quantity) {
    return api.put('/cart/update_item/', {
      product_id: productId,
      quantity,
    });
  },

  // Customer: Remove item from cart
  removeItem(productId) {
    return api.delete('/cart/remove_item/', {
      data: { product_id: productId },
    });
  },

  // Customer: Clear cart
  clearCart() {
    return api.delete('/cart/clear_cart/');
  },
};

export default CartService;
