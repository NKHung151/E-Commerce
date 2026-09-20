import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UserService from '../../services/user';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import Alert from '../../components/common/Alert';

export const UsersListPage = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const q = searchInput.toLowerCase();
    const filtered = users.filter((user) => {
      return (
        (user.username && user.username.toLowerCase().includes(q)) ||
        (user.email && user.email.toLowerCase().includes(q)) ||
        (user.role && user.role.toLowerCase().includes(q)) ||
        String(user.id).includes(q)
      );
    });
    setFilteredUsers(filtered);
    setTotalPages(Math.max(1, Math.ceil(filtered.length / 10)));
    setCurrentPage(1);
  }, [users, searchInput]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await UserService.getUsers(1, 1000);
      const userList = response.data.results || response.data || [];
      setUsers(userList);
      setError('');
    } catch (err) {
      setError('Loading user list failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await UserService.deleteUser(id);
      setSuccess('Successfully deleted user');
      loadUsers();
    } catch (err) {
      setError('User deletion failed');
      console.error(err);
    }
  };

  const startIndex = (currentPage - 1) * 10;
  const displayedUsers = filteredUsers.slice(startIndex, startIndex + 10);

  if (loading && users.length === 0) return <LoadingSpinner />;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User management</h1>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search for users..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="px-4 py-2 border rounded font-semibold bg-white"
          />
          <Link
            to="/admin/users/new"
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-bold flex items-center"
          >
            + Create users
          </Link>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-bold">ID</th>
              <th className="px-6 py-3 text-left font-bold">Login name</th>
              <th className="px-6 py-3 text-left font-bold">Email</th>
              <th className="px-6 py-3 text-left font-bold">Role</th>
              <th className="px-6 py-3 text-left font-bold">Act</th>
            </tr>
          </thead>
          <tbody>
            {displayedUsers.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">{user.id}</td>
                <td className="px-6 py-3 font-medium">{user.username}</td>
                <td className="px-6 py-3">{user.email}</td>
                <td className="px-6 py-3">
                  <span className={`px-3 py-1 rounded text-sm font-bold ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' :
                    user.role === 'staff' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-3 space-x-4">
                  <Link
                    to={`/admin/users/${user.id}/edit`}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Update
                  </Link>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-600 hover:underline font-bold"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {displayedUsers.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            )}
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
    </div>
  );
};

export default UsersListPage;
