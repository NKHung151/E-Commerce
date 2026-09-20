import React, { createContext, useState, useEffect } from 'react';
import AuthService from '../services/auth';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Parse JWT to get user info
  const parseJWT = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  // Initialize auth on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      const decoded = parseJWT(token);
      const userId = decoded?.user_id ?? decoded?.id ?? decoded?.sub ?? decoded?.user?.id;
      if (decoded && userId) {
        const role = decoded.role ?? (decoded.is_superuser || decoded.is_admin ? 'admin' : decoded.is_staff ? 'staff' : 'customer');
        setUser({
          id: userId,
          username: decoded.username || decoded.user?.username || 'User',
          email: decoded.email || decoded.user?.email || '',
          role,
        });
        setIsAuthenticated(true);
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const response = await AuthService.login(username, password);
      const { access, refresh } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      const decoded = parseJWT(access);
      const userId = decoded?.user_id ?? decoded?.id ?? decoded?.sub ?? decoded?.user?.id;
      const role = decoded?.role ?? (decoded?.is_superuser || decoded?.is_admin ? 'admin' : decoded?.is_staff ? 'staff' : 'customer');
      setUser({
        id: userId,
        username: decoded?.username || decoded?.user?.username || 'User',
        email: decoded?.email || decoded?.user?.email || '',
        role,
      });
      setIsAuthenticated(true);

      return decoded;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const response = await AuthService.register(userData);
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
