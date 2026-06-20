"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "clipforge_token";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  plan: "free" | "pro";
  is_admin: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithEmail: (email: string) => Promise<void>;
  activateKey: (key: string) => Promise<string>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<AuthUser | null>(null);
  const [token, setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const _saveSession = (tok: string, u: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, tok);
    setToken(tok);
    setUser(u);
    // Keep legacy keys in sync for backward compat (license endpoints)
    localStorage.setItem("clipforge_plan", u.plan);
  };

  const refreshUser = async () => {
    const tok = localStorage.getItem(TOKEN_KEY);
    if (!tok) { setLoading(false); return; }
    try {
      const res = await axios.get(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      setToken(tok);
      setUser(res.data as AuthUser);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshUser(); }, []);

  const loginWithGoogle = async (credential: string) => {
    const res = await axios.post(`${API_BASE}/api/auth/google`, { credential });
    _saveSession(res.data.token, res.data.user as AuthUser);
  };

  const loginWithEmail = async (email: string) => {
    const res = await axios.post(`${API_BASE}/api/auth/email`, { email });
    _saveSession(res.data.token, res.data.user as AuthUser);
  };

  const activateKey = async (key: string): Promise<string> => {
    const tok = localStorage.getItem(TOKEN_KEY);
    const res = await axios.post(
      `${API_BASE}/api/auth/activate`,
      { key },
      { headers: { Authorization: `Bearer ${tok}` } },
    );
    _saveSession(res.data.token, { ...user!, plan: res.data.plan });
    return res.data.message as string;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("clipforge_plan");
    localStorage.removeItem("clipforge_license_key");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithGoogle, loginWithEmail, activateKey, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
