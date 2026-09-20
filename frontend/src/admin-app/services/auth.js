import api from './api';

export const AuthService = {
  login(username, password) {
    return api.post('/auth/login/', { username, password });
  },

  refresh(refreshToken) {
    return api.post('/auth/refresh/', { refresh: refreshToken });
  },
};

export default AuthService;
