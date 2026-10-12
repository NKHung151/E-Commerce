// JWT storage, one independent session per app ("shop" and "backoffice"), so a staff
// login in the back office never leaks into the storefront and vice versa.

const listeners = new Map(); // scope -> Set<fn>

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode): session simply won't persist */
  }
}

export function decodeJwt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function userFromToken(token) {
  const claims = token && decodeJwt(token);
  if (!claims?.user_id) return null;
  return {
    id: claims.user_id,
    username: claims.username || '',
    email: claims.email || '',
    role: claims.role || 'customer',
  };
}

export function tokenStore(scope) {
  const accessKey = `${scope}.access`;
  const refreshKey = `${scope}.refresh`;
  const notify = () => (listeners.get(scope) || new Set()).forEach((fn) => fn());

  return {
    get access() {
      return read(accessKey);
    },
    get refresh() {
      return read(refreshKey);
    },
    set(access, refresh) {
      write(accessKey, access);
      if (refresh !== undefined) write(refreshKey, refresh);
      notify();
    },
    clear() {
      write(accessKey, null);
      write(refreshKey, null);
      notify();
    },
    subscribe(fn) {
      if (!listeners.has(scope)) listeners.set(scope, new Set());
      listeners.get(scope).add(fn);
      return () => listeners.get(scope).delete(fn);
    },
  };
}
