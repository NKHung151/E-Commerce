import React, { lazy } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '../shared/auth/AuthProvider';
import { ROUTER_FUTURE } from '../shared/ui';
import { authApi, backofficeTokens } from './api';
import Layout from './layout/Layout';
import LoginPage from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductFormPage = lazy(() => import('./pages/ProductFormPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderPage = lazy(() => import('./pages/OrderPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));

const BACKOFFICE_ROLES = ['staff', 'admin'];

function RequireBackoffice({ adminArea }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // /admin is for admins only; staff members are sent to their own area.
  if (adminArea && user.role !== 'admin') {
    window.location.replace('/staff');
    return null;
  }
  return <Outlet />;
}

function AdminOnly() {
  const { user } = useAuth();
  return user.role === 'admin' ? <Outlet /> : <Navigate to="/" replace />;
}

/** Shared back office for staff (/staff) and admins (/admin). */
export default function BackofficeApp({ basename }) {
  return (
    <BrowserRouter basename={basename} future={ROUTER_FUTURE}>
      <AuthProvider store={backofficeTokens} loginRequest={authApi.login} allowedRoles={BACKOFFICE_ROLES}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireBackoffice adminArea={basename === '/admin'} />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:id" element={<OrderPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/new" element={<ProductFormPage />} />
              <Route path="products/:id/edit" element={<ProductFormPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route element={<AdminOnly />}>
                <Route path="users" element={<UsersPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
