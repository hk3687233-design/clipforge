"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Scissors, Users, Key, Send, Loader2, RefreshCw, LogOut, Search
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_KEY = "clipforge_admin_secret";

interface UserRow {
  id: string; email: string; name?: string; plan: string;
  google_linked: boolean; license_key?: string; is_admin: boolean;
  daily_jobs_used: number; daily_jobs_date?: string; created_at?: string;
}
interface Stats {
  licenses: { total: number; pro: number; free: number; active: number };
  jobs: { total: number; done: number; failed: number };
  revenue_estimate: string;
}

export default function AdminPage() {
  const [secret, setSecret]     = useState("");
  const [authed, setAuthed]     = useState(false);
  const [users,  setUsers]      = useState<UserRow[]>([]);
  const [stats,  setStats]      = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error,  setError]      = useState("");
  const [search, setSearch]     = useState("");
  const [genEmail, setGenEmail] = useState("");
  const [genBusy,  setGenBusy]  = useState(false);
  const [genMsg,   setGenMsg]   = useState("");

  const load = useCallback(async (sec: string) => {
    setLoading(true); setError("");
    try {
      const hdrs = { "X-Admin-Secret": sec };
      const [u, s] = await Promise.all([
        axios.get(`${API_BASE}/api/admin/users`, { headers: hdrs }),
        axios.get(`${API_BASE}/api/admin/stats`, { headers: hdrs }),
      ]);
      setUsers(u.data.items); setStats(s.data); setAuthed(true);
      localStorage.setItem(ADMIN_KEY, sec);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Invalid admin secret");
      setAuthed(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_KEY);
    if (saved) { setSecret(saved); load(saved); }
  }, [load]);

  const handleLogin  = (e: React.FormEvent) => { e.preventDefault(); if (secret) load(secret); };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genEmail.trim()) return;
    setGenBusy(true); setGenMsg("");
    const hdrs = { "X-Admin-Secret": secret };
    try {
      const res = await axios.post(
        `${API_BASE}/api/admin/licenses/generate?plan=pro&email=${encodeURIComponent(genEmail.trim())}`,
        {}, { headers: hdrs }
      );
      setGenMsg(`✓ Key sent: ${res.data.key}`);
      // Also upgrade user account if they already signed up
      const u = users.find(x => x.email.toLowerCase() === genEmail.trim().toLowerCase());
      if (u) {
        await axios.patch(`${API_BASE}/api/admin/users/${u.id}/set-pro`, {}, { headers: hdrs });
      }
      setGenEmail(""); load(secret);
    } catch (e: any) {
      setGenMsg(`✗ ${e?.response?.data?.detail || "Failed"}`);
    } finally { setGenBusy(false); }
  };

  const today = new Date().toISOString().slice(0, 10);
  const filtered = users.filter(u =>
    !search ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm glass border border-white/10 rounded-3xl p-7 space-y-5">
        <div className="flex items-center gap-2.5 justify-center">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Scissors size={15} className="text-white" />
          </div>
          <span className="font-bold text-lg">Admin Panel</span>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="password" placeholder="Admin secret" value={secret}
            onChange={e => setSecret(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all"
            autoFocus />
          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm">
            {loading ? <Loader2 size={15} className="animate-spin mx-auto" /> : "Enter Admin Panel"}
          </button>
        </form>
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto space-y-6 relative overflow-hidden">
      <div className="orb w-96 h-96 bg-brand-600/10 -top-32 -left-32" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
            <Scissors size={17} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-none">ClipForge Admin</h1>
            <p className="text-white/30 text-xs mt-0.5">Dashboard & User Management</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => load(secret)} title="Refresh"
            className="p-2 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg transition-all">
            <RefreshCw size={15} />
          </button>
          <button title="Logout"
            onClick={() => { localStorage.removeItem(ADMIN_KEY); setAuthed(false); setSecret(""); }}
            className="p-2 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg transition-all">
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pro Users",    val: stats.licenses.pro,         color: "text-brand-400" },
            { label: "Free Users",   val: stats.licenses.free,        color: "text-white/50" },
            { label: "Total Jobs",   val: stats.jobs.total,           color: "text-emerald-400" },
            { label: "Revenue (est)", val: stats.revenue_estimate,    color: "text-yellow-400" },
          ].map(s => (
            <div key={s.label} className="glass border border-white/8 rounded-2xl p-4">
              <p className="text-white/30 text-[11px] mb-1">{s.label}</p>
              <p className={`font-bold text-xl ${s.color} truncate`}>{s.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Generate Key — offline / WhatsApp sale */}
      <div className="relative z-10 glass border border-brand-500/20 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Key size={14} className="text-brand-400" />
          <h2 className="font-semibold text-white/90 text-sm">Generate Pro Key for Customer</h2>
        </div>
        <p className="text-white/35 text-xs leading-relaxed">
          For offline / WhatsApp payments — enter the customer's email, a Pro license key will be generated and emailed to them instantly.
        </p>
        <form onSubmit={handleGenerate} className="flex gap-2">
          <input type="email" placeholder="customer@email.com" value={genEmail}
            onChange={e => setGenEmail(e.target.value)} required
            className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all" />
          <button type="submit" disabled={genBusy}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 shrink-0">
            {genBusy ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> Send Key</>}
          </button>
        </form>
        {genMsg && (
          <p className={`text-xs font-medium ${genMsg.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>
            {genMsg}
          </p>
        )}
      </div>

      {/* Users table */}
      <div className="relative z-10 glass border border-white/8 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-white/40" />
            <h2 className="font-semibold text-white/90 text-sm">Registered Users ({users.length})</h2>
          </div>
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              className="bg-white/[0.04] border border-white/8 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-brand-500/40 w-36 transition-all" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                {["Email", "Plan", "Google", "Jobs Today", "Joined"].map(h => (
                  <th key={h} className="px-4 py-3 text-white/25 text-xs font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-white/4 hover:bg-white/[0.025] transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-white/80 text-xs font-medium">{u.email}</div>
                    {u.name && <div className="text-white/30 text-[11px]">{u.name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      u.plan === "pro"
                        ? "bg-brand-500/15 text-brand-400 border border-brand-500/25"
                        : "bg-white/5 text-white/30 border border-white/8"
                    }`}>{u.plan.toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40">{u.google_linked ? "✓" : "—"}</td>
                  <td className="px-4 py-3 text-xs text-white/40">
                    {u.daily_jobs_date === today ? u.daily_jobs_used : 0}/3
                  </td>
                  <td className="px-4 py-3 text-xs text-white/30">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-white/20 text-xs">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
