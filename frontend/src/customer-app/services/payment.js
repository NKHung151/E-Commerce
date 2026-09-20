import api from './api';

export const PaymentService = {
  // Customer: Make payment
  pay(paymentData) {
    return api.post('/payment/pay/', paymentData);
  },

  // Customer: Check payment status
  getPaymentStatus(orderId) {
    return api.get('/payment/status/', {
      params: { order_id: orderId },
    });
  },

  // Staff: Confirm payment manually
  confirmPayment(orderId) {
    return api.post(`/payment/${orderId}/confirm/`);
  },
};

export default PaymentService;
