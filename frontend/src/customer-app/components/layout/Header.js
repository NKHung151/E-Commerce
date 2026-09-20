import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { cart } = useCart();

  const cartCount = cart?.items?.length || 0;

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-black tracking-tight text-blue-600 flex items-center gap-2 hover:opacity-90 transition-opacity">
          <span className="bg-blue-600 text-white px-2.5 py-1 rounded-lg text-lg font-black shadow-md shadow-blue-500/20">E</span>
          <span className="text-gray-900 font-extrabold text-xl">Shop</span>
        </Link>

        <nav className="flex gap-6 items-center">
          {isAuthenticated ? (
            <>
              <Link to="/cart" className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors">
                <span className="text-lg">🛒</span>
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link to="/orders" className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors">
                Order
              </Link>
              <Link to="/profile" className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-all flex items-center gap-1.5">
                👤 {user?.username}
              </Link>
              <button
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }}
                className="text-sm font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 px-4 py-1.5 rounded-lg transition-all"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors">
                Log in
              </Link>
              <Link to="/register" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-500/10 hover:shadow-blue-500/25 transition-all">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
