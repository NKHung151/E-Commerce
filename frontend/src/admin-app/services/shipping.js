import api from './api';

export const ShippingService = {
  createShipment(shipmentData) {
    return api.post('/staff/shipping/create/', shipmentData);
  },

  updateShipmentStatus(id, status) {
    return api.patch(`/staff/shipping/${id}/update_status/`, { status });
  },

  getShippingStatus(orderId) {
    return api.get('/staff/shipping/status/', {
      params: { order_id: orderId },
    });
  },
};

export default ShippingService;
