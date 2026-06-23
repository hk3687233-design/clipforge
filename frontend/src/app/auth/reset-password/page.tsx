"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Scissors, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    setBusy(true);
    try {
      await axios.post(`${API_BASE}/api/auth/reset-password`, { token, password });
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to reset password. The link may have expired.");
    } finally {
      setBusy(false);
    }
  };

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

          {done ? (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={26} className="text-emerald-400" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-bold text-white text-lg">Password Updated!</h2>
                <p className="text-white/40 text-xs leading-relaxed">
                  Your password has been reset. You can now sign in with your new password.
                </p>
              </div>
              <button
                onClick={() => router.push("/auth")}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 rounded-xl transition-all text-sm">
                Sign In Now
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h2 className="font-bold text-white text-base">Reset Your Password</h2>
                <p className="text-white/40 text-xs leading-relaxed">
                  Enter your new password below.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="New password (min 6 chars)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all"
                    autoFocus required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all"
                    required
                  />
                </div>

                <button type="submit" disabled={busy}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm">
                  {busy ? <Loader2 size={15} className="animate-spin mx-auto" /> : "Reset Password"}
                </button>
              </form>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/8 border border-red-500/15 rounded-xl p-3">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}

              <div className="text-center">
                <a href="/auth" className="text-white/30 hover:text-white/60 text-xs transition-colors">
                  Back to Sign In
                </a>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="text-brand-500 animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
