import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { UserSession } from '../types';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isTenant: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('rentahub_token');
    const savedUser = localStorage.getItem('rentahub_user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('rentahub_token');
        localStorage.removeItem('rentahub_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await authAPI.login(email, password);

    const session: UserSession = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      profile: data.user.profile,
      token: data.token,
      refreshToken: data.refreshToken,
    };

    localStorage.setItem('rentahub_token', data.token);
    localStorage.setItem('rentahub_user', JSON.stringify(session));
    setUser(session);
  };

  const logout = () => {
    localStorage.removeItem('rentahub_token');
    localStorage.removeItem('rentahub_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isTenant = user?.role === 'tenant';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isTenant }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
