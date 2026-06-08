"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Shield, Key, Users, Copy, CheckCircle2,
  XCircle, RefreshCw, Plus, Search, Eye, EyeOff, Zap,
  Lock
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface License {
  key: string;
  plan: string;
  email: string | null;
  jobs_used: number;
  is_valid: boolean;
  device_bound: boolean;
  activated_at: string | null;
  created_at: string;
}

export default function AdminPanel() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState("");

  // Generate form
  const [genEmail, setGenEmail] = useState("");
  const [genPlan, setGenPlan] = useState<"free" | "pro">("pro");
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);

  const h = useCallback(() => ({ "X-Admin-Secret": secret }), [secret]);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/admin/stats`, { headers: h() });
      if (r.status === 403) { setAuthed(false); return; }
      setStats(await r.json());
    } catch {}
  }, [h]);

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/admin/licenses?page=${page}&limit=20`, { headers: h() });
      const data = await r.json();
      // API returns {total, page, items:[]}
      setLicenses(data.items || []);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  }, [h, page]);

  const login = async () => {
    setAuthError("");
    const r = await fetch(`${API}/api/admin/stats`, {
      headers: { "X-Admin-Secret": secret }
    });
    if (r.ok) {
      const data = await r.json();
      setAuthed(true);
      setStats(data);
      fetchLicenses();
    } else {
      setAuthError("Invalid admin secret!");
    }
  };

  useEffect(() => {
    if (authed) { fetchStats(); fetchLicenses(); }
  }, [authed, page]);

  const toggleLicense = async (key: string, isValid: boolean) => {
    const endpoint = isValid ? "disable" : "enable";
    await fetch(`${API}/api/admin/licenses/${key}/${endpoint}`, {
      method: "PATCH", headers: h()
    });
    setActionMsg(`License ${isValid ? "disabled" : "enabled"} ✓`);
    setTimeout(() => setActionMsg(""), 2000);
    fetchLicenses();
    fetchStats();
  };

  const generateLicense = async () => {
    setGenLoading(true);
    setGenResult(null);
    try {
      const params = new URLSearchParams({ plan: genPlan });
      if (genEmail.trim()) params.append("email", genEmail.trim());
      const r = await fetch(`${API}/api/admin/licenses/generate?${params}`, {
        method: "POST",
        headers: h(),
      });
      if (!r.ok) {
        const err = await r.text();
        setGenResult(`Error ${r.status}: ${err}`);
      } else {
        const data = await r.json();
        setGenResult(data.key || data.license_key || JSON.stringify(data));
      }
    } catch (e: any) {
      setGenResult(`Network error: ${e?.message || "Check API URL"}`);
    }
    setGenLoading(false);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const filtered = licenses.filter(l =>
    !search ||
    l.key.toLowerCase().includes(search.toLowerCase()) ||
    (l.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / 20) || 1;

  // ── Login ─────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a0f]">
        <div className="glass rounded-3xl p-10 w-full max-w-md border border-white/10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center mx-auto mb-6">
            <Lock size={28} className="text-brand-400" />
          </div>
          <h1 className="text-2xl font-black mb-1">Admin Panel</h1>
          <p className="text-white/30 text-sm mb-8">ClipForge — Internal Dashboard</p>
          <div className="relative mb-4">
            <input
              type={showSecret ? "text" : "password"}
              value={secret}
              onChange={e => setSecret(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder="Enter admin secret..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-500/50 pr-10"
            />
            <button onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {authError && <p className="text-red-400 text-xs mb-4">{authError}</p>}
          <button onClick={login} className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition-all">
            Enter Dashboard
          </button>
          <p className="text-white/20 text-xs mt-4">Contact admin for access credentials.</p>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Shield size={28} className="text-brand-400" /> Admin Panel
          </h1>
          <p className="text-white/30 text-sm mt-1">ClipForge — Full Control Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          {actionMsg && <span className="text-green-400 text-sm">{actionMsg}</span>}
          <button onClick={() => { fetchStats(); fetchLicenses(); }}
            className="flex items-center gap-2 glass border border-white/10 px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-all">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Users", value: stats.licenses?.total ?? 0, icon: <Key size={16}/>, color: "text-brand-400" },
            { label: "Pro Users", value: stats.licenses?.pro ?? 0, icon: <Zap size={16}/>, color: "text-purple-400" },
            { label: "Free Users", value: stats.licenses?.free ?? 0, icon: <Users size={16}/>, color: "text-blue-400" },
            { label: "Active", value: stats.licenses?.active ?? 0, icon: <CheckCircle2 size={16}/>, color: "text-green-400" },
          ].map((s, i) => (
            <div key={i} className="glass rounded-2xl p-5 text-center border border-white/8">
              <div className={`flex justify-center mb-2 ${s.color}`}>{s.icon}</div>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-white/35 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Generate License */}
      <div className="glass rounded-2xl p-6 border border-white/8 mb-8 max-w-lg">
        <h2 className="font-bold text-white/90 flex items-center gap-2 mb-5">
          <Plus size={16} className="text-brand-400" /> Generate License
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-white/40 text-xs mb-1 block">Plan</label>
            <select value={genPlan} onChange={e => setGenPlan(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50">
              <option value="pro">Pro Lifetime</option>
              <option value="free">Free</option>
            </select>
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">Email (optional)</label>
            <input type="email" value={genEmail} onChange={e => setGenEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50"
            />
          </div>
          <button onClick={generateLicense} disabled={genLoading}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
            {genLoading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />} Generate Key
          </button>
          {genResult && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5 cursor-pointer"
              onClick={() => copy(genResult!)}>
              <code className="text-green-400 text-xs flex-1 break-all">{genResult}</code>
              {copied === genResult ? <CheckCircle2 size={14} className="text-green-400 shrink-0" /> : <Copy size={14} className="text-white/40 shrink-0" />}
            </div>
          )}
        </div>
      </div>

      {/* Licenses Table */}
      <div className="glass rounded-2xl border border-white/8 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="font-bold text-white/90 flex items-center gap-2">
            <Key size={16} className="text-brand-400" /> Licenses
            <span className="text-white/30 text-xs font-normal ml-1">({total} total)</span>
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
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
                  <th className="text-left px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.key} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-brand-400 text-xs">{l.key}</code>
                        <button onClick={() => copy(l.key)} className="text-white/20 hover:text-white/50 transition-colors">
                          {copied === l.key ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        l.plan === "pro"
                          ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                          : "bg-white/5 text-white/40 border border-white/10"
                      }`}>{l.plan.toUpperCase()}</span>
                    </td>
                    <td className="px-5 py-3 text-white/50 text-xs">{l.email || "—"}</td>
                    <td className="px-5 py-3 text-white/60 text-xs">{l.jobs_used ?? 0}</td>
                    <td className="px-5 py-3 text-white/30 text-xs">
                      {l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        {l.is_valid
                          ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 size={12} /> Active</span>
                          : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle size={12} /> Disabled</span>}
                        {l.device_bound
                          ? <span className="text-yellow-500/70 text-[10px]">🔒 Device locked</span>
                          : <span className="text-white/20 text-[10px]">○ Not activated</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleLicense(l.key, l.is_valid)}
                        className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all ${
                          l.is_valid
                            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                            : "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
                        }`}>
                        {l.is_valid ? <><XCircle size={11} /> Disable</> : <><CheckCircle2 size={11} /> Enable</>}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-white/25 text-sm">No licenses yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 p-4 border-t border-white/8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg glass border border-white/10 text-xs text-white/50 disabled:opacity-30">Previous</button>
            <span className="text-white/30 text-xs">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg glass border border-white/10 text-xs text-white/50 disabled:opacity-30">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
