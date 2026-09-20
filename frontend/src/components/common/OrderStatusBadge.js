import React from 'react';

export const OrderStatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'pending processing':
        return { text: 'Pending', bg: 'bg-yellow-100', textCol: 'text-yellow-800' };
      case 'paid':
      case 'paid':
        return { text: 'Paid', bg: 'bg-indigo-100', textCol: 'text-indigo-800' };
      case 'shipping':
      case 'are delivering':
      case 'is being transported':
      case 'being packaged':
        return { text: 'Shipping', bg: 'bg-blue-100', textCol: 'text-blue-800' };
      case 'delivered':
      case 'delivered':
      case 'delivered successfully':
        return { text: 'Delivered', bg: 'bg-green-100', textCol: 'text-green-800' };
      case 'cancelled':
      case 'has been cancelled':
        return { text: 'Cancelled', bg: 'bg-red-100', textCol: 'text-red-800' };
      default:
        return { text: status || 'Unknown', bg: 'bg-gray-100', textCol: 'text-gray-800' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.textCol} whitespace-nowrap`}>
      {config.text}
    </span>
  );
};

export default OrderStatusBadge;
