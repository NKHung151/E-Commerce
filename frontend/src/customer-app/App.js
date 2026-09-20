import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import CustomerRouter from './Router';

export const CustomerApp = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <CustomerRouter />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default CustomerApp;
