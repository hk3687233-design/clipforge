"use client";
import { useState } from "react";
import { Key, Loader2, Zap } from "lucide-react";
import { activateLicense } from "@/lib/api";

interface Props {
  onActivated: (key: string, plan?: string) => void;
  inline?: boolean;
  freeMode?: boolean;  // renders as "Start Free" button on pricing card
}

const LEMON_URL = process.env.NEXT_PUBLIC_LEMON_CHECKOUT_URL || "#";

export default function LicenseGate({ onActivated, inline, freeMode }: Props) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const handleActivate = async () => {
    if (!key.trim()) return setError("Enter your license key");
    setError("");
    setLoading(true);
    try {
      const res = await activateLicense(key.trim());
      onActivated(key.trim(), res.plan || "pro");
    } catch (e: any) {
      setError(e.response?.data?.detail || "Invalid license key. Check and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Free plan CTA on pricing card
  if (freeMode) {
    return (
      <div className="space-y-3">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center justify-center gap-2 glass border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-semibold py-3.5 rounded-2xl text-sm transition-all"
          >
            Start for Free
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-white/40 text-center">Enter your free license key</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="CF-FREE-XXXXXX-..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors placeholder:text-white/20"
                onKeyDown={(e) => e.key === "Enter" && handleActivate()}
              />
              <button
                onClick={handleActivate}
                disabled={loading}
                className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl transition-all"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : "Go"}
              </button>
            </div>
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <p className="text-white/25 text-xs text-center">
              No account needed · Instant access
            </p>
          </div>
        )}
      </div>
    );
  }

  // Inline nav button
  if (inline) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="text-sm text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
        >
          <Key size={14} /> Activate License
        </button>
        {open && (
          <div className="absolute right-0 top-10 w-80 glass border border-white/10 rounded-2xl p-4 shadow-2xl z-50 space-y-3">
            <p className="text-sm font-semibold text-white/90">Enter your license key</p>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="CF-PRO-XXXXXX-XXXXXX-XXXXXX"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors placeholder:text-white/20"
              onKeyDown={(e) => e.key === "Enter" && handleActivate()}
              autoFocus
            />
            <button
              onClick={handleActivate}
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <><Key size={14} /> Activate</>}
            </button>
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <div className="border-t border-white/5 pt-2">
              <p className="text-white/30 text-xs text-center">
                Don't have a key?{" "}
                <a href={LEMON_URL} className="text-brand-400 hover:text-brand-300 underline">
                  Get Pro for $29 →
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Footer mode
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5"
      >
        <Key size={13} /> Already purchased? Activate license
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="CF-PRO-XXXXXX-XXXXXX-XXXXXX"
        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500 w-64 placeholder:text-white/20"
        onKeyDown={(e) => e.key === "Enter" && handleActivate()}
      />
      <button
        onClick={handleActivate}
        disabled={loading}
        className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm flex items-center gap-2"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : "Activate"}
      </button>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
