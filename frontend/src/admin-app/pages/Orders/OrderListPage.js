import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderService from '../../services/order';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import OrderStatusBadge from '../../../components/common/OrderStatusBadge';

export const OrderListPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadOrders();
  }, [currentPage, searchQuery]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) {
        params.search = searchQuery;
      }
      const response = await OrderService.getAllOrders(currentPage, 10, params);
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
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Order management</h1>
        <input
          type="text"
          placeholder="Search for orders (ID, Status, Address)..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="px-4 py-2 border rounded font-semibold bg-white w-64 shadow-sm"
        />
      </div>

      {orders.length === 0 ? (
        <div className="bg-blue-100 border border-blue-400 text-blue-800 px-4 py-3 rounded">
          No orders found
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-6 py-3">Order ID</th>
                  <th className="text-left px-6 py-3">Client</th>
                  <th className="text-left px-6 py-3">Booking date</th>
                  <th className="text-left px-6 py-3">Total</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-center px-6 py-3">Act</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-3 font-bold">#{order.id}</td>
                    <td className="px-6 py-3">{order.user_name || 'N/A'}</td>
                    <td className="px-6 py-3">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 font-bold">
                      ₫{Number(order.total_price || 0).toLocaleString('en-US')}
                    </td>
                    <td className="px-6 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 font-bold"
                      >
                        VIEW
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

export default OrderListPage;
