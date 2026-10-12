import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { userFromToken } from './tokens';

const AuthContext = createContext(null);

/**
 * Session state for one app. `store` is a tokenStore; `loginRequest` returns {access, refresh}.
 * `allowedRoles` rejects logins from the wrong kind of account (e.g. a customer in the back office).
 */
export function AuthProvider({ store, loginRequest, allowedRoles, children }) {
  const [user, setUser] = useState(() => userFromToken(store.access));

  // Stay in sync when the token is refreshed or cleared (e.g. refresh token expired).
  useEffect(() => store.subscribe(() => setUser(userFromToken(store.access))), [store]);

  const login = useCallback(
    async (username, password) => {
      const { access, refresh } = await loginRequest(username, password);
      const next = userFromToken(access);
      if (allowedRoles && !allowedRoles.includes(next?.role)) {
        const err = new Error('Tài khoản không có quyền truy cập khu vực này.');
        err.forbidden = true;
        throw err;
      }
      store.set(access, refresh);
      return next;
    },
    [store, loginRequest, allowedRoles]
  );

  const logout = useCallback(() => store.clear(), [store]);

  const value = useMemo(() => ({ user, isAuthenticated: !!user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
