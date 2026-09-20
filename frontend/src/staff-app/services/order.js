import api from './api';

export const OrderService = {
  // Staff: Get ALL orders (not just own)
  getAllOrders(page = 1, pageSize = 10, params = {}) {
    return api.get('/staff/orders/', {
      params: { page, page_size: pageSize, ...params },
    });
  },

  // Staff: Get order details
  getOrderById(id) {
    return api.get(`/staff/orders/${id}/`);
  },

  // Staff: Update order status
  updateOrderStatus(id, status) {
    return api.patch(`/staff/orders/${id}/update_status/`, { status });
  },
};

export default OrderService;
