import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/client';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  first_login?: boolean;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isInitializing: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (body: { name: string; email: string; password: string; student_number: string }) => Promise<User>;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Failed to parse saved user from localStorage:', err);
        localStorage.removeItem('user');
      }
    }
    setIsInitializing(false);
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await authApi.login(email, password);
      const { access_token, refresh_token, user: userData } = response.data;

      if (!access_token || !refresh_token) {
        throw new Error('Login response missing tokens');
      }

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      let resolvedUser = userData;
      if (!resolvedUser) {
        const profile = await authApi.me();
        resolvedUser = profile.data;
      }
      localStorage.setItem('user', JSON.stringify(resolvedUser));
      setToken(access_token);
      setUser(resolvedUser);
      return resolvedUser;
    } catch (error: any) {
      console.error(
        'AuthContext.login error:',
        error,
        'response:', error?.response?.data,
        'status:', error?.response?.status
      );
      throw error;
    }
  };

  const register = async (body: {
    name: string;
    email: string;
    password: string;
    student_number: string;
  }): Promise<User> => {
    const response = await authApi.register(body);
    const { access_token, refresh_token, user: userData } = response.data;
    if (!access_token || !refresh_token) {
      throw new Error('Registration response missing tokens');
    }
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const updateUser = (nextUser: User) => {
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.clear();
      setToken(null);
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isInitializing,
    loading: isInitializing,
    isAuthenticated: !!token && !!user,
    login,
    register,
    updateUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
