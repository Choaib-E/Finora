import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, registerUnauthorizedHandler, storage } from '../services/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUserDirect: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => storage.getUser());
  const [loading, setLoading] = useState<boolean>(true);

  const clearSession = useCallback(() => {
    storage.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(clearSession);
  }, [clearSession]);

  useEffect(() => {
    const token = storage.getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((profile) => {
        storage.setUser(profile);
        setUser(profile);
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => setLoading(false));
  }, [clearSession]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    storage.setToken(res.access_token);
    storage.setUser(res.user);
    setUser(res.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await authApi.register({ name, email, password });
    storage.setToken(res.access_token);
    storage.setUser(res.user);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      if (storage.getToken()) {
        await authApi.logout();
      }
    } catch {
      // Ignorer les erreurs réseau lors de la déconnexion locale
    } finally {
      clearSession();
    }
  };

  const refreshUser = async () => {
    const profile = await authApi.me();
    storage.setUser(profile);
    setUser(profile);
  };

  const setUserDirect = (updated: User) => {
    storage.setUser(updated);
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        refreshUser,
        setUserDirect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
