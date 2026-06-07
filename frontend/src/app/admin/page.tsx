"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Shield, Key, Users, TrendingUp, Copy, CheckCircle2,
  XCircle, RefreshCw, Plus, Search, Eye, EyeOff, Zap,
  Download, Trash2, BarChart2, Clock, Lock
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface License {
  key: string;
  plan: string;
  email: string | null;
  order_id: string | null;
  jobs_used: number;
  is_active: boolean;
  created_at: string;
}

interface Stats {
  total_licenses: number;
  pro_licenses: number;
  free_licenses: number;
  active_licenses: number;
  disabled_licenses: number;
  total_jobs: number;
}

export default function AdminPanel() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);

  // Generate form
  const [genEmail, setGenEmail] = useState("");
  const [genPlan, setGenPlan] = useState<"free" | "pro">("pro");
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);

  const headers = { "X-Admin-Secret": secret };

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/admin/stats`, { headers });
      if (r.status === 403) { setAuthed(false); return; }
      setStats(await r.json());
    } catch {}
  }, [secret]);

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/admin/licenses?page=${page}&limit=20`, { headers });
      const data = await r.json();
      setLicenses(data.licenses || []);
      setTotalPages(data.pages || 1);
    } catch {}
    setLoading(false);
  }, [secret, page]);

  const login = async () => {
    setAuthError("");
    const r = await fetch(`${API}/api/admin/stats`, {
      headers: { "X-Admin-Secret": secret }
    });
    if (r.ok) {
      setAuthed(true);
      setStats(await r.json());
    } else {
      setAuthError("Invalid admin secret. Check your ADMIN_SECRET env var.");
    }
  };

  useEffect(() => {
    if (authed) { fetchStats(); fetchLicenses(); }
  }, [authed, page]);

  const toggleLicense = async (key: string, active: boolean) => {
    if (active) {
      await fetch(`${API}/api/admin/licenses/${key}/disable`, { method: "PATCH", headers });
    } else {
      await fetch(`${API}/api/admin/licenses/${key}/enable`, { method: "PATCH", headers });
    }
    fetchLicenses();
    fetchStats();
  };

  const generateLicense = async () => {
    setGenLoading(true);
    setGenResult(null);
    try {
      const url = `${API}/api/admin/licenses/generate?plan=${genPlan}${genEmail ? `&email=${genEmail}` : ""}`;
      const r = await fetch(url, { method: "POST", headers });
      const data = await r.json();
      setGenResult(data.license_key || data.detail || "Error");
    } catch (e) {
      setGenResult("Network error");
    }
    setGenLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const filtered = licenses.filter(l =>
    !search ||
    l.key.toLowerCase().includes(search.toLowerCase()) ||
    (l.email || "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Login Screen ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass rounded-3xl p-10 w-full max-w-md border border-white/10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center mx-auto mb-6">
            <Lock size={28} className="text-brand-400" />
          </div>
          <h1 className="text-2xl font-black mb-2">Admin Panel</h1>
          <p className="text-white/40 text-sm mb-8">ClipForge — Internal Dashboard</p>

          <div className="relative mb-4">
            <input
              type={showSecret ? "text" : "password"}
              value={secret}
              onChange={e => setSecret(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder="Admin secret key..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-500/50 pr-10"
            />
            <button
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {authError && <p className="text-red-400 text-xs mb-4">{authError}</p>}

          <button
            onClick={login}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition-all"
          >
            Enter Dashboard
          </button>
          <p className="text-white/20 text-xs mt-4">
            Default: <code className="text-white/30">clipforge-admin-2024</code>
          </p>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Shield size={28} className="text-brand-400" /> Admin Panel
          </h1>
          <p className="text-white/30 text-sm mt-1">ClipForge — Full Control Dashboard</p>
        </div>
        <button
          onClick={() => { fetchStats(); fetchLicenses(); }}
          className="flex items-center gap-2 glass border border-white/10 px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-all"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {[
            { label: "Total Licenses", value: stats.total_licenses, icon: <Key size={16} />, color: "text-brand-400" },
            { label: "Pro Licenses", value: stats.pro_licenses, icon: <Zap size={16} />, color: "text-purple-400" },
            { label: "Free Licenses", value: stats.free_licenses, icon: <Users size={16} />, color: "text-blue-400" },
            { label: "Active", value: stats.active_licenses, icon: <CheckCircle2 size={16} />, color: "text-green-400" },
            { label: "Disabled", value: stats.disabled_licenses, icon: <XCircle size={16} />, color: "text-red-400" },
            { label: "Total Jobs", value: stats.total_jobs, icon: <BarChart2 size={16} />, color: "text-yellow-400" },
          ].map((s, i) => (
            <div key={i} className="glass rounded-2xl p-5 text-center border border-white/8">
              <div className={`flex justify-center mb-2 ${s.color}`}>{s.icon}</div>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-white/35 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-10">
        {/* Generate License */}
        <div className="glass rounded-2xl p-6 border border-white/8">
          <h2 className="font-bold text-white/90 flex items-center gap-2 mb-5">
            <Plus size={16} className="text-brand-400" /> Generate License
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-white/40 text-xs mb-1 block">Plan</label>
              <select
                value={genPlan}
                onChange={e => setGenPlan(e.target.value as "free" | "pro")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50"
              >
                <option value="pro">Pro Lifetime</option>
                <option value="free">Free</option>
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Email (optional)</label>
              <input
                type="email"
                value={genEmail}
                onChange={e => setGenEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50"
              />
            </div>
            <button
              onClick={generateLicense}
              disabled={genLoading}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {genLoading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              Generate Key
            </button>
            {genResult && (
              <div
                className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5 cursor-pointer"
                onClick={() => copyToClipboard(genResult)}
              >
                <code className="text-green-400 text-xs flex-1 truncate">{genResult}</code>
                {copied === genResult ? <CheckCircle2 size={14} className="text-green-400 shrink-0" /> : <Copy size={14} className="text-white/40 shrink-0" />}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="glass rounded-2xl p-6 border border-white/8 lg:col-span-2">
          <h2 className="font-bold text-white/90 flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-brand-400" /> Revenue Estimate
          </h2>
          {stats && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/3 rounded-xl">
                <div>
                  <p className="text-white/50 text-xs">Pro Licenses Sold</p>
                  <p className="text-2xl font-black text-white">{stats.pro_licenses}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-xs">Revenue @ $29/license</p>
                  <p className="text-2xl font-black text-green-400">${stats.pro_licenses * 29}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-white/3 rounded-xl">
                  <p className="text-white/40 text-xs mb-1">Avg Jobs/License</p>
                  <p className="text-xl font-bold text-white">
                    {stats.total_licenses > 0 ? (stats.total_jobs / stats.total_licenses).toFixed(1) : 0}
                  </p>
                </div>
                <div className="p-4 bg-white/3 rounded-xl">
                  <p className="text-white/40 text-xs mb-1">Activation Rate</p>
                  <p className="text-xl font-bold text-white">
                    {stats.total_licenses > 0
                      ? Math.round((stats.active_licenses / stats.total_licenses) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Licenses Table */}
      <div className="glass rounded-2xl border border-white/8 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="font-bold text-white/90 flex items-center gap-2">
            <Key size={16} className="text-brand-400" /> All Licenses
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search key or email..."
              className="bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 w-52"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={20} className="animate-spin text-brand-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-white/30 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">License Key</th>
                  <th className="text-left px-5 py-3">Plan</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Jobs</th>
                  <th className="text-left px-5 py-3">Created</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.key} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-brand-400 text-xs">{l.key}</code>
                        <button onClick={() => copyToClipboard(l.key)} className="text-white/20 hover:text-white/50 transition-colors">
                          {copied === l.key ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        l.plan === "pro"
                          ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                          : "bg-white/5 text-white/40 border border-white/10"
                      }`}>
                        {l.plan.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white/50 text-xs">{l.email || "—"}</td>
                    <td className="px-5 py-3 text-white/60 text-xs">{l.jobs_used}</td>
                    <td className="px-5 py-3 text-white/30 text-xs">
                      {new Date(l.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      {l.is_active
                        ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 size={12} /> Active</span>
                        : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle size={12} /> Disabled</span>
                      }
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleLicense(l.key, l.is_active)}
                        className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all ${
                          l.is_active
                            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                            : "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
                        }`}
                      >
                        {l.is_active ? <><XCircle size={11} /> Disable</> : <><CheckCircle2 size={11} /> Enable</>}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-white/25 text-sm">
                      No licenses found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 p-4 border-t border-white/8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg glass border border-white/10 text-xs text-white/50 disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-white/30 text-xs">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg glass border border-white/10 text-xs text-white/50 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
