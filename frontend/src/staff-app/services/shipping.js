import api from './api';

export const ShippingService = {
  // Staff: Create shipment
  createShipment(shipmentData) {
    return api.post('/staff/shipping/', shipmentData);
  },

  // Staff: Update shipment status
  updateShipmentStatus(id, status) {
    return api.patch(`/staff/shipping/${id}/update_status/`, { status });
  },

  // Staff: Get shipping status
  getShippingStatus(orderId) {
    return api.get('/staff/shipping/status/', {
      params: { order_id: orderId },
    });
  },
};

export default ShippingService;
