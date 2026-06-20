"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";
import { Scissors, Zap, Mail, Key, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const LEMON_URL = process.env.NEXT_PUBLIC_LEMON_CHECKOUT_URL || "#";

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, loginWithGoogle, loginWithEmail, activateKey } = useAuth();

  const [tab, setTab]         = useState<"login" | "activate">("login");
  const [email, setEmail]     = useState("");
  const [key, setKey]         = useState("");
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  // If already logged in → redirect to tool
  useEffect(() => {
    if (!loading && user) {
      router.replace("/tool");
    }
  }, [user, loading, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={24} className="text-brand-500 animate-spin" />
    </div>
  );

  const handleGoogle = async (credential: string) => {
    setBusy(true); setError("");
    try {
      await loginWithGoogle(credential);
      router.replace("/tool");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Google login failed");
    } finally { setBusy(false); }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true); setError("");
    try {
      await loginWithEmail(email.trim());
      router.replace("/tool");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Login failed");
    } finally { setBusy(false); }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const msg = await activateKey(key.trim().toUpperCase());
      setSuccess(msg);
      setTimeout(() => router.replace("/tool"), 1500);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Activation failed");
    } finally { setBusy(false); }
  };

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="orb w-96 h-96 bg-brand-600/20 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* Logo */}
      <a href="/" className="flex items-center gap-2.5 mb-10 hover:opacity-80 transition-opacity">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
          <Scissors size={18} className="text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight">ClipForge</span>
      </a>

      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="glass border border-white/10 rounded-3xl p-7 space-y-6">

          {/* Tabs */}
          <div className="flex bg-white/[0.04] rounded-xl p-1 gap-1">
            {(["login", "activate"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  tab === t ? "bg-brand-600 text-white" : "text-white/40 hover:text-white/70"
                }`}>
                {t === "login" ? "Sign In / Sign Up" : "Activate Key"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <div className="space-y-4">
              <p className="text-white/40 text-xs text-center leading-relaxed">
                Sign in to access ClipForge. Your account and plan stay synced across all devices.
              </p>

              {/* Google Sign In */}
              {googleClientId ? (
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={r => r.credential && handleGoogle(r.credential)}
                    onError={() => setError("Google login failed")}
                    theme="filled_black"
                    shape="pill"
                    size="large"
                    text="continue_with"
                  />
                </div>
              ) : (
                <div className="text-center text-white/20 text-xs py-2">Google login not configured</div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-white/20 text-xs">or email</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmail} className="space-y-3">
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.06] transition-all"
                    required
                  />
                </div>
                <button type="submit" disabled={busy}
                  className="w-full bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50">
                  {busy ? <Loader2 size={15} className="animate-spin mx-auto" /> : "Continue with Email"}
                </button>
              </form>

              {/* Pro CTA */}
              <div className="rounded-xl border border-brand-500/20 bg-brand-500/8 p-4 text-center space-y-2">
                <p className="text-white/50 text-xs">Want full access right now?</p>
                <a href={LEMON_URL}
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-5 py-2 rounded-lg transition-all">
                  <Zap size={12} /> Get Pro — $29 Lifetime
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-white/40 text-xs text-center leading-relaxed">
                Already have a Pro license key? Sign in first, then activate your key to unlock Pro features.
              </p>
              <form onSubmit={handleActivate} className="space-y-3">
                <div className="relative">
                  <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                  <input
                    type="text"
                    placeholder="CF-PRO-XXXXXX-XXXXXX-XXXXXX"
                    value={key}
                    onChange={e => setKey(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.06] transition-all font-mono tracking-wider uppercase"
                    required
                  />
                </div>
                <button type="submit" disabled={busy}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-50">
                  {busy ? <Loader2 size={15} className="animate-spin mx-auto" /> : "Activate License Key"}
                </button>
              </form>
              <p className="text-white/25 text-xs text-center">
                You must be logged in to activate. <button onClick={() => setTab("login")} className="text-brand-400 hover:text-brand-300 underline">Sign in first →</button>
              </p>
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/8 border border-red-500/15 rounded-xl p-3">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 text-emerald-400 text-xs bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-3">
              <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
