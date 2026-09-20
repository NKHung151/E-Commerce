import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OrderService from '../../services/order';
import PaymentService from '../../services/payment';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import OrderStatusBadge from '../../../components/common/OrderStatusBadge';
import ProductService from '../../services/product';

export const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const orderResponse = await OrderService.getOrderById(id);
      const orderData = orderResponse.data;

      // Fetch product details for each item
      if (orderData.items && orderData.items.length > 0) {
        const enrichedItems = await Promise.all(
          orderData.items.map(async (item) => {
            try {
              const productResp = await ProductService.getProductById(item.product_id);
              return { ...item, product: productResp.data };
            } catch (err) {
              return item;
            }
          })
        );
        orderData.items = enrichedItems;
      }

      setOrder(orderData);

      const paymentResponse = await PaymentService.getPaymentStatus(id);
      setPayment(paymentResponse.data);
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return <div className="text-center py-8">Order not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
      >
        ← Go back
      </button>

      <h1 className="text-3xl font-bold mb-8">Order #{order.id}</h1>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <div className="bg-gray-100 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-bold mb-4">Order status</h2>
            <p className="text-lg mb-2">
              <span className="font-bold">Status:</span>{' '}
              <OrderStatusBadge status={order.status} />
            </p>
            <p className="text-lg mb-2">
              <span className="font-bold">Booking date:</span>{' '}
              {new Date(order.created_at).toLocaleString()}
            </p>
            <p className="text-lg">
              <span className="font-bold">Total amount:</span> ₫
              {Number(order.total_price || 0).toLocaleString('en-US')}
            </p>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Delivery address</h2>
            <p className="text-gray-800 whitespace-pre-wrap">
              {order.address || 'No address provided'}
            </p>
          </div>
        </div>

        <div>
          <div className="bg-gray-100 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-bold mb-4">Product list</h2>
            <div className="space-y-4">
              {order.items && order.items.map((item) => (
                <div key={item.id} className="pb-4 border-b flex items-start gap-4">
                  {item.product?.image_url || item.product?.image ? (
                    <img 
                      src={item.product.image_url || item.product.image} 
                      alt={item.product.name} 
                      className="w-16 h-16 object-cover rounded-lg border border-gray-100" 
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400 border border-gray-200">
                      No Image
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 line-clamp-2 leading-tight">
                      {item.product ? item.product.name : `Product #${item.product_id}`}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Quantity: {item.quantity}</p>
                    <p className="text-lg font-bold text-[#EE4D2D] mt-1">
                      ₫{(Number(item.unit_price || 0) * (item.quantity || 0)).toLocaleString('en-US')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {payment && (
            <div className="bg-gray-100 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Payment status</h2>
              <p className="text-lg mb-2">
                <span className="font-bold">Status:</span>{' '}
                <span className="px-3 py-1 bg-green-200 rounded">
                  {payment.status}
                </span>
              </p>
              <p className="text-lg">
                <span className="font-bold">Amount:</span> ₫
                {Number(payment.amount || 0).toLocaleString('en-US')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
