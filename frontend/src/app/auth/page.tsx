"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";
import {
  Scissors, Zap, Mail, Key, CheckCircle2, AlertCircle, Loader2,
  User, Lock, Eye, EyeOff,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const CHECKOUT_URL = process.env.NEXT_PUBLIC_GUMROAD_CHECKOUT_URL || "#";
type Mode = "login" | "signup" | "signup-success" | "set-password" | "forgot-password";

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, loginWithGoogle, loginWithEmail, signupWithEmail, setPassword } = useAuth();

  const [mode, setMode]           = useState<Mode>("login");
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail]   = useState("");
  const [loginPass, setLoginPass]     = useState("");

  // Signup fields
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPass, setSignupPass]   = useState("");

  // Set-password field
  const [newPass, setNewPass] = useState("");

  // Forgot password field
  const [forgotEmail, setForgotEmail] = useState("");

  // Redirect if already logged in (with password set)
  useEffect(() => {
    if (loading) return;
    if (user && mode !== "set-password") {
      router.replace("/tool");
    }
  }, [user, loading, mode, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={24} className="text-brand-500 animate-spin" />
    </div>
  );

  const clear = () => { setError(""); setSuccess(""); };

  // ── Google login ──────────────────────────────────────────────────────────
  const handleGoogle = async (credential: string) => {
    setBusy(true); clear();
    try {
      const needsPassword = await loginWithGoogle(credential);
      if (needsPassword) {
        setMode("set-password");
      } else {
        router.replace("/tool");
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Google login failed. Try again.");
    } finally { setBusy(false); }
  };

  // ── Email+password login ──────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); clear();
    if (!loginEmail.trim() || !loginPass.trim()) return;
    setBusy(true);
    try {
      await loginWithEmail(loginEmail.trim(), loginPass);
      router.replace("/tool");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Login failed. Check your email and password.");
    } finally { setBusy(false); }
  };

  // ── Signup ────────────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); clear();
    if (!firstName.trim() || !signupEmail.trim() || !signupPass.trim()) return;
    if (signupPass.length < 6) { setError("Password must be at least 6 characters"); return; }
    setBusy(true);
    try {
      await signupWithEmail(firstName.trim(), lastName.trim(), signupEmail.trim(), signupPass);
      setMode("signup-success");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Signup failed. Please try again.");
    } finally { setBusy(false); }
  };

  // ── Set password (Google users) ───────────────────────────────────────────
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); clear();
    if (newPass.length < 6) { setError("Password must be at least 6 characters"); return; }
    setBusy(true);
    try {
      await setPassword(newPass);
      router.replace("/tool");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const status = e?.response?.status;
      if (detail) setError(typeof detail === "string" ? detail : JSON.stringify(detail));
      else if (status) setError(`Server error ${status} — please try again.`);
      else if (e?.message) setError(e.message);
      else setError("Failed to set password. Try again.");
    } finally { setBusy(false); }
  };

  // ── Forgot password ────────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault(); clear();
    if (!forgotEmail.trim()) return;
    setBusy(true);
    try {
      const res = await import("axios").then(m =>
        m.default.post(`${API_BASE}/api/auth/forgot-password`, { email: forgotEmail.trim() })
      );
      setSuccess(res.data.message || "Check your email for a reset link.");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Something went wrong. Try again.");
    } finally { setBusy(false); }
  };

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="orb w-96 h-96 bg-brand-600/20 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <a href="/" className="flex items-center gap-2.5 mb-10 hover:opacity-80 transition-opacity">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
          <Scissors size={18} className="text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight">ClipForge</span>
      </a>

      <div className="w-full max-w-sm">
        <div className="glass border border-white/10 rounded-3xl p-7 space-y-5">

          {/* ── Signup success ── */}
          {mode === "signup-success" && (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={26} className="text-emerald-400" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-bold text-white text-lg">Account Created!</h2>
                <p className="text-white/40 text-xs leading-relaxed">
                  Your account is ready. Sign in with your email and password to continue.
                </p>
              </div>
              <button
                onClick={() => { setMode("login"); clear(); setLoginEmail(signupEmail); }}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 rounded-xl transition-all text-sm">
                Sign In Now →
              </button>
            </div>
          )}

          {/* ── Set password (Google signup) ── */}
          {mode === "set-password" && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h2 className="font-bold text-white text-base">Set Your Password</h2>
                <p className="text-white/40 text-xs leading-relaxed">
                  You signed in with Google. Set a password so you can also log in with email next time.
                </p>
              </div>
              <form onSubmit={handleSetPassword} className="space-y-3">
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Choose a password (min 6 chars)"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all"
                    autoFocus required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button type="submit" disabled={busy}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm">
                  {busy ? <Loader2 size={15} className="animate-spin mx-auto" /> : "Set Password & Continue →"}
                </button>
              </form>
              {error && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/8 border border-red-500/15 rounded-xl p-3">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Forgot password ── */}
          {mode === "forgot-password" && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h2 className="font-bold text-white text-base">Reset Password</h2>
                <p className="text-white/40 text-xs leading-relaxed">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                  <input type="email" placeholder="your@email.com"
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all"
                    autoFocus required />
                </div>
                <button type="submit" disabled={busy}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm">
                  {busy ? <Loader2 size={15} className="animate-spin mx-auto" /> : "Send Reset Link"}
                </button>
              </form>
              {success && (
                <div className="flex items-start gap-2 text-emerald-400 text-xs bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-3">
                  <CheckCircle2 size={13} className="shrink-0 mt-0.5" /><span>{success}</span>
                </div>
              )}
              {error && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/8 border border-red-500/15 rounded-xl p-3">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}
              <div className="text-center">
                <button onClick={() => { setMode("login"); clear(); }}
                  className="text-white/30 hover:text-white/60 text-xs transition-colors">
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* ── Login / Signup tabs ── */}
          {(mode === "login" || mode === "signup") && (
            <>
              {searchParams.get("expired") && mode === "login" && (
                <div className="flex items-start gap-2 text-amber-400 text-xs bg-amber-500/8 border border-amber-500/15 rounded-xl p-3">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span>Your session has expired. Please sign in again.</span>
                </div>
              )}

              {/* Tab switcher */}
              <div className="flex bg-white/[0.04] rounded-xl p-1 gap-1">
                {(["login", "signup"] as const).map(t => (
                  <button key={t} onClick={() => { setMode(t); clear(); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      mode === t ? "bg-brand-600 text-white" : "text-white/40 hover:text-white/70"
                    }`}>
                    {t === "login" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>

              {/* ── LOGIN form ── */}
              {mode === "login" && (
                <div className="space-y-4">
                  {googleClientId ? (
                    <div className="flex justify-center">
                      <GoogleLogin
                        onSuccess={r => r.credential && handleGoogle(r.credential)}
                        onError={() => setError("Google login failed")}
                        theme="filled_black" shape="pill" size="large" text="continue_with"
                      />
                    </div>
                  ) : (
                    <div className="text-center text-white/20 text-xs py-2">Google login not configured</div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-white/20 text-xs">or email</span>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>

                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                      <input type="email" placeholder="your@email.com"
                        value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all"
                        required />
                    </div>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                      <input type={showPass ? "text" : "password"} placeholder="Password"
                        value={loginPass} onChange={e => setLoginPass(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all"
                        required />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50">
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button type="submit" disabled={busy}
                      className="w-full bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50">
                      {busy ? <Loader2 size={15} className="animate-spin mx-auto" /> : "Sign In"}
                    </button>
                  </form>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => { setMode("forgot-password"); clear(); setForgotEmail(loginEmail); }}
                      className="text-white/30 hover:text-white/60 text-xs transition-colors">
                      Forgot your password?
                    </button>
                  </div>

                  <div className="rounded-xl border border-brand-500/20 bg-brand-500/8 p-4 text-center space-y-2">
                    <p className="text-white/50 text-xs">Want full access right now?</p>
                    <a href={CHECKOUT_URL}
                      className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-5 py-2 rounded-lg transition-all">
                      <Zap size={12} /> Get Pro — $29 Lifetime
                    </a>
                  </div>
                </div>
              )}

              {/* ── SIGNUP form ── */}
              {mode === "signup" && (
                <form onSubmit={handleSignup} className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                      <input type="text" placeholder="First name"
                        value={firstName} onChange={e => setFirstName(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all"
                        required />
                    </div>
                    <div className="relative flex-1">
                      <input type="text" placeholder="Last name"
                        value={lastName} onChange={e => setLastName(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all" />
                    </div>
                  </div>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                    <input type="email" placeholder="your@email.com"
                      value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all"
                      required />
                  </div>
                  <div>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                      <input type={showPass2 ? "text" : "password"} placeholder="Password (min 6 chars)"
                        value={signupPass} onChange={e => setSignupPass(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all"
                        required />
                      <button type="button" onClick={() => setShowPass2(!showPass2)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50">
                        {showPass2 ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {signupPass.length > 0 && (() => {
                      const s = signupPass;
                      const score = (s.length >= 6 ? 1 : 0) + (s.length >= 8 ? 1 : 0) + (/[A-Z]/.test(s) ? 1 : 0) + (/[0-9]/.test(s) ? 1 : 0) + (/[^A-Za-z0-9]/.test(s) ? 1 : 0);
                      const label = score <= 1 ? "Weak" : score <= 3 ? "Fair" : "Strong";
                      const color = score <= 1 ? "bg-red-500" : score <= 3 ? "bg-yellow-500" : "bg-emerald-500";
                      const textColor = score <= 1 ? "text-red-400" : score <= 3 ? "text-yellow-400" : "text-emerald-400";
                      return (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex gap-1 flex-1">
                            {[1,2,3,4,5].map(i => (
                              <div key={i} className={`h-1 flex-1 rounded-full ${i <= score ? color : "bg-white/10"}`} />
                            ))}
                          </div>
                          <span className={`text-[10px] font-medium ${textColor}`}>{label}</span>
                        </div>
                      );
                    })()}
                  </div>
                  <button type="submit" disabled={busy}
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-50">
                    {busy ? <Loader2 size={15} className="animate-spin mx-auto" /> : "Create Account →"}
                  </button>
                </form>
              )}

              {/* Error / Success */}
              {error && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/8 border border-red-500/15 rounded-xl p-3">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="text-brand-500 animate-spin" />
      </div>
    }>
      <AuthPageInner />
    </Suspense>
  );
}
