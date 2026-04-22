import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@deckforge/shared';
import { api, ApiError } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  const qc = useQueryClient();

  useEffect(() => {
    api
      .get<{ user: AuthUser }>('/auth/me')
      .then(({ user }) => setState({ user, loading: false }))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setState({ user: null, loading: false });
        } else {
          setState({ user: null, loading: false });
        }
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await api.post<{ user: AuthUser }>('/auth/login', { email, password });
    qc.clear(); // wipe any stale cache from a previous session
    setState({ user, loading: false });
  }, [qc]);

  const register = useCallback(async (email: string, password: string) => {
    const { user } = await api.post<{ user: AuthUser }>('/auth/register', { email, password });
    qc.clear();
    setState({ user, loading: false });
  }, [qc]);

  const logout = useCallback(async () => {
    await api.post('/auth/logout', {});
    qc.clear(); // remove all cached data so it isn't shown to the next user
    setState({ user: null, loading: false });
  }, [qc]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
