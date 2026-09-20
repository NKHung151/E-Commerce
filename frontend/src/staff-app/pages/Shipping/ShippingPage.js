import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ShippingService from '../../services/shipping';
import Alert from '../../components/common/Alert';

export const ShippingPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    orderId: '',
    trackingNumber: '',
    carrier: '',
    estimatedDelivery: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await ShippingService.createShipment({
        order_id: parseInt(formData.orderId),
        tracking_number: formData.trackingNumber,
        carrier: formData.carrier,
        estimated_delivery: formData.estimatedDelivery,
      });

      setMessage('Create a successful shipment!');
      setFormData({
        orderId: '',
        trackingNumber: '',
        carrier: '',
        estimatedDelivery: '',
      });
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Create shipping shipment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Transportation Management</h1>

      {message && (
        <Alert
          type={message.includes('success') ? 'success' : 'error'}
          message={message}
          onClose={() => setMessage('')}
        />
      )}

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6">Create a new shipping batch</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">
                Order ID (Order ID)
              </label>
              <input
                type="number"
                name="orderId"
                value={formData.orderId}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">
                Tracking Number
              </label>
              <input
                type="text"
                name="trackingNumber"
                value={formData.trackingNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">
                Carrier
              </label>
              <select
                name="carrier"
                value={formData.carrier}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded"
                required
              >
                <option value="">Select shipping unit</option>
                <option value="FedEx">FedEx</option>
                <option value="UPS">UPS</option>
                <option value="DHL">DHL</option>
                <option value="Local">Internal transportation</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-bold mb-2">
                Estimated delivery date
              </label>
              <input
                type="date"
                name="estimatedDelivery"
                value={formData.estimatedDelivery}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400 font-bold"
            >
              {loading ? 'Creating...' : 'Create a shipping batch'}
            </button>
          </form>
        </div>

        <div className="bg-blue-50 p-8 rounded-lg border-2 border-blue-200">
          <h2 className="text-2xl font-bold mb-4">Quick information</h2>
          <ul className="space-y-3 text-gray-700">
            <li>✅ Create shipping for orders</li>
            <li>✅ Add tracking information</li>
            <li>✅ Update delivery status</li>
            <li>✅ Manage multiple shipping units</li>
            <li className="pt-4 border-t">
              💡 <span className="font-bold">Tip:</span> Always enter the correct Order Code and valid Bill of Lading Code
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ShippingPage;

