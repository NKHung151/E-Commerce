import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Sidebar = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen">
      <div className="p-6 flex flex-col h-full">
        <h2 className="text-xl font-bold mb-8 text-center border-b border-gray-700 pb-4">
          ADMIN PORT
        </h2>
        
        <nav className="space-y-2 flex-1">
          <Link
            to="/admin/users"
            className={`block px-4 py-3 rounded font-bold transition-colors ${
              isActive('/admin/users') ? 'bg-red-600' : 'hover:bg-gray-700'
            }`}
          >
            👥 User management
          </Link>
          <Link
            to="/admin/products"
            className={`block px-4 py-3 rounded font-bold transition-colors ${
              isActive('/admin/products') ? 'bg-red-600' : 'hover:bg-gray-700'
            }`}
          >
            📦 Product management
          </Link>
          <Link
            to="/admin/orders"
            className={`block px-4 py-3 rounded font-bold transition-colors ${
              isActive('/admin/orders') ? 'bg-red-600' : 'hover:bg-gray-700'
            }`}
          >
            📋 Order management
          </Link>
        </nav>

      </div>
    </aside>
  );
};

export default Sidebar;
