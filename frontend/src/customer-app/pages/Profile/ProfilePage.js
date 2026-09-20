import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Personal profile</h1>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white border rounded-lg p-8 shadow-lg">
          <div className="flex items-center mb-6">
            <div className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center text-4xl font-bold mr-6">
              {user.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user.username}</h2>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500 mt-2">
                Role: <span className="font-bold">{user.role}</span>
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-bold mb-4">Account information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Login name</p>
                <p className="font-bold">{user.username}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Email</p>
                <p className="font-bold">{user.email}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">User code</p>
                <p className="font-bold">{user.id}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Role</p>
                <p className="font-bold capitalize">{user.role}</p>
              </div>
            </div>
          </div>

          <div className="border-t mt-6 pt-6">
            <button
              onClick={() => navigate('/orders')}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mb-3"
            >
              View orders
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
