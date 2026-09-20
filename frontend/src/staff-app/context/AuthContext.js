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

  const deriveRole = (decoded) => {
    if (!decoded) return null;
    if (decoded.role) return decoded.role;
    if (decoded.is_superuser || decoded.is_admin) return 'admin';
    if (decoded.is_staff) return 'staff';
    return 'customer';
  };

  // Initialize auth on mount
  useEffect(() => {
    const token = localStorage.getItem('staff_access_token');
    if (token) {
      const decoded = parseJWT(token);
      if (decoded && decoded.user_id) {
        setUser({
          id: decoded.user_id,
          username: decoded.username || 'Staff',
          email: decoded.email || '',
          role: deriveRole(decoded) || 'staff',
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

      localStorage.setItem('staff_access_token', access);
      localStorage.setItem('staff_refresh_token', refresh);

      const decoded = parseJWT(access);
      setUser({
        id: decoded.user_id,
        username: decoded.username || 'Staff',
        email: decoded.email || '',
        role: deriveRole(decoded) || 'staff',
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

  const logout = () => {
    localStorage.removeItem('staff_access_token');
    localStorage.removeItem('staff_refresh_token');
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
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
