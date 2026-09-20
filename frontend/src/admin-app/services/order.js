import api from './api';

export const OrderService = {
  getAllOrders(page = 1, pageSize = 10, params = {}) {
    return api.get('/staff/orders/', {
      params: { page, page_size: pageSize, ...params },
    });
  },

  getOrderById(id) {
    return api.get(`/staff/orders/${id}/`);
  },

  updateOrderStatus(id, status) {
    return api.patch(`/staff/orders/${id}/update_status/`, { status });
  },
};

export default OrderService;
