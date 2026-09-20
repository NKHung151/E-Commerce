import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserService from '../../services/user';
import Alert from '../../components/common/Alert';

export const CreateUserPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'customer'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await UserService.createUser(formData);
      navigate('/admin/users');
    } catch (err) {
      setError(err.response?.data?.detail || 'User creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Add users</h1>

      {error && <Alert type="error" message={error} />}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-gray-700 font-bold mb-2">Login name</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 font-bold mb-2">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 font-bold mb-2">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-gray-700 font-bold mb-2">Role</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
          >
            <option value="customer">Customer (Customer)</option>
            <option value="staff">Staff</option>
            <option value="admin">Administrator (Admin)</option>
          </select>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 disabled:bg-gray-400"
          >
            {loading ? 'Creating...' : 'Save users'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="flex-1 bg-gray-300 py-2 rounded font-bold hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserPage;
