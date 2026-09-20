import api from './api';

export const AuthService = {
  // Guest: Register
  register(userData) {
    return api.post('/auth/register/', userData);
  },

  // Guest: Login
  login(username, password) {
    return api.post('/auth/login/', { username, password });
  },

  // Guest: Refresh token
  refresh(refreshToken) {
    return api.post('/auth/refresh/', { refresh: refreshToken });
  },
};

export default AuthService;
