import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import OrderService from '../../services/order';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import OrderStatusBadge from '../../../components/common/OrderStatusBadge';

export const MyOrdersPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      loadOrders();
    }
  }, [isAuthenticated, navigate, currentPage]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await OrderService.getMyOrders(currentPage, 10);
      setOrders(response.data.results || []);
      setTotalPages(Math.ceil((response.data.count || 0) / 10));
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && currentPage === 1) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My order</h1>

      {orders.length === 0 ? (
        <div className="bg-blue-100 border border-blue-400 text-blue-800 px-4 py-3 rounded">
          <p>You haven't placed any orders yet.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Start shopping
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="border rounded-lg p-4 hover:shadow-lg cursor-pointer transition"
              >
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Order code</p>
                    <p className="font-bold">#{order.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Booking date</p>
                    <p className="font-bold">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <div className="mt-1">
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total amount</p>
                    <p className="font-bold text-lg">
                      ₫{Number(order.total_price || 0).toLocaleString('en-US')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default MyOrdersPage;
