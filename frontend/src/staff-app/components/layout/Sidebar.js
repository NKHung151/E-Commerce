import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Sidebar = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <aside className="w-64 bg-gray-800 text-white min-h-screen">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-8">Staff Menu</h2>
        <nav className="space-y-4">
          <div>
            <p className="px-4 py-2 text-gray-400 text-sm font-bold">
              Manage
            </p>
            <Link
              to="/products"
              className={`block px-4 py-2 rounded ${
                isActive('/products')
                  ? 'bg-blue-600'
                  : 'hover:bg-gray-700'
              }`}
            >
              Product
            </Link>
            <Link
              to="/orders"
              className={`block px-4 py-2 rounded ${
                isActive('/orders')
                  ? 'bg-blue-600'
                  : 'hover:bg-gray-700'
              }`}
            >
              Order
            </Link>
          </div>

        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
