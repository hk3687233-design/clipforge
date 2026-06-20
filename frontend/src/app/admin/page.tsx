"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import {
  Scissors, Users, Key, Send, Loader2, RefreshCw, LogOut,
  Search, Crown, ShieldOff, User, Copy, CheckCircle2, Trash2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_KEY = "clipforge_admin_secret";

interface UserRow {
  id: string; email: string; name?: string; plan: string;
  license_key?: string; is_admin: boolean;
  daily_jobs_used: number; daily_jobs_date?: string; created_at?: string;
}
interface LicenseRow {
  key: string; email?: string; plan: string; is_valid: boolean;
  jobs_used: number; used_by_user: boolean; activated_at?: string; created_at?: string;
}
type UserTab = "all" | "free" | "pro";

export default function AdminPage() {
  const { user } = useAuth();

  const [secret, setSecret]       = useState("");
  const [authed, setAuthed]       = useState(false);
  const [users,  setUsers]        = useState<UserRow[]>([]);
  const [licenses, setLicenses]   = useState<LicenseRow[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error,  setError]        = useState("");
  const [search, setSearch]       = useState("");
  const [userTab, setUserTab]     = useState<UserTab>("all");
  const [genEmail, setGenEmail]   = useState("");
  const [genBusy,  setGenBusy]    = useState(false);
  const [genMsg,   setGenMsg]     = useState("");
  const [planBusy, setPlanBusy]     = useState<string | null>(null);
  const [planErr,  setPlanErr]      = useState("");
  const [newKey,   setNewKey]       = useState("");
  const [copied,   setCopied]       = useState(false);
  const [delConfirm, setDelConfirm] = useState<string | null>(null);
  const [delBusy,    setDelBusy]    = useState<string | null>(null);

  const load = useCallback(async (sec: string) => {
    setLoading(true); setError("");
    try {
      const hdrs = { "X-Admin-Secret": sec };
      const [u, l] = await Promise.all([
        axios.get(`${API_BASE}/api/admin/users`,    { headers: hdrs }),
        axios.get(`${API_BASE}/api/admin/licenses`, { headers: hdrs }),
      ]);
      setUsers(u.data.items);
      setLicenses(l.data.items);
      setAuthed(true);
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

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); if (secret) load(secret); };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genEmail.trim()) return;
    setGenBusy(true); setGenMsg("");
    try {
      const res = await axios.post(
        `${API_BASE}/api/admin/licenses/generate?plan=pro&email=${encodeURIComponent(genEmail.trim())}`,
        {}, { headers: { "X-Admin-Secret": secret } }
      );
      setGenMsg(`✓ Key sent to ${genEmail.trim()}: ${res.data.key}`);
      setGenEmail(""); load(secret);
    } catch (e: any) {
      setGenMsg(`✗ ${e?.response?.data?.detail || "Failed"}`);
    } finally { setGenBusy(false); }
  };

  const handleTogglePlan = async (u: UserRow) => {
    const newPlan = u.plan === "pro" ? "free" : "pro";
    setPlanBusy(u.id); setPlanErr("");
    try {
      const hdrs = { "X-Admin-Secret": secret };
      const res = await axios.patch(
        `${API_BASE}/api/admin/users/${u.id}/set-plan?plan=${newPlan}`,
        {}, { headers: hdrs }
      );
      if (res.data.key) setNewKey(res.data.key);
      // Always reload both tables to reflect DB state
      const [ul, ll] = await Promise.all([
        axios.get(`${API_BASE}/api/admin/users`,    { headers: hdrs }),
        axios.get(`${API_BASE}/api/admin/licenses`, { headers: hdrs }),
      ]);
      setUsers(ul.data.items);
      setLicenses(ll.data.items);
    } catch (e: any) {
      setPlanErr(e?.response?.data?.detail || "Failed to switch plan");
    } finally { setPlanBusy(null); }
  };

  const handleDelete = async (type: "user" | "license", id: string) => {
    setDelBusy(id);
    try {
      const hdrs = { "X-Admin-Secret": secret };
      const url = type === "user"
        ? `${API_BASE}/api/admin/users/${id}`
        : `${API_BASE}/api/admin/licenses/${encodeURIComponent(id)}`;
      await axios.delete(url, { headers: hdrs });
      if (type === "user") setUsers(prev => prev.filter(u => u.id !== id));
      else setLicenses(prev => prev.filter(l => l.key !== id));
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Delete failed");
    } finally { setDelBusy(null); setDelConfirm(null); }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const today = new Date().toISOString().slice(0, 10);
  const filteredUsers = users.filter(u => {
    if (userTab === "free" && u.plan !== "free") return false;
    if (userTab === "pro"  && u.plan !== "pro")  return false;
    if (search) {
      const s = search.toLowerCase();
      return u.email.toLowerCase().includes(s) || (u.name || "").toLowerCase().includes(s);
    }
    return true;
  });

  // ── Admin secret prompt ────────────────────────────────────────────────────
  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm glass border border-white/10 rounded-3xl p-7 space-y-5">
        <div className="flex items-center gap-2.5 justify-center">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Scissors size={15} className="text-white" />
          </div>
          <span className="font-bold text-lg">Admin Panel</span>
        </div>

        {user && (
          <div className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full shrink-0" />
              : <div className="w-6 h-6 rounded-full bg-brand-600/30 flex items-center justify-center shrink-0">
                  <User size={12} className="text-brand-400" />
                </div>
            }
            <div>
              {user.name && <p className="text-white/70 text-xs font-semibold leading-none">{user.name}</p>}
              <p className="text-white/35 text-[11px]">{user.email}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3">
          <input type="password" placeholder="Admin password / secret"
            value={secret} onChange={e => setSecret(e.target.value)}
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

  // ── Full admin panel ───────────────────────────────────────────────────────
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
          <button onClick={() => { localStorage.removeItem(ADMIN_KEY); setAuthed(false); setSecret(""); }} title="Logout"
            className="p-2 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg transition-all">
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Generated key notification */}
      {newKey && (
        <div className="relative z-10 glass border border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-emerald-400 text-xs font-semibold mb-1">Pro key generated & linked</p>
            <p className="text-white/60 text-xs font-mono">{newKey}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => copyKey(newKey)}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors">
              {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={() => setNewKey("")} className="text-white/20 hover:text-white/50 text-xs transition-colors">✕</button>
          </div>
        </div>
      )}

      {/* Stats — computed live from users array */}
      <div className="relative z-10 grid grid-cols-2 gap-3">
        {[
          { label: "Pro Users",  val: users.filter(u => u.plan === "pro").length,  color: "text-brand-400" },
          { label: "Free Users", val: users.filter(u => u.plan === "free").length, color: "text-white/50" },
        ].map(s => (
          <div key={s.label} className="glass border border-white/8 rounded-2xl p-4">
            <p className="text-white/30 text-[11px] mb-1">{s.label}</p>
            <p className={`font-bold text-xl ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Generate Key */}
      <div className="relative z-10 glass border border-brand-500/20 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Key size={14} className="text-brand-400" />
          <h2 className="font-semibold text-white/90 text-sm">Generate Pro Key for Customer</h2>
        </div>
        <p className="text-white/35 text-xs leading-relaxed">
          Offline / WhatsApp payment — key is generated, emailed to customer, and auto-linked to their account if they're signed up.
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
          <p className={`text-xs font-medium break-all ${genMsg.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>
            {genMsg}
          </p>
        )}
      </div>

      {/* Users table */}
      <div className="relative z-10 glass border border-white/8 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-white/40" />
              <h2 className="font-semibold text-white/90 text-sm">Users ({users.length})</h2>
            </div>
            <div className="flex bg-white/[0.04] rounded-lg p-0.5 gap-0.5">
              {(["all", "free", "pro"] as UserTab[]).map(t => (
                <button key={t} onClick={() => setUserTab(t)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    userTab === t ? "bg-brand-600 text-white" : "text-white/30 hover:text-white/60"
                  }`}>
                  {t === "all" ? `All (${users.length})` : t === "free" ? `Free (${users.filter(u => u.plan === "free").length})` : `Pro (${users.filter(u => u.plan === "pro").length})`}
                </button>
              ))}
            </div>
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
                {["User", "Plan", "Jobs Today", "Joined", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-white/25 text-xs font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} className="border-b border-white/4 hover:bg-white/[0.025] transition-colors">
                  <td className="px-4 py-3 min-w-[160px]">
                    {u.name
                      ? <><div className="text-white/85 text-xs font-semibold">{u.name}</div>
                          <div className="text-white/35 text-[11px]">{u.email}</div></>
                      : <div className="text-white/70 text-xs">{u.email}</div>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          u.plan === "pro"
                            ? "bg-brand-500/15 text-brand-400 border border-brand-500/25"
                            : "bg-white/5 text-white/30 border border-white/8"
                        }`}>{u.plan.toUpperCase()}</span>
                        <button onClick={() => handleTogglePlan(u)} disabled={planBusy === u.id}
                          title={`Switch to ${u.plan === "pro" ? "Free" : "Pro"}`}
                          className="text-white/20 hover:text-white/70 transition-colors disabled:opacity-30">
                          {planBusy === u.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : u.plan === "pro" ? <ShieldOff size={11} /> : <Crown size={11} />
                          }
                        </button>
                      </div>
                      {planErr && planBusy === null && (
                        <span className="text-red-400 text-[10px]">{planErr}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40">
                    {u.daily_jobs_date === today ? u.daily_jobs_used : 0}
                  </td>
                  <td className="px-4 py-3 text-xs text-white/30 whitespace-nowrap">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {delBusy === u.id ? <Loader2 size={11} className="animate-spin text-white/30" /> :
                     delConfirm === u.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete("user", u.id)} className="text-red-400 text-[10px] font-bold hover:text-red-300">Del?</button>
                        <button onClick={() => setDelConfirm(null)} className="text-white/20 text-[10px] hover:text-white/50">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setDelConfirm(u.id)} className="text-white/10 hover:text-red-400 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-white/20 text-xs">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* License Keys table */}
      <div className="relative z-10 glass border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
          <Key size={14} className="text-white/40" />
          <h2 className="font-semibold text-white/90 text-sm">License Keys ({licenses.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                {["Key", "Email", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-white/25 text-xs font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licenses.map(l => (
                <tr key={l.key} className="border-b border-white/4 hover:bg-white/[0.025] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span title={l.key} className="text-white/50 text-[11px] font-mono cursor-help">
                        {l.key}
                      </span>
                      <button onClick={() => copyKey(l.key)} className="text-white/20 hover:text-white/60 transition-colors">
                        <Copy size={10} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/50">{l.email || <span className="text-white/15">—</span>}</td>
                  <td className="px-4 py-3">
                    {!l.is_valid ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Disabled</span>
                    ) : l.used_by_user ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/25">Used ✓</span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Unused</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {delBusy === l.key ? <Loader2 size={11} className="animate-spin text-white/30" /> :
                     delConfirm === l.key ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete("license", l.key)} className="text-red-400 text-[10px] font-bold hover:text-red-300">Del?</button>
                        <button onClick={() => setDelConfirm(null)} className="text-white/20 text-[10px] hover:text-white/50">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setDelConfirm(l.key)} className="text-white/10 hover:text-red-400 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {licenses.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-white/20 text-xs">No keys generated yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
