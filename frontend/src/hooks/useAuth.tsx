import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import type { User, LoginRequest, RegisterRequest, Role } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<User>;
  register: (data: RegisterRequest) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('medikiosk_token');
    if (token) {
      authApi.me()
        .then(u => {
          setUser(u);
        })
        .catch(() => {
          localStorage.removeItem('medikiosk_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (data: LoginRequest): Promise<User> => {
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(data);
      localStorage.setItem('medikiosk_token', res.access_token);
      
      const loggedInUser = await authApi.me();
      setUser(loggedInUser);
      setLoading(false);
      return loggedInUser;
    } catch (err: any) {
      setLoading(false);
      const msg = err.response?.data?.detail || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest): Promise<User> => {
    setError(null);
    try {
      await authApi.register(data);
      return await login({
        email: (data as any).email || (data as any).user?.email,
        password: (data as any).password || (data as any).user?.password
      });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    }
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('medikiosk_token');
    setUser(null);
    window.location.href = '/demo';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Route guard component with robust session initialization
export function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const token = localStorage.getItem('medikiosk_token');

  // If initial auth check is ongoing OR token exists and user object is still hydrating
  if (loading || (token && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-sm w-full mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm font-bold text-gray-800">Loading secure session...</p>
          <p className="text-xs text-gray-500 mt-1">Verifying medical credentials & permissions</p>
        </div>
      </div>
    );
  }

  // Not authenticated at all
  if (!user) {
    return <Navigate to="/demo" state={{ from: location }} replace />;
  }

  // Role check
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
            🔒
          </div>
          <h1 className="text-xl font-bold text-gray-900">Access Restricted</h1>
          <p className="text-gray-600 text-sm mt-2 mb-6">
            Your account ({user.email}, role: <strong className="font-semibold text-gray-800">{user.role}</strong>) is not authorized for this specific area.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              to={user.role === 'PATIENT' ? '/patient' : user.role === 'DOCTOR' ? '/doctor' : user.role === 'DRIVER' ? '/driver' : user.role === 'STAFF' ? '/hospital' : '/admin'}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors shadow-sm"
            >
              Open Your Dashboard ({user.role}) →
            </Link>
            <Link to="/demo" className="text-gray-500 hover:text-gray-700 text-xs py-2">
              Switch Demo Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
