import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(undefined);

const TOKEN_KEY = 'auth_token';

/**
 * AuthProvider manages authentication state for the TSE Dashboard.
 *
 * Features:
 * - Persists JWT token in localStorage
 * - Validates token on mount by calling GET /api/auth/me
 * - Axios interceptor auto-attaches Authorization header
 * - Provides login/logout functions and isAuthenticated flag
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));
  const interceptorId = useRef(null);

  // Setup axios interceptor to attach Bearer token
  useEffect(() => {
    // Eject previous interceptor if any
    if (interceptorId.current !== null) {
      axios.interceptors.request.eject(interceptorId.current);
    }

    interceptorId.current = axios.interceptors.request.use(
      (config) => {
        const currentToken = localStorage.getItem(TOKEN_KEY);
        if (currentToken) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      if (interceptorId.current !== null) {
        axios.interceptors.request.eject(interceptorId.current);
        interceptorId.current = null;
      }
    };
  }, []);

  // Validate existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setLoading(false);
      return;
    }

    axios
      .get('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
      .then((res) => {
        setUser(res.data);
        setToken(storedToken);
      })
      .catch(() => {
        // Token is invalid or expired — clear it
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await axios.post('/api/auth/login', { username, password });
    const { access_token, user: userData } = res.data;

    localStorage.setItem(TOKEN_KEY, access_token);
    setToken(access_token);
    setUser(userData || null);

    // If user data was not included in the login response, fetch it
    if (!userData) {
      try {
        const meRes = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        setUser(meRes.data);
      } catch {
        // User data fetch failed but login succeeded — token is still valid
      }
    }

    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = useMemo(() => !!token && !!user, [token, user]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      isAuthenticated,
    }),
    [user, token, loading, login, logout, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication state and actions.
 * Must be used within AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
