import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
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

  useEffect(() => {
    api
      .get<{ user: AuthUser }>('/auth/me')
      .then(({ user }) => setState({ user, loading: false }))
      .catch((err) => {
        // 401 means not logged in — expected
        if (err instanceof ApiError && err.status === 401) {
          setState({ user: null, loading: false });
        } else {
          setState({ user: null, loading: false });
        }
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await api.post<{ user: AuthUser }>('/auth/login', { email, password });
    setState({ user, loading: false });
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const { user } = await api.post<{ user: AuthUser }>('/auth/register', { email, password });
    setState({ user, loading: false });
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout', {});
    setState({ user: null, loading: false });
  }, []);

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
