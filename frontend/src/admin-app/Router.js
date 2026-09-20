import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoadingSpinner from './components/common/LoadingSpinner';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';

// Auth Pages
import LoginPage from './pages/Auth/LoginPage';

// Users Pages
import UsersListPage from './pages/Users/UsersListPage';
import UserDetailPage from './pages/Users/UserDetailPage';
import CreateUserPage from './pages/Users/CreateUserPage';
import EditUserPage from './pages/Users/EditUserPage';

// Products Pages
import ProductListPage from './pages/Products/ProductListPage';
import CreateProductPage from './pages/Products/CreateProductPage';
import EditProductPage from './pages/Products/EditProductPage';

// Orders Pages
import OrderListPage from './pages/Orders/OrderListPage';
import OrderDetailPage from './pages/Orders/OrderDetailPage';

export const AdminRouter = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return (
    <>
      {!isAuthenticated ? (
        <Routes>
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/admin/login" />} />
        </Routes>
      ) : (
        <div className="flex flex-col min-h-screen bg-gray-50">
          <Header />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <Routes>
                {/* Users Routes */}
                <Route path="/admin/users" element={<UsersListPage />} />
                <Route path="/admin/users/new" element={<CreateUserPage />} />
                <Route path="/admin/users/:id" element={<UserDetailPage />} />
                <Route path="/admin/users/:id/edit" element={<EditUserPage />} />

                {/* Products Routes */}
                <Route path="/admin/products" element={<ProductListPage />} />
                <Route path="/admin/products/new" element={<CreateProductPage />} />
                <Route path="/admin/products/:id/edit" element={<EditProductPage />} />

                {/* Orders Routes */}
                <Route path="/admin/orders" element={<OrderListPage />} />
                <Route path="/admin/orders/:id" element={<OrderDetailPage />} />

                {/* Fallback to Users instead of Dashboard */}
                <Route path="/admin" element={<Navigate to="/admin/users" />} />
                <Route path="*" element={<Navigate to="/admin/users" />} />
              </Routes>
            </main>
          </div>
          <Footer />
        </div>
      )}
    </>
  );
};

export default AdminRouter;
