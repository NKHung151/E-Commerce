import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OrderService from '../../services/order';
import ShippingService from '../../services/shipping';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import OrderStatusBadge from '../../../components/common/OrderStatusBadge';
import Alert from '../../components/common/Alert';

export const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const response = await OrderService.getOrderById(id);
      setOrder(response.data);
      setNewStatus(response.data.status);
    } catch (error) {
      console.error('Error loading order:', error);
      setMessage('Order not found');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (newStatus === order.status) {
      setMessage('Unchanged state');
      return;
    }

    setStatusUpdating(true);
    try {
      await OrderService.updateOrderStatus(id, newStatus);
      setMessage('Update order status successfully!');
      setTimeout(() => loadOrder(), 1000);
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Status update failed');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return <Alert type="error" message="Order not found" />;

  return (
    <div>
      <button
        onClick={() => navigate('/admin/orders')}
        className="mb-4 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
      >
        ← Return to order list
      </button>

      <h1 className="text-3xl font-bold mb-8">Order #{order.id}</h1>

      {message && (
        <Alert
          type={message.includes('Error') || message.includes('failed') || message.includes('failure') || message.includes('Error') ? 'error' : 'success'}
          message={message}
          onClose={() => setMessage('')}
        />
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {/* Order Items */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">Products in the order</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Product</th>
                  <th className="text-center py-2">Unit price</th>
                  <th className="text-center py-2">Quantity</th>
                  <th className="text-right py-2">Temporarily calculated</th>
                </tr>
              </thead>
              <tbody>
                {order.items && order.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">Product #{item.product_id}</td>
                    <td className="text-center py-2">₫{Number(item.unit_price || 0).toLocaleString('en-US')}</td>
                    <td className="text-center py-2">{item.quantity}</td>
                    <td className="text-right py-2 font-bold">
                      ₫{(Number(item.unit_price || 0) * (item.quantity || 0)).toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Order Details */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Delivery address</h2>
            <p className="text-gray-800 whitespace-pre-wrap">
              {order.address || 'No address provided'}
            </p>
          </div>
        </div>

        <div>
          {/* Status Update */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">Update status</h2>
            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">
                Current status
              </label>
              <div className="mt-1">
                <OrderStatusBadge status={order.status} />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">
                New status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-4 py-2 border rounded"
                disabled={order.status === 'delivered' || order.status === 'cancelled'}
              >
                {(() => {
                  const transitions = {
                    'pending': ['pending', 'processing', 'cancelled'],
                    'processing': ['processing', 'shipped', 'cancelled'],
                    'shipped': ['shipped', 'delivered'],
                    'delivered': ['delivered'],
                    'cancelled': ['cancelled']
                  };
                  const labels = {
                    'pending': 'Pending',
                    'processing': 'Processing',
                    'shipped': 'Delivered to Vendor (Shipped)',
                    'delivered': 'Delivered',
                    'cancelled': 'Cancelled'
                  };
                  const allowed = transitions[order.status] || [order.status];
                  return allowed.map(status => (
                    <option key={status} value={status}>{labels[status]}</option>
                  ));
                })()}
              </select>
            </div>

            <button
              onClick={handleStatusUpdate}
              disabled={statusUpdating || newStatus === order.status}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 font-bold"
            >
              {statusUpdating ? 'Updating...' : 'Update status'}
            </button>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-100 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Order date:</span>
                <span>{new Date(order.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total amount:</span>
                <span>₫{Number(order.total_price || 0).toLocaleString('en-US')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
