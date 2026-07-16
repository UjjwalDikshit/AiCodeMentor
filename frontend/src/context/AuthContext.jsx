import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('cm_access_token'));

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      // Placeholders — wire to authService when implementing
      login: async (_credentials) => {
        setToken('placeholder-token');
        localStorage.setItem('cm_access_token', 'placeholder-token');
        setUser({ id: 'placeholder', name: 'Demo User', email: 'demo@codementor.ai' });
      },
      logout: () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('cm_access_token');
      },
      setUser,
    }),
    [user, token]
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
