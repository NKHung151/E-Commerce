import axios from 'axios';
import { API_URL } from '../../config';

/**
 * Axios client bound to one token scope. Adds the bearer token and, on a 401,
 * refreshes the access token once (concurrent 401s share the same refresh).
 * If the refresh fails the session is cleared and AuthProvider reacts to it.
 */
export function createClient(store, baseURL = API_URL) {
  const client = axios.create({ baseURL });
  let refreshing = null;

  client.interceptors.request.use((config) => {
    const token = store.access;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config;
      const isAuthCall = original?.url?.includes('/auth/');
      if (error.response?.status !== 401 || original?._retried || isAuthCall || !store.refresh) {
        return Promise.reject(error);
      }
      original._retried = true;
      try {
        refreshing =
          refreshing ||
          axios
            .post(`${API_URL}/auth/refresh/`, { refresh: store.refresh })
            .then(({ data }) => store.set(data.access))
            .finally(() => {
              refreshing = null;
            });
        await refreshing;
        return client(original);
      } catch (refreshError) {
        store.clear();
        return Promise.reject(error);
      }
    }
  );

  return client;
}

/** DRF list responses are either an array or a paginated {count, results}. */
export const listOf = (data) => (Array.isArray(data) ? data : data?.results || []);

/** Follow DRF page numbers until `next` is null (for small, fixed-page-size lists). */
export async function fetchAllPages(client, url, params = {}, maxPages = 20) {
  const all = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const { data } = await client.get(url, { params: { ...params, page } });
    all.push(...listOf(data));
    if (Array.isArray(data) || !data.next) break;
  }
  return all;
}

/** Turn a DRF / service error into a readable message. */
export function errorMessage(error, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại.') {
  const data = error?.response?.data;
  if (!error?.response) return 'Không kết nối được máy chủ.';
  if (typeof data === 'string') return data.length < 200 ? data : fallback;
  if (data?.error) return data.error;
  if (data?.detail) return data.detail;
  if (data && typeof data === 'object') {
    const first = Object.entries(data)[0];
    if (first) {
      const [field, value] = first;
      const text = Array.isArray(value) ? value[0] : value;
      return field === 'non_field_errors' ? String(text) : `${field}: ${text}`;
    }
  }
  return fallback;
}
