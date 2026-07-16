import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, userService } from '../services';
import { getAccessToken, setAccessToken, clearAccessToken } from '../lib/token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAccessToken();

      if (token) {
        try {
          const { data } = await userService.getProfile();
          setCurrentUser(data.data.user);
          return;
        } catch {
          // Access token may be expired — fall through to refresh
        }
      }

      const { data } = await authService.refresh();
      setAccessToken(data.data.accessToken);
      setCurrentUser(data.data.user);
    } catch {
      clearAccessToken();
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (credentials) => {
    const { data } = await authService.login(credentials);
    setAccessToken(data.data.accessToken);
    setCurrentUser(data.data.user);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await authService.register(payload);
    setAccessToken(data.data.accessToken);
    setCurrentUser(data.data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearAccessToken();
      setCurrentUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      user: currentUser,
      isAuthenticated: Boolean(currentUser),
      loading,
      login,
      logout,
      register,
      setCurrentUser,
      refreshSession: bootstrap,
    }),
    [currentUser, loading, login, logout, register, bootstrap]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
