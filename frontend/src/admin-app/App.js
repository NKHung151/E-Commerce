import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AdminRouter from './Router';

export const AdminApp = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminRouter />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AdminApp;
