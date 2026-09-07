import { createContext, useContext, useEffect, useState } from 'react';
import { getMe } from '../api/client';

const AuthContext = createContext(null);

function getStoredToken() {
  const t = localStorage.getItem('studydeck_token');
  if (!t || t === 'null' || t === 'undefined' || t === 'false' || t.trim() === '') {
    return null;
  }
  return t;
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem('studydeck_user');
    if (!raw || raw === 'null' || raw === 'undefined') return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(getStoredUser);

  function login(nextToken, nextUser) {
    if (nextToken) {
      localStorage.setItem('studydeck_token', nextToken);
      setToken(nextToken);
    }
    if (nextUser) {
      localStorage.setItem('studydeck_user', JSON.stringify(nextUser));
      setUser(nextUser);
    }
  }

  function logout() {
    localStorage.removeItem('studydeck_token');
    localStorage.removeItem('studydeck_user');
    setToken(null);
    setUser(null);
  }

  useEffect(() => {
    function onUnauthorized() {
      logout();
    }
    window.addEventListener('studydeck:unauthorized', onUnauthorized);
    return () => window.removeEventListener('studydeck:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getMe(token)
      .then((data) => {
        if (cancelled || !data?.user) return;
        setUser(data.user);
        localStorage.setItem('studydeck_user', JSON.stringify(data.user));
      })
      .catch((err) => {
        if (!cancelled && err.status === 401) logout();
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function refreshUser() {
    if (!token) return null;
    try {
      const data = await getMe(token);
      if (data?.user) {
        setUser(data.user);
        localStorage.setItem('studydeck_user', JSON.stringify(data.user));
        return data.user;
      }
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
    }
    return null;
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
