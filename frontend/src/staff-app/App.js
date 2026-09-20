import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import StaffRouter from './Router';

export const StaffApp = () => {
  return (
    <BrowserRouter basename="/staff">
      <AuthProvider>
        <StaffRouter />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default StaffApp;
