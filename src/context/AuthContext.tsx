import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'ROLE_ANALYST' | 'ROLE_VERIFIER' | 'ROLE_ADMIN';

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (fullName: string, email: string, password: string, role?: UserRole) => Promise<AuthUser>;
  logout: () => Promise<void>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'factlens_auth_token';
const USER_KEY = 'factlens_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Validate session on mount
  useEffect(() => {
    let isMounted = true;

    async function verifyExistingSession() {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        if (isMounted) {
          setIsLoading(false);
          setUser(null);
        }
        return;
      }

      try {
        const response = await fetch('/api/v1/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (response.ok) {
          const profile: AuthUser = await response.json();
          if (isMounted) {
            setUser(profile);
            localStorage.setItem(USER_KEY, JSON.stringify(profile));
          }
        } else {
          // Token expired or invalid
          if (isMounted) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        // Network/server offline - preserve cached state if available
        console.warn('Backend auth check skipped, offline/network delay:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    verifyExistingSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const detail = errData.detail || 'Authentication failed. Please check your credentials.';
        throw new Error(detail);
      }

      const data = await response.json();
      const accessToken: string = data.access_token;
      const authenticatedUser: AuthUser = data.user;

      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem('factlens_access_token', accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(authenticatedUser));
      setToken(accessToken);
      setUser(authenticatedUser);

      return authenticatedUser;
    } catch (err: any) {
      const message = err.message || 'Login request failed.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    role: UserRole = 'ROLE_ANALYST'
  ): Promise<AuthUser> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          role,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const detail = errData.detail || 'Registration failed. Email may already be registered.';
        throw new Error(detail);
      }

      const data = await response.json();
      const accessToken: string = data.access_token;
      const newUser: AuthUser = data.user;

      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem('factlens_access_token', accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      setToken(accessToken);
      setUser(newUser);

      return newUser;
    } catch (err: any) {
      const message = err.message || 'Registration request failed.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('factlens_access_token');
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
      setError(null);
    }
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        error,
        login,
        register,
        logout,
        hasRole,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

