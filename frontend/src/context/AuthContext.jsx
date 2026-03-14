import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(undefined);

// TODO: [CRIT-01] SECURITY — JWT tokens are stored in localStorage which is vulnerable
// to XSS attacks. Migrate to httpOnly, Secure, SameSite=Strict cookies managed by the
// backend. This requires coordinated backend changes to:
// 1. Return tokens via Set-Cookie headers instead of response body
// 2. Implement /auth/refresh endpoint that reads cookie automatically
// 3. Remove all localStorage token references from this file and apiClient.js
// See docs/FRONTEND_CODE_REVIEW.md CRIT-01 for full details.
const TOKEN_KEY = 'auth_token';
const REFRESH_KEY = 'auth_refresh_token';
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

/**
 * AuthProvider manages authentication state for the TSE Dashboard.
 *
 * Features:
 * - Persists JWT access + refresh tokens in localStorage
 * - Validates token on mount by calling GET /api/auth/me
 * - Auto-refreshes access token before expiry
 * - Axios interceptor auto-attaches Authorization header
 * - Provides login/register/logout functions and isAuthenticated flag
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));
  const interceptorId = useRef(null);
  const refreshTimerRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const isActiveRef = useRef(false);

  const doLogout = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Reset inactivity timer on any user activity
  const resetInactivityTimer = useCallback(() => {
    isActiveRef.current = true;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      // No activity for 5 minutes — logout
      if (localStorage.getItem(TOKEN_KEY)) doLogout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [doLogout]);

  // Attach/detach activity listeners when authenticated
  useEffect(() => {
    if (!token) return;
    // Start the inactivity timer immediately on login
    resetInactivityTimer();
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetInactivityTimer, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [token, resetInactivityTimer]);

  // Schedule token refresh ~30s before expiry, only if user was recently active
  const scheduleRefresh = useCallback((accessToken) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const expiresIn = (payload.exp * 1000) - Date.now() - 30_000; // 30s before expiry
      if (expiresIn > 0) {
        refreshTimerRef.current = setTimeout(async () => {
          // Only refresh if user has been active (inactivity timer still running)
          if (!isActiveRef.current) return;
          isActiveRef.current = false;
          const refreshToken = localStorage.getItem(REFRESH_KEY);
          if (!refreshToken) return;
          try {
            const res = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
            localStorage.setItem(TOKEN_KEY, res.data.access_token);
            localStorage.setItem(REFRESH_KEY, res.data.refresh_token);
            setToken(res.data.access_token);
            scheduleRefresh(res.data.access_token);
          } catch {
            doLogout();
          }
        }, expiresIn);
      }
    } catch { /* malformed token — ignore */ }
  }, [doLogout]);

  // Setup axios interceptor to attach Bearer token
  useEffect(() => {
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

  // Validate existing token on mount; auto-login via Telegram initData if in Mini App
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);

    // ── Telegram Mini App: auto-login with initData ──────────────────────────
    const tgWebApp = window?.Telegram?.WebApp;
    if (tgWebApp?.initData && !storedToken) {
      tgWebApp.ready();
      tgWebApp.expand();
      axios
        .post('/api/auth/telegram', { init_data: tgWebApp.initData })
        .then((res) => {
          const { access_token, refresh_token } = res.data;
          localStorage.setItem(TOKEN_KEY, access_token);
          if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
          setToken(access_token);
          scheduleRefresh(access_token);
          return axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${access_token}` },
          });
        })
        .then((res) => setUser(res.data))
        .catch(() => { /* Telegram auth failed — stay logged out */ })
        .finally(() => setLoading(false));
      return;
    }

    // ── Standard JWT validation ──────────────────────────────────────────────
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
        scheduleRefresh(storedToken);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [scheduleRefresh]);

  const login = useCallback(async (username, password) => {
    const res = await axios.post('/api/auth/login', { username, password });
    const { access_token, refresh_token } = res.data;

    localStorage.setItem(TOKEN_KEY, access_token);
    if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
    setToken(access_token);
    scheduleRefresh(access_token);

    // Fetch user profile (login endpoint returns tokens only)
    try {
      const meRes = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      setUser(meRes.data);
    } catch {
      // Token is valid even if /me fails
    }

    return res.data;
  }, [scheduleRefresh]);

  const register = useCallback(async (username, email, password) => {
    const res = await axios.post('/api/auth/register', { username, email, password });
    return res.data;
  }, []);

  const logout = doLogout;

  const isAuthenticated = useMemo(() => !!token && !!user, [token, user]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      isAuthenticated,
    }),
    [user, token, loading, login, register, logout, isAuthenticated]
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
