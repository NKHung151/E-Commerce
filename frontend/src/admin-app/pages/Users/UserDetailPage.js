import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserService from '../../services/user';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';

export const UserDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await UserService.getUserById(id);
      setUser(response.data);
      setError('');
    } catch (err) {
      setError('Downloading user information failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!user) return <Alert type="error" message="User not found" />;

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/admin/users')}
        className="mb-6 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
      >
        ← Return to user list
      </button>

      {error && <Alert type="error" message={error} />}

      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl">
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="ml-6">
            <h1 className="text-3xl font-bold">{user.username}</h1>
            <p className="text-gray-600">Code: {user.id}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-gray-600 text-sm">Email</p>
            <p className="text-lg font-medium">{user.email}</p>
          </div>

          <div>
            <p className="text-gray-600 text-sm">Role</p>
            <span className={`inline-block px-3 py-1 rounded text-sm font-bold ${
              user.role === 'admin' ? 'bg-red-100 text-red-800' :
              user.role === 'staff' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {user.role}
            </span>
          </div>

          <div>
            <p className="text-gray-600 text-sm">Status</p>
            <p className="text-lg font-medium">Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailPage;
