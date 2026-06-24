"use client";
import { useState, useEffect } from "react";
import { Scissors, CheckCircle2, Zap, Shield, ArrowLeft } from "lucide-react";
import { CheckoutModal } from "@/components/CheckoutModal";

export default function PricingPage() {
  const [showCheckout, setShowCheckout] = useState(false);
  const [seatsLeft, setSeatsLeft] = useState<number | null>(null);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${api}/api/config`).then(r => r.json()).then(d => setSeatsLeft(d.seats_remaining ?? null)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="orb w-96 h-96 bg-brand-600/20 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="flex items-center gap-3 mb-12">
          <a href="/" className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={18} /></a>
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Scissors size={14} className="text-white" />
            </div>
            <span className="font-bold text-lg">ClipForge</span>
          </a>
        </div>

        <div className="text-center mb-16">
          <p className="text-brand-400 text-xs font-bold tracking-widest uppercase mb-4">Pricing</p>
          <h1 className="text-3xl sm:text-4xl font-black">Simple, honest pricing</h1>
          <p className="text-white/40 mt-4 text-base">Start free. Upgrade when you're ready. No sneaky fees.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <div className="glass rounded-3xl p-8 border border-white/8 flex flex-col">
            <div className="mb-8">
              <p className="text-white/35 text-xs font-bold uppercase tracking-widest mb-4">Free Plan</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-black text-white">$0</span>
              </div>
              <p className="text-white/30 text-sm">Forever free · No credit card</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                { t: "3 video exports per day", ok: true },
                { t: "Max 5 clips per video", ok: true },
                { t: "Max 10-minute videos", ok: true },
                { t: "YouTube & TikTok support", ok: true },
                { t: "Standard quality MP4", ok: true },
                { t: "ZIP download", ok: false },
                { t: "Unlimited clips", ok: false },
              ].map((f, i) => (
                <li key={i} className={`flex items-center gap-3 text-sm ${f.ok ? "text-white/70" : "text-white/20"}`}>
                  <CheckCircle2 size={15} className={`shrink-0 ${f.ok ? "text-emerald-400" : "text-white/15"}`} />
                  {f.t}
                </li>
              ))}
            </ul>
            <a href="/auth" className="flex items-center justify-center gap-2 w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/60 hover:text-white font-bold py-4 rounded-2xl text-sm transition-all">
              Get Free Access
            </a>
          </div>

          {/* Pro */}
          <div className="relative rounded-3xl p-px bg-gradient-to-b from-brand-500/60 via-purple-600/40 to-transparent shadow-2xl shadow-brand-500/20">
            <div className="rounded-[calc(1.5rem-1px)] bg-[#0a0a12] p-8 flex flex-col h-full">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-purple-600 text-white text-xs font-black px-6 py-2 rounded-full tracking-wide shadow-lg shadow-brand-500/30">
                MOST POPULAR
              </div>
              <div className="mb-6 pt-2">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-brand-400 text-xs font-bold uppercase tracking-widest">Pro Lifetime</p>
                  <span className="text-[10px] font-black text-green-400 bg-green-500/10 border border-green-500/25 px-2.5 py-1 rounded-full">50% OFF</span>
                </div>
                <div className="flex items-end gap-3 mb-1">
                  <span className="text-white/25 line-through text-xl self-end pb-1">$58</span>
                  <span className="text-5xl font-black text-white">$29</span>
                </div>
                <p className="text-white/30 text-sm">one-time · lifetime · no renewal</p>
                {seatsLeft !== null && seatsLeft <= 50 && (
                  <p className="text-red-400/80 text-xs mt-1.5 font-bold animate-pulse">
                    Only {seatsLeft} seat{seatsLeft !== 1 ? "s" : ""} left
                  </p>
                )}
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {["Unlimited video processing", "100+ clips per video", "YouTube · TikTok · Instagram", "Original quality MP4 export", "Download all clips as ZIP", "Affiliate link extraction", "Priority processing", "Free updates forever", "Priority support"].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-white/80">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => setShowCheckout(true)} className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-black py-4 rounded-2xl text-base transition-all shadow-xl shadow-brand-500/30">
                <Zap size={18} /> Get Lifetime Access
              </button>
              <div className="flex items-center justify-center gap-2 mt-4 text-white/25 text-xs">
                <Shield size={11} /> 7-day money-back guarantee
              </div>
            </div>
          </div>
        </div>
      </div>
      <CheckoutModal open={showCheckout} onClose={() => setShowCheckout(false)} />
    </div>
  );
}
