import api from './api';

export const PaymentService = {
  getPaymentStatus(orderId) {
    return api.get('/payment/status/', {
      params: { order_id: orderId },
    });
  },

  confirmPayment(orderId) {
    return api.post(`/payment/${orderId}/confirm/`);
  },
};

export default PaymentService;
