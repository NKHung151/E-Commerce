import api from './api';

export const UserService = {
  // Admin: Get all users
  getUsers(page = 1, pageSize = 10) {
    return api.get('/admin/users/', {
      params: { page, page_size: pageSize },
    });
  },

  // Admin: Get user details
  getUserById(id) {
    return api.get(`/admin/users/${id}/`);
  },

  // Admin: Create user
  createUser(userData) {
    return api.post('/admin/users/', userData);
  },

  // Admin: Update user
  updateUser(id, userData) {
    return api.put(`/admin/users/${id}/`, userData);
  },

  // Admin: Delete user
  deleteUser(id) {
    return api.delete(`/admin/users/${id}/`);
  },
};

export default UserService;
