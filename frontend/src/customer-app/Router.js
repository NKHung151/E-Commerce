import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ChatbotWidget from '../components/chatbot/ChatbotWidget';

import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import ProductListPage from './pages/Products/ProductListPage';
import ProductDetailPage from './pages/Products/ProductDetailPage';
import CategoriesPage from './pages/Products/CategoriesPage';
import CartPage from './pages/Cart/CartPage';
import CheckoutPage from './pages/Cart/CheckoutPage';
import MyOrdersPage from './pages/Orders/MyOrdersPage';
import OrderDetailPage from './pages/Orders/OrderDetailPage';
import ProfilePage from './pages/Profile/ProfilePage';

export const CustomerRouter = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow bg-gray-50">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<ProductListPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/categories" element={<CategoriesPage />} />

          {/* Customer-only routes */}
          {isAuthenticated ? (
            <>
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<MyOrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </>
          ) : (
            <>
              <Route path="/cart" element={<Navigate to="/login" />} />
              <Route path="/checkout" element={<Navigate to="/login" />} />
              <Route path="/orders" element={<Navigate to="/login" />} />
              <Route path="/orders/:id" element={<Navigate to="/login" />} />
              <Route path="/profile" element={<Navigate to="/login" />} />
            </>
          )}

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
      <ChatbotWidget />
    </div>
  );
};

export default CustomerRouter;
