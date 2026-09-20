import api from './api';

export const OrderService = {
  // Customer: Create order
  createOrder(orderData) {
    return api.post('/orders/', orderData);
  },

  // Customer: Get my orders only
  getMyOrders(page = 1, pageSize = 10) {
    return api.get('/orders/', {
      params: { page, page_size: pageSize },
    });
  },

  // Customer: Get my order details
  getOrderById(id) {
    return api.get(`/orders/${id}/`);
  },
};

export default OrderService;
