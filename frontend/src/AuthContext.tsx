import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';
import type { AuthUser } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount, check if user is logged in by calling api.me()
    // This will succeed if the httpOnly cookie exists, fail otherwise
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { user } = await api.login(email, password);
    // Token is now automatically stored as httpOnly cookie by the server
    setUser(user);
  }

  async function register(email: string, username: string, password: string) {
    const { user } = await api.register(email, username, password);
    // Token is now automatically stored as httpOnly cookie by the server
    setUser(user);
  }

  async function logout() {
    await api.logout();
    // Cookie is cleared by the server
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
