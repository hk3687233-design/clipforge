"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Uploader from "@/components/Uploader";
import JobPoller from "@/components/JobPoller";
import { Scissors, Zap, Lock } from "lucide-react";

const LEMON_URL = process.env.NEXT_PUBLIC_LEMON_CHECKOUT_URL || "#";
const LICENSE_KEY = "clipforge_license_key";

export default function ToolPage() {
  const router = useRouter();
  const [jobId, setJobId] = useState<string | null>(null);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      setPlan("pro");
      setReady(true);
      return;
    }
    const saved = localStorage.getItem(LICENSE_KEY);
    if (!saved) {
      router.replace("/");
      return;
    }
    const savedPlan = (localStorage.getItem("clipforge_plan") as "free" | "pro") || "free";
    setPlan(savedPlan);
    setReady(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem(LICENSE_KEY);
    localStorage.removeItem("clipforge_plan");
    router.push("/");
  };

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

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
              <a
                href={LEMON_URL}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all glow-button"
              >
                <Zap size={12} /><span className="hidden sm:inline">Upgrade to Pro — </span>$29
              </a>
            )}
            <button
              onClick={handleLogout}
              className="text-white/30 hover:text-white/60 text-xs transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-xs font-medium">
              <Lock size={12} /> Free plan: 5 clips max per video ·{" "}
              <a href={LEMON_URL} className="underline underline-offset-2 font-bold">Upgrade for unlimited</a>
            </div>
          )}
        </div>

        <div className="w-full max-w-2xl">
          {plan === "free" ? (
            <div className="glass border border-white/10 rounded-3xl p-10 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto">
                <Zap size={24} className="text-brand-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Free Plan — Coming Soon</h2>
                <p className="text-white/40 text-sm max-w-sm mx-auto">
                  The free tier is not available yet. Upgrade to Pro to get full access right now.
                </p>
              </div>
              <a
                href={LEMON_URL}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-3 rounded-2xl transition-all glow-button text-sm"
              >
                <Zap size={14} /> Get Pro — $29 Lifetime
              </a>
            </div>
          ) : !jobId
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
    </div>
  );
}
