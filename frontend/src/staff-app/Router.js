import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';

import LoginPage from './pages/Auth/LoginPage';
import ProductListPage from './pages/Products/ProductListPage';
import ProductDetailPage from './pages/Products/ProductDetailPage';
import CreateProductPage from './pages/Products/CreateProductPage';
import EditProductPage from './pages/Products/EditProductPage';
import OrderListPage from './pages/Orders/OrderListPage';
import OrderDetailPage from './pages/Orders/OrderDetailPage';

export const StaffRouter = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div className="text-center py-8">Loading...</div>;

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-8">
          <Routes>
            <Route path="" element={<Navigate to="/products" />} />
            <Route path="/" element={<Navigate to="/products" />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/products/new" element={<CreateProductPage />} />
            <Route path="/products/:id/edit" element={<EditProductPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/orders" element={<OrderListPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="*" element={<Navigate to="/products" />} />
          </Routes>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default StaffRouter;
