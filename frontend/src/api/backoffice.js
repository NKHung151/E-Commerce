import { createClient, fetchAllPages } from '../lib/http';
import { tokenStore } from '../lib/tokens';

export const backofficeTokens = tokenStore('backoffice');
const api = createClient(backofficeTokens);

// Staff and admin share the /staff/* product & order endpoints; the backend
// enforces that only admins may delete products. /admin/users is admin-only.

export const authApi = {
  login: (username, password) => api.post('/auth/login/', { username, password }).then((r) => r.data),
};

export const productApi = {
  /** params: page, page_size, search, category_id */
  list: (params) => api.get('/staff/products/', { params }).then((r) => r.data),
  get: (id) => api.get(`/staff/products/${id}/`).then((r) => r.data),
  /** Category-specific endpoint (books, electronics, ...) creates product + details atomically. */
  createTyped: (endpoint, payload) => api.post(`/staff/${endpoint}/`, payload).then((r) => r.data),
  create: (payload) => api.post('/staff/products/', payload).then((r) => r.data),
  /** `details` in the payload updates the category-specific fields. */
  update: (id, payload) => api.patch(`/staff/products/${id}/`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/staff/products/${id}/`),
};

export const categoryApi = {
  list: () => fetchAllPages(api, '/categories/'),
  create: (name) => api.post('/categories/', { name }).then((r) => r.data),
  update: (id, name) => api.patch(`/categories/${id}/`, { name }).then((r) => r.data),
  remove: (id) => api.delete(`/categories/${id}/`),
};

export const orderApi = {
  /** params: page, page_size, search (order id / user id / status / address) */
  list: (params) => api.get('/staff/orders/', { params }).then((r) => r.data),
  get: (id) => api.get(`/staff/orders/${id}/`).then((r) => r.data),
  updateStatus: (id, status) => api.patch(`/staff/orders/${id}/update_status/`, { status }).then((r) => r.data),
};

export const paymentApi = {
  status: (orderId) => api.get('/payment/status/', { params: { order_id: orderId } }).then((r) => r.data),
  confirm: (orderId) => api.post(`/payment/${orderId}/confirm/`).then((r) => r.data),
};

export const shippingApi = {
  status: (orderId) => api.get('/staff/shipping/status/', { params: { order_id: orderId } }).then((r) => r.data),
  updateStatus: (id, status) => api.patch(`/staff/shipping/${id}/update_status/`, { status }).then((r) => r.data),
};

export const userApi = {
  list: () => api.get('/admin/users/').then((r) => r.data),
  create: (payload) => api.post('/admin/users/', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/admin/users/${id}/`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/admin/users/${id}/`),
};
