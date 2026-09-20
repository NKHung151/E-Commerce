import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import OrderService from '../../services/order';
import PaymentService from '../../services/payment';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';
import { aiService } from '../../../services/aiService';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    shippingAddress: '',
    paymentMethod: 'card',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const isOrderCompleted = React.useRef(false);

  useEffect(() => {
    if (!isOrderCompleted.current && (!cart || !cart.items || cart.items.length === 0)) {
      navigate('/cart');
    }
  }, [cart, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const priceOf = (product) => {
    if (!product) return 0;
    const v = Number(product.price ?? product.unit_price ?? product.price_amount ?? 0);
    return Number.isFinite(v) ? v : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Create order
      const orderData = {
        items: cart.items.map((item) => ({
          product_id: parseInt(item.product.id),
          quantity: item.quantity,
        })),
        address: formData.shippingAddress,
        payment_method: formData.paymentMethod,
      };

      const orderResponse = await OrderService.createOrder(orderData);
      const orderId = orderResponse.data.id;

      isOrderCompleted.current = true;
      
      // TRACK BEHAVIOR: Send behavior 'purchase' for each product
      if (user?.id) {
        cart.items.forEach(item => {
          aiService.trackBehavior(user.id, item.product.id, 'purchase');
        });
      }

      await clearCart();
      setMessage('Order successful!');
      setTimeout(() => navigate(`/orders/${orderId}`), 1500);
    } catch (error) {
      console.error('Checkout error:', error);
      const errorData = error.response?.data;
      const status = error.response?.status;
      
      let errorMsg = 'Order failed';
      if (typeof errorData === 'string') {
        errorMsg = `Server error (${status}): ${errorData.substring(0, 50)}...`;
      } else if (errorData) {
        errorMsg = errorData.error || errorData.detail || errorData.message || `Error ${status}: ${JSON.stringify(errorData)}`;
      } else if (error.message) {
        errorMsg = `Network error: ${error.message}`;
      }
      
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!cart || !cart.items) {
    return <LoadingSpinner />;
  }

  const subtotal = cart.items.reduce(
    (sum, item) => sum + priceOf(item.product) * (item.quantity || 0),
    0
  );
  const tax = subtotal * 0.1;
  const shipping = subtotal > 100 ? 0 : 5;
  const total = subtotal + tax + shipping;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Pay</h1>

      {message && (
        <Alert
          type={message.includes('failure') || message.includes('Error') ? 'error' : 'success'}
          message={message}
          onClose={() => setMessage('')}
        />
      )}

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">Order details</h2>
          <div className="bg-gray-100 p-4 rounded mb-6">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between mb-2 pb-2 border-b">
                <div>
                  <p className="font-bold">{item.product.name}</p>
                  <p className="text-sm text-gray-600">SL: {item.quantity}</p>
                </div>
                <p className="font-bold">
                  ₫{(priceOf(item.product) * item.quantity).toLocaleString('en-US')}
                </p>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t space-y-1">
              <div className="flex justify-between">
                <span>Temporary calculation:</span>
                <span>₫{subtotal.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (10%):</span>
                <span>₫{tax.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between">
                <span>Transport:</span>
                <span>₫{shipping.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total:</span>
                <span>₫{total.toLocaleString('en-US')}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Shipping & Payment</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">
                Delivery address
              </label>
              <textarea
                name="shippingAddress"
                value={formData.shippingAddress}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded h-24"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-bold mb-2">
                Payment method
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded"
              >
                <option value="card">Credit/Debit Card</option>
                <option value="bank">Bank transfer</option>
                <option value="cash">Payment upon delivery (COD)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:bg-gray-400 font-bold text-lg"
            >
              {loading ? 'Processing...' : `Order completed (₫${total.toLocaleString('en-US')})`}
            </button>
          </form>

          <button
            onClick={() => navigate('/cart')}
            className="w-full mt-4 bg-gray-400 text-white py-2 rounded hover:bg-gray-500"
          >
            Return to cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
