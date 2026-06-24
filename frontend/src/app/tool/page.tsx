"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Uploader from "@/components/Uploader";
import JobPoller from "@/components/JobPoller";
import { useAuth } from "@/contexts/AuthContext";
import { Scissors, Zap, Lock, Loader2, User, Key, X, CheckCircle2, AlertCircle, History } from "lucide-react";
import { CheckoutModal } from "@/components/CheckoutModal";

export default function ToolPage() {
  const router = useRouter();
  const { user, loading, logout, activateKey, sessionExpired } = useAuth();
  const [jobId, setJobId] = useState<string | null>(null);

  // Activate key modal
  const [showActivate, setShowActivate] = useState(false);
  const [keyInput, setKeyInput]         = useState("");
  const [keyBusy, setKeyBusy]           = useState(false);
  const [keyError, setKeyError]         = useState("");
  const [keySuccess, setKeySuccess]     = useState("");
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (sessionExpired) {
        router.replace("/auth?expired=1");
      } else {
        router.replace("/auth");
      }
    }
  }, [user, loading, sessionExpired, router]);

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={22} className="text-brand-500 animate-spin" />
    </div>
  );

  const plan = user.plan;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setKeyBusy(true); setKeyError(""); setKeySuccess("");
    try {
      const msg = await activateKey(keyInput.trim().toUpperCase());
      setKeySuccess(msg);
      setTimeout(() => { setShowActivate(false); setKeyInput(""); setKeySuccess(""); }, 1800);
    } catch (err: any) {
      setKeyError(err?.response?.data?.detail || "Invalid key. Check and try again.");
    } finally { setKeyBusy(false); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="orb w-96 h-96 bg-brand-600/20 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="orb w-64 h-64 bg-purple-800/15 bottom-20 right-10" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16 gap-10">

        {/* Header */}
        <div className="w-full max-w-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <a href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <Scissors size={16} className="text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">ClipForge</span>
            </a>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-1 ${
              plan === "pro"
                ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                : "bg-white/5 text-white/30 border border-white/10"
            }`}>
              {plan === "pro" ? "PRO" : "FREE"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {plan === "free" && (
              <button onClick={() => setShowCheckout(true)}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all glow-button">
                <Zap size={12} /> Upgrade
              </button>
            )}
            <div className="flex items-center gap-3">
              <a href="/history" title="Job history" className="text-white/25 hover:text-white/60 transition-colors">
                <History size={16} />
              </a>
              <a href="/account" title="Account settings">
                {user.avatar_url
                  ? <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full hover:ring-2 hover:ring-brand-500/50 transition-all" />
                  : <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors"><User size={12} className="text-white/40" /></div>
                }
              </a>
              <button onClick={logout} className="text-white/30 hover:text-white/60 text-xs transition-colors">
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            One video,{" "}
            <span className="gradient-text-purple">every product</span>
            <br />clipped instantly.
          </h1>
          <p className="text-white/40 max-w-md mx-auto text-sm">
            Paste a YouTube, TikTok, or Instagram link. AI detects each product and exports separate high-quality clips.
          </p>
          {plan === "free" && (
            <div className="flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-xs font-medium">
                <Lock size={12} /> Free plan: {user.daily_jobs_used || 0}/3 exports used today · max 10 min · 5 clips ·{" "}
                <button onClick={() => setShowCheckout(true)} className="underline underline-offset-2 font-bold">Upgrade for unlimited</button>
              </div>
              {(user.daily_jobs_used || 0) >= 2 && (user.daily_jobs_used || 0) < 3 && (
                <p className="text-amber-400/80 text-xs">Last free export for today — upgrade to Pro for unlimited</p>
              )}
              <button
                onClick={() => { setShowActivate(true); setKeyError(""); setKeySuccess(""); }}
                className="flex items-center gap-1.5 text-white/25 hover:text-brand-400 text-xs transition-colors">
                <Key size={11} /> Have a license key? Activate it →
              </button>
            </div>
          )}
        </div>

        {/* Tool */}
        <div className="w-full max-w-2xl">
          {!jobId
            ? <Uploader onJobCreated={setJobId} />
            : <JobPoller jobId={jobId} onReset={() => setJobId(null)} plan={plan} />
          }
        </div>

        <p className="text-xs text-white/20 flex items-center gap-3">
          <span>YouTube</span><span className="w-1 h-1 bg-white/20 rounded-full inline-block" />
          <span>TikTok</span><span className="w-1 h-1 bg-white/20 rounded-full inline-block" />
          <span>Instagram</span><span className="w-1 h-1 bg-white/20 rounded-full inline-block" />
          <span>Direct Upload</span>
        </p>
      </div>

      {/* Activate Key Modal */}
      {showActivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          onClick={() => setShowActivate(false)}>
          <div className="w-full max-w-sm glass border border-white/10 rounded-3xl p-7 space-y-5"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-brand-400" />
                <h2 className="font-bold text-white text-base">Activate License Key</h2>
              </div>
              <button onClick={() => setShowActivate(false)}
                className="text-white/30 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-white/40 text-xs leading-relaxed">
              Enter your Pro license key to unlock unlimited access on this account.
            </p>
            <form onSubmit={handleActivate} className="space-y-3">
              <input
                type="text"
                placeholder="CF-PRO-XXXXXX-XXXXXX-XXXXXX"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 font-mono tracking-wider uppercase transition-all"
                autoFocus
                required
              />
              <button type="submit" disabled={keyBusy}
                className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                {keyBusy ? <Loader2 size={14} className="animate-spin" /> : <><Key size={14} /> Activate Key</>}
              </button>
            </form>
            {keyError && (
              <div className="flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle size={13} className="shrink-0" />{keyError}
              </div>
            )}
            {keySuccess && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs">
                <CheckCircle2 size={13} className="shrink-0" />{keySuccess}
              </div>
            )}
          </div>
        </div>
      )}

      <CheckoutModal open={showCheckout} onClose={() => setShowCheckout(false)} />
    </div>
  );
}
