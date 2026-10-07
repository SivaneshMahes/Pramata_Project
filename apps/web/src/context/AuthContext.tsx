import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { LoginInput, RegisterInput } from '@vrp/validation';
import { ApiError, onSessionExpired } from '@/api/client';
import { queryKeys } from '@/constants/queryKeys';
import { authService } from '@/services/auth.service';
import type { UserDto } from '@/types';

interface AuthContextValue {
  user: UserDto | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<UserDto>;
  register: (input: RegisterInput) => Promise<UserDto>;
  logout: () => Promise<void>;
  setUser: (user: UserDto) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * The session lives in an httpOnly cookie the browser manages; the client only
 * caches *who* is signed in (from /auth/me) to drive the UI. Every permission
 * is still enforced by the API.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        return (await authService.me()).user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const setUser = useCallback(
    (user: UserDto | null) => queryClient.setQueryData(queryKeys.me, user),
    [queryClient],
  );

  useEffect(
    () =>
      onSessionExpired(() => {
        if (queryClient.getQueryData(queryKeys.me)) setUser(null);
      }),
    [queryClient, setUser],
  );

  const login = useCallback(
    async (input: LoginInput) => {
      const { user } = await authService.login(input);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
      setUser(user);
      return user;
    },
    [queryClient, setUser],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const { user } = await authService.register(input);
      setUser(user);
      return user;
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      queryClient.clear();
      setUser(null);
    }
  }, [queryClient, setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({ user: data ?? null, isLoading: isPending, login, register, logout, setUser }),
    [data, isPending, login, register, logout, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
