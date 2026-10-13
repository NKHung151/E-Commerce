import { GATEWAY_URL } from '../config';
import { createClient, fetchAllPages, listOf } from '../shared/api/client';
import { tokenStore } from '../shared/api/tokens';

export const shopTokens = tokenStore('shop');
const api = createClient(shopTokens);
// AI endpoints live at the gateway root (/recommend, /chatbot, /behavior/track).
const ai = createClient(shopTokens, GATEWAY_URL || '/');

export const authApi = {
  login: (username, password) => api.post('/auth/login/', { username, password }).then((r) => r.data),
  register: (payload) => api.post('/auth/register/', payload).then((r) => r.data),
  me: () => api.get('/users/me/').then((r) => r.data),
};

export const catalogApi = {
  categories: () => fetchAllPages(api, '/categories/'),
  /** params: page, page_size, search, category_id, min_price, max_price, personalized */
  products: (params) => api.get('/products/', { params }).then((r) => r.data),
  /** increment_view also records a "view" behaviour server-side for logged-in users. */
  product: (id, { countView = false } = {}) =>
    api.get(`/products/${id}/`, { params: countView ? { increment_view: 'true' } : {} }).then((r) => r.data),
};

export const cartApi = {
  get: () => api.get('/cart/list_cart/').then((r) => r.data),
  add: (productId, quantity = 1) => api.post('/cart/add_item/', { product_id: productId, quantity }),
  update: (productId, quantity) => api.put('/cart/update_item/', { product_id: productId, quantity }),
  remove: (productId) => api.delete('/cart/remove_item/', { data: { product_id: productId } }),
  clear: () => api.delete('/cart/clear_cart/'),
};

export const orderApi = {
  create: (payload) => api.post('/orders/', payload).then((r) => r.data),
  list: (params) => api.get('/orders/', { params }).then((r) => r.data),
  get: (id) => api.get(`/orders/${id}/`).then((r) => r.data),
  paymentStatus: (orderId) => api.get('/payment/status/', { params: { order_id: orderId } }).then((r) => r.data),
};

export const reviewApi = {
  list: (productId) => fetchAllPages(api, '/comments/', { product_id: productId }),
  create: (payload) => api.post('/comments/', payload).then((r) => r.data),
  remove: (id) => api.delete(`/comments/${id}/`),
};

// The user is always taken from the bearer token by ai-service, never sent explicitly.
export const aiApi = {
  recommend: (topN = 8) => ai.get('/recommend', { params: { top_n: topN } }).then((r) => listOf(r.data.products)),
  similar: (productId, topN = 8) =>
    ai.get('/recommend/similar', { params: { product_id: productId, top_n: topN } }).then((r) => listOf(r.data.products)),
  boughtTogether: (productId, topN = 3) =>
    ai.get('/recommend/bought-together', { params: { product_id: productId, top_n: topN } }).then((r) => listOf(r.data.products)),
  /** Fire-and-forget; views and add-to-cart are already tracked by the backend. */
  track: (productId, action) => ai.post('/behavior/track', { product_id: productId, action }).catch(() => {}),
  chat: (message) => ai.post('/chatbot', { message }).then((r) => r.data),
};
