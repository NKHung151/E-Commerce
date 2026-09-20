import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="bg-red-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">🔐 Admin portal</h1>
          <p className="text-sm text-red-200">Control the entire system</p>
        </div>

        <nav className="flex gap-4 items-center">
          {isAuthenticated && (
            <>
              <span className="font-bold">{user?.username}</span>
              <button
                onClick={() => {
                  logout();
                  window.location.href = '/admin/login';
                }}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-bold text-sm"
              >
                Sign out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
