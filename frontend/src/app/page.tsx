"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Scissors, CheckCircle2, Zap, Download, Shield, Play,
  Sparkles, ArrowRight, Star, X, Lock,
  Film, Package, Link2, TrendingUp, Clock, User, ChevronRight,
  Twitter, Youtube, Mail,
} from "lucide-react";

const LEMON_URL = process.env.NEXT_PUBLIC_LEMON_CHECKOUT_URL || "#";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [videoOpen, setVideoOpen] = useState(false);
  const [barDismissed, setBarDismissed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Secret: 5 clicks on logo → admin
  const logoClicksRef = useRef<number[]>([]);
  const handleLogoClick = () => {
    const now = Date.now();
    logoClicksRef.current = [...logoClicksRef.current, now].filter(t => now - t < 10000);
    if (logoClicksRef.current.length >= 5) {
      logoClicksRef.current = [];
      router.push("/admin");
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setVideoOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Layered background orbs */}
      <div className="orb w-[1000px] h-[1000px] bg-brand-700/12 -top-[28rem] left-1/2 -translate-x-1/2" />
      <div className="orb w-[600px] h-[600px] bg-violet-900/15 top-1/3 -left-72" />
      <div className="orb w-[600px] h-[600px] bg-pink-900/10 top-1/4 -right-72" />
      <div className="orb w-[500px] h-[500px] bg-brand-900/10 bottom-1/4 left-1/4" />

      {/* Subtle grid overlay */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: `linear-gradient(rgba(168,85,247,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.06) 1px, transparent 1px)`,
        backgroundSize: "64px 64px",
      }} />

      {/* ── ANNOUNCEMENT BAR ───────────────────────────────────── */}
      {!barDismissed && (
        <div className="relative z-30 w-full bg-gradient-to-r from-[#110a1e] via-[#1a0d2e] to-[#110a1e] border-b border-brand-500/20">
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2 sm:gap-4 pr-10">
            <span className="text-base shrink-0">🔥</span>
            <p className="text-white/75 text-xs sm:text-sm font-medium leading-tight text-center">
              <span className="text-white font-bold">Launch Special — 50% OFF</span>
              <span className="text-white/50 mx-1.5 hidden sm:inline">·</span>
              <span className="text-white/55 hidden sm:inline">Price doubles to $58 after launch period ends</span>
            </p>
            <a href={LEMON_URL}
              className="shrink-0 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white text-xs font-black px-3 py-1.5 rounded-lg transition-all shadow-md shadow-brand-500/30 whitespace-nowrap">
              Claim $29 →
            </a>
          </div>
          <button
            onClick={() => setBarDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <nav className="relative z-20 flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <button onClick={handleLogoClick} className="flex items-center gap-2.5 select-none group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-700 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:shadow-brand-500/50 transition-all">
            <Scissors size={17} className="text-white" />
          </div>
          <span className="font-black text-lg tracking-tight">ClipForge</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-5">
          <a href="#how-it-works" className="text-sm text-white/40 hover:text-white/80 transition-colors hidden md:block font-medium">How it works</a>
          <a href="#pricing" className="text-sm text-white/40 hover:text-white/80 transition-colors hidden sm:block font-medium">Pricing</a>

          {!loading && (
            user ? (
              <a href="/tool"
                className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40">
                <Zap size={14} /> Open Tool
              </a>
            ) : (
              <>
                <a href="/auth"
                  className="text-sm text-white/40 hover:text-white/80 transition-colors hidden sm:flex items-center gap-1.5 font-medium">
                  <User size={13} /> Sign In
                </a>
                <a href={LEMON_URL}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40">
                  <Zap size={14} /><span className="hidden sm:inline">Get Pro — </span>$29
                </a>
              </>
            )
          )}
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative z-10 text-center max-w-5xl mx-auto px-6 pt-16 pb-20">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-brand-500/8 border border-brand-500/25 text-brand-400 text-xs font-bold tracking-widest uppercase mb-8 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse shrink-0" />
          AI-Powered Clip Extractor
          <ChevronRight size={11} className="opacity-60" />
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
          Turn any review video
          <br />
          <span className="gradient-text">into product clips</span>
          <br />
          automatically.
        </h1>

        <p className="text-white/50 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          Paste any YouTube, TikTok, or Instagram URL. ClipForge detects every product mentioned,
          cuts individual clips — with affiliate buy links — ready to post in minutes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <a href={LEMON_URL}
            className="w-full sm:w-auto relative flex items-center justify-center gap-3 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-black px-8 py-4 rounded-2xl text-lg transition-all shadow-2xl shadow-brand-500/30 hover:shadow-brand-500/50 group">
            <Zap size={20} className="shrink-0" /> Get Pro Lifetime — $29
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform shrink-0" />
          </a>
          <a href="/auth"
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-brand-500/40 text-white font-semibold px-6 py-4 rounded-2xl text-base transition-all">
            Start Free — No Card Needed
          </a>
        </div>

        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="line-through text-white/25 text-sm">$58</span>
          <span className="w-1 h-1 rounded-full bg-green-400/50" />
          <span className="text-green-400 font-semibold text-sm">50% off — Launch price · doubles soon</span>
        </div>
        <p className="text-white/25 text-sm">One-time payment · No subscription · No hidden fees</p>

        <div className="flex items-center justify-center gap-6 mt-7 flex-wrap">
          {[
            { icon: <Star size={13} className="text-yellow-400 fill-yellow-400" />, text: "4.9/5 from creators" },
            { icon: <Shield size={13} className="text-emerald-400" />, text: "Secure via Lemon Squeezy" },
            { icon: <Zap size={13} className="text-brand-400" />, text: "License delivered instantly" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-white/30 text-sm font-medium">{item.icon}{item.text}</div>
          ))}
        </div>
      </section>

      {/* ── DEMO VIDEO ─────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="rounded-3xl p-px bg-gradient-to-br from-brand-500/50 via-purple-600/25 to-pink-600/20 shadow-2xl shadow-brand-500/15">
          <div
            className="relative rounded-[calc(1.5rem-1px)] overflow-hidden cursor-pointer group bg-[#08080d]"
            onClick={() => setVideoOpen(true)}
          >
            <video
              className="w-full aspect-video object-cover opacity-75 group-hover:opacity-95 transition-opacity duration-500"
              src="/demo.mp4"
              muted loop autoPlay playsInline
            />
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-black/15 to-transparent group-hover:from-black/35 transition-all duration-300">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 border border-white/25 flex items-center justify-center shadow-2xl shadow-brand-500/50 group-hover:scale-110 group-hover:shadow-brand-500/70 transition-all duration-300">
                <Play size={30} className="text-white ml-2" fill="white" />
              </div>
            </div>
            <div className="absolute bottom-5 left-5 bg-black/65 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
              <p className="text-white/80 text-xs font-semibold">🎬 Real product review → 100+ clips in under 2 minutes</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-28">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: "10x", label: "Faster than manual editing", icon: <TrendingUp size={18} className="text-brand-400" />, border: "border-brand-500/20", from: "from-brand-500/10" },
            { value: "< 2 min", label: "Average processing time", icon: <Clock size={18} className="text-violet-400" />, border: "border-violet-500/20", from: "from-violet-500/10" },
            { value: "100+", label: "Products detected per video", icon: <Film size={18} className="text-pink-400" />, border: "border-pink-500/20", from: "from-pink-500/10" },
            { value: "∞", label: "Videos with lifetime Pro", icon: <Zap size={18} className="text-yellow-400" />, border: "border-yellow-500/20", from: "from-yellow-500/10" },
          ].map((s, i) => (
            <div key={i} className={`glass glass-hover rounded-2xl p-5 text-center flex flex-col items-center gap-2 border ${s.border} bg-gradient-to-b ${s.from} to-transparent`}>
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-1">{s.icon}</div>
              <p className="text-3xl font-black gradient-text-purple">{s.value}</p>
              <p className="text-white/40 text-xs leading-relaxed">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────── */}
      <section id="how-it-works" className="relative z-10 max-w-5xl mx-auto px-6 pb-28">
        <div className="text-center mb-16">
          <p className="text-brand-400 text-xs font-bold tracking-widest uppercase mb-4">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-black">From URL to clips in 3 steps</h2>
          <p className="text-white/35 mt-4 text-base max-w-md mx-auto">No editing skills needed. No timeline scrubbing. Just paste and download.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 relative">
          <div className="hidden sm:block absolute top-10 left-[calc(33.33%+1.5rem)] right-[calc(33.33%+1.5rem)] h-px bg-gradient-to-r from-brand-500/40 via-purple-500/40 to-pink-500/40" />
          {[
            { icon: <Link2 size={22} />, step: "01", title: "Paste any video URL", body: "YouTube, TikTok, Instagram Reels, or upload directly. ClipForge downloads and processes in the background — no install needed.", gradient: "from-brand-500 to-brand-600" },
            { icon: <Sparkles size={22} />, step: "02", title: "AI detects every product", body: "Advanced AI reads chapters, timestamps, and descriptions. Finds every product automatically — instant and highly accurate, even in 45-minute videos.", gradient: "from-violet-500 to-purple-600" },
            { icon: <Download size={22} />, step: "03", title: "Download all your clips", body: "Get individual high-quality MP4s or download everything in one ZIP. Each clip comes with its affiliate buy link, ready to post.", gradient: "from-pink-500 to-rose-600" },
          ].map((s) => (
            <div key={s.step} className="glass glass-hover rounded-2xl p-6 relative overflow-hidden group border border-white/6">
              <div className="absolute top-3 right-4 text-6xl font-black text-white/[0.035] select-none group-hover:text-white/[0.07] transition-colors">{s.step}</div>
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white mb-5 shadow-lg`}>{s.icon}</div>
              <h3 className="font-bold text-[15px] mb-3 text-white/90">{s.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="hidden sm:flex items-center justify-center gap-2 mt-6 text-white/20 text-xs">
          <span>Paste URL</span><ArrowRight size={12} />
          <span>AI processes</span><ArrowRight size={12} />
          <span>Download clips</span>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-28">
        <div className="text-center mb-16">
          <p className="text-brand-400 text-xs font-bold tracking-widest uppercase mb-4">Features</p>
          <h2 className="text-3xl sm:text-4xl font-black">Everything a creator needs</h2>
          <p className="text-white/35 mt-4 text-sm max-w-lg mx-auto">Built specifically for product reviewers, affiliate marketers, and short-form creators.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: <Sparkles size={20} />, title: "AI Product Detection", body: "Whisper AI + chapter parsing detects 100+ products per video automatically — no manual timestamps.", iconCls: "text-brand-400", border: "border-brand-500/20", bg: "from-brand-500/8" },
            { icon: <Film size={20} />, title: "High-Quality MP4 Clips", body: "Original video quality preserved. No re-encoding artifacts. Each clip is a clean, shareable file.", iconCls: "text-violet-400", border: "border-violet-500/20", bg: "from-violet-500/8" },
            { icon: <Package size={20} />, title: "One-Click ZIP Download", body: "Grab all clips in a single ZIP file. Perfect for batch uploading to Reels, Shorts, or TikTok.", iconCls: "text-pink-400", border: "border-pink-500/20", bg: "from-pink-500/8" },
            { icon: <Link2 size={20} />, title: "Affiliate Link Extraction", body: "Automatically pulls Amazon & affiliate links from descriptions. Every clip ships with its buy link.", iconCls: "text-orange-400", border: "border-orange-500/20", bg: "from-orange-500/8" },
            { icon: <Zap size={20} />, title: "Lightning Fast Processing", body: "Average 2-minute turnaround. Background processing means you can queue multiple videos at once.", iconCls: "text-yellow-400", border: "border-yellow-500/20", bg: "from-yellow-500/8" },
            { icon: <Shield size={20} />, title: "No Subscription Ever", body: "Pay $29 once, use forever. Lifetime access with free updates. No monthly bills, no surprises.", iconCls: "text-emerald-400", border: "border-emerald-500/20", bg: "from-emerald-500/8" },
          ].map((f, i) => (
            <div key={i} className={`glass glass-hover rounded-2xl p-5 border ${f.border} bg-gradient-to-b ${f.bg} to-transparent`}>
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 ${f.iconCls}`}>{f.icon}</div>
              <h3 className="font-bold text-sm text-white/90 mb-2">{f.title}</h3>
              <p className="text-white/40 text-xs leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── REVIEWS ────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-28">
        <div className="text-center mb-14">
          <p className="text-brand-400 text-xs font-bold tracking-widest uppercase mb-4">Testimonials</p>
          <h2 className="text-3xl sm:text-4xl font-black">Creators love ClipForge</h2>
          <div className="flex items-center justify-center gap-1 mt-4">
            {[...Array(5)].map((_, i) => <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />)}
            <span className="text-white/40 text-sm ml-2">4.9 / 5 average rating</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { name: "Marcus T.", handle: "@marcustechreviews", avatar: "MT", badge: "Pro", review: "I used to spend 3+ hours cutting product clips from my reviews. ClipForge does it in literally 2 minutes. This is insane value for $29.", grad: "from-brand-500 to-purple-600" },
            { name: "Priya S.", handle: "@priyaunboxes", avatar: "PS", badge: "Pro", review: "Detected 100+ products from my 45-minute tech haul video. Every single one was accurate. The affiliate links saved me another hour of work.", grad: "from-violet-500 to-pink-600" },
            { name: "Jake R.", handle: "@jakereviews", avatar: "JR", badge: "Pro", review: "Bought it on a whim and it's already paid for itself 10x over. ZIP download of all clips in one click is a game changer for Reels repurposing.", grad: "from-pink-500 to-orange-500" },
            { name: "Alex W.", handle: "@alexwgadgets", avatar: "AW", badge: "Pro", review: "Processed 30 videos in one weekend. My affiliate income literally tripled in the first month. Nothing else comes close to this for $29.", grad: "from-orange-500 to-red-500" },
            { name: "Sophie M.", handle: "@sophielifestyle", avatar: "SM", badge: "Pro", review: "I was skeptical about AI accuracy but it found every single product in my haul videos — even things I forgot I mentioned. Unreal.", grad: "from-emerald-500 to-teal-600" },
            { name: "Tyler K.", handle: "@tylerunboxing", avatar: "TK", badge: "Pro", review: "I go from a 1-hour review to 60 TikTok-ready clips in about 5 minutes flat. This is the most ROI-positive tool I've ever bought for my channel.", grad: "from-sky-500 to-blue-600" },
          ].map((r, i) => (
            <div key={i} className="rounded-2xl p-px bg-gradient-to-b from-white/12 to-white/[0.03]">
              <div className="rounded-[calc(1rem-1px)] p-6 flex flex-col gap-4 bg-[#0e0e16] h-full">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, j) => <Star key={j} size={13} className="text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-white/65 text-sm leading-relaxed flex-1">"{r.review}"</p>
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${r.grad} flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg`}>{r.avatar}</div>
                    <div>
                      <p className="text-white/85 text-xs font-bold">{r.name}</p>
                      <p className="text-white/30 text-xs">{r.handle}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-full">{r.badge}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────── */}
      <section id="pricing" className="relative z-10 max-w-5xl mx-auto px-6 pb-28">
        <div className="text-center mb-16">
          <p className="text-brand-400 text-xs font-bold tracking-widest uppercase mb-4">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-black">Simple, honest pricing</h2>
          <p className="text-white/40 mt-4 text-base">Start free. Upgrade when you're ready. No sneaky fees.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free Plan */}
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
            <a href="/auth"
              className="flex items-center justify-center gap-2 w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-brand-500/30 text-white/60 hover:text-white font-bold py-4 rounded-2xl text-sm transition-all">
              Get Free Access →
            </a>
          </div>

          {/* Pro Plan */}
          <div className="relative rounded-3xl p-px bg-gradient-to-b from-brand-500/60 via-purple-600/40 to-transparent shadow-2xl shadow-brand-500/20">
            <div className="rounded-[calc(1.5rem-1px)] bg-[#0a0a12] p-8 flex flex-col h-full">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-purple-600 text-white text-xs font-black px-6 py-2 rounded-full tracking-wide shadow-lg shadow-brand-500/30 whitespace-nowrap">
                ⭐ MOST POPULAR
              </div>
              <div className="mb-6 pt-2">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-brand-400 text-xs font-bold uppercase tracking-widest">Pro Lifetime</p>
                  <span className="text-[10px] font-black text-green-400 bg-green-500/10 border border-green-500/25 px-2.5 py-1 rounded-full tracking-wide">50% OFF</span>
                </div>
                <div className="flex items-end gap-3 mb-1">
                  <span className="text-white/25 line-through text-xl self-end pb-1">$58</span>
                  <span className="text-5xl font-black text-white">$29</span>
                </div>
                <p className="text-white/30 text-sm">one-time · lifetime · no renewal</p>
                <p className="text-orange-400/70 text-xs mt-1.5 font-medium">⏳ Price doubles to $58 after launch</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Unlimited video processing",
                  "100+ clips per video (unlimited)",
                  "YouTube · TikTok · Instagram",
                  "Original quality MP4 export",
                  "Download all clips as ZIP",
                  "Affiliate link extraction",
                  "Priority processing",
                  "Free updates forever",
                  "Priority support",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-white/80">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <a href={LEMON_URL}
                className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-black py-4 rounded-2xl text-base transition-all shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50">
                <Zap size={18} /> Get Lifetime Access — $29
              </a>
              <div className="flex items-center justify-center gap-2 mt-4 text-white/25 text-xs">
                <Shield size={11} /> Secure · Lemon Squeezy · Instant delivery
              </div>
            </div>
          </div>
        </div>

        {/* After purchase guide */}
        <div className="mt-8 max-w-3xl mx-auto glass border border-white/6 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600/25 to-purple-600/15 border border-brand-500/20 flex items-center justify-center shrink-0">
            <Lock size={16} className="text-brand-400" />
          </div>
          <div className="flex-1">
            <p className="text-white/75 text-sm font-bold mb-1">Already purchased?</p>
            <p className="text-white/35 text-xs leading-relaxed">
              After payment, your license key is emailed instantly. Sign in at{" "}
              <a href="/auth" className="text-brand-400 hover:text-brand-300 underline">getclipforge.online/auth</a>
              {" "}→ Activate Key tab → paste your key → instant Pro access.
            </p>
          </div>
          <a href="/auth"
            className="shrink-0 flex items-center gap-2 bg-brand-600/20 hover:bg-brand-600/35 border border-brand-500/30 text-brand-400 text-xs font-bold px-4 py-2.5 rounded-xl transition-all">
            Activate Key →
          </a>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-28">
        <div className="text-center mb-14">
          <p className="text-brand-400 text-xs font-bold tracking-widest uppercase mb-4">FAQ</p>
          <h2 className="text-3xl font-black">Frequently asked</h2>
        </div>
        <div className="space-y-3">
          {[
            { q: "Does it work with any video?", a: "Yes — YouTube, TikTok, Instagram Reels, and direct MP4 uploads are all supported. Best results with product review videos that have chapter markers or timestamps in the description." },
            { q: "How accurate is the product detection?", a: "For YouTube videos with chapters: 100% accurate, instant. For videos with timestamps in description: very accurate. For others: Whisper AI transcription is used as fallback — still highly accurate." },
            { q: "Do I need any API keys or subscriptions?", a: "No. ClipForge handles everything server-side — just paste a URL or upload a video and you're done. No setup, no config, no hidden requirements." },
            { q: "What is the difference between Free and Pro?", a: "Free allows 3 exports/day, max 10-minute videos, max 5 clips. Pro is unlimited — unlimited videos, 100+ clips per video, ZIP download, affiliate link extraction, and priority processing." },
            { q: "How do I activate my license key?", a: "After purchase, check your email for the license key. Go to getclipforge.online/auth, sign in or create an account, then click 'Activate Key' and paste your key. Your account instantly upgrades to Pro." },
            { q: "Is this a one-time purchase?", a: "Yes. Pay $29 once, use forever. No monthly fees, no renewal, no surprises. Price increases after the launch period ends." },
            { q: "Can I get a refund?", a: "Yes — 7-day no-questions-asked refund via Lemon Squeezy. Just email support@getclipforge.online and we'll process it immediately." },
          ].map((faq, i) => (
            <div key={i} className="glass glass-hover rounded-2xl p-5 border border-white/6 group">
              <p className="font-bold text-white/90 text-sm mb-2 group-hover:text-white transition-colors">{faq.q}</p>
              <p className="text-white/45 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA BANNER ───────────────────────────────────── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-28">
        <div className="rounded-3xl p-px bg-gradient-to-br from-brand-500/55 via-purple-600/30 to-pink-600/20 overflow-hidden shadow-2xl shadow-brand-500/15">
          <div className="rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-[#0b0b14] to-[#080810] p-10 sm:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[500px] h-[300px] rounded-full bg-brand-500/8 blur-3xl" />
            </div>
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/25 text-brand-400 text-xs font-bold tracking-widest uppercase mb-6">
                <Sparkles size={12} /> Limited launch pricing
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-5">
                Stop editing manually.<br />
                <span className="gradient-text">Start ClipForging.</span>
              </h2>
              <p className="text-white/45 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
                One video. 100+ clips. Done in 2 minutes. For $29 — once, forever.
              </p>
              <p className="text-brand-400/45 text-xs mb-7 font-mono tracking-widest">getclipforge.online</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href={LEMON_URL}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-black px-10 py-4 rounded-2xl text-lg transition-all shadow-2xl shadow-brand-500/30 hover:shadow-brand-500/50">
                  <Zap size={20} /> Get Lifetime Access — $29
                </a>
                <a href="/auth"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-brand-500/30 text-white/60 hover:text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all">
                  Start Free →
                </a>
              </div>
              <p className="text-white/20 text-xs mt-7">7-day money back guarantee · No subscription · Instant delivery</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-14">
          {/* Top grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
            {/* Brand column */}
            <div className="col-span-2 sm:col-span-1 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-md shadow-brand-500/20">
                  <Scissors size={14} className="text-white" />
                </div>
                <span className="font-black text-base">ClipForge</span>
              </div>
              <p className="text-white/35 text-xs leading-relaxed max-w-[180px]">
                AI-powered clip extractor for product reviewers and affiliate creators.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <a href="mailto:support@getclipforge.online"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-brand-500/20 border border-white/8 hover:border-brand-500/30 flex items-center justify-center text-white/35 hover:text-brand-400 transition-all">
                  <Mail size={13} />
                </a>
                <a href="https://twitter.com/clipforge" target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-brand-500/20 border border-white/8 hover:border-brand-500/30 flex items-center justify-center text-white/35 hover:text-brand-400 transition-all">
                  <Twitter size={13} />
                </a>
                <a href="https://youtube.com/@clipforge" target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-brand-500/20 border border-white/8 hover:border-brand-500/30 flex items-center justify-center text-white/35 hover:text-brand-400 transition-all">
                  <Youtube size={13} />
                </a>
              </div>
            </div>

            {/* Product column */}
            <div className="space-y-3">
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Product</p>
              {[
                { label: "Features", href: "#features" },
                { label: "How it Works", href: "#how-it-works" },
                { label: "Pricing", href: "/pricing" },
                { label: "Open Tool", href: "/tool" },
                { label: "Sign In", href: "/auth" },
              ].map(l => (
                <a key={l.label} href={l.href} className="block text-white/35 hover:text-white/75 text-sm transition-colors">{l.label}</a>
              ))}
            </div>

            {/* Legal column */}
            <div className="space-y-3">
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Legal</p>
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Refund Policy", href: "/refund" },
              ].map(l => (
                <a key={l.label} href={l.href} className="block text-white/35 hover:text-white/75 text-sm transition-colors">{l.label}</a>
              ))}
            </div>

            {/* Support column */}
            <div className="space-y-3">
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Support</p>
              {[
                { label: "FAQ", href: "/faq" },
                { label: "Contact Us", href: "/contact" },
                { label: "Activate License", href: "/auth" },
                { label: "Get Pro — $29", href: LEMON_URL },
              ].map(l => (
                <a key={l.label} href={l.href} className="block text-white/35 hover:text-white/75 text-sm transition-colors">{l.label}</a>
              ))}
            </div>
          </div>

          {/* Legal notice */}
          <div className="rounded-2xl border border-white/6 bg-white/[0.02] px-5 py-4 text-white/22 text-xs leading-relaxed text-center mb-8">
            <strong className="text-white/38">Legal Notice:</strong> ClipForge is a neutral processing tool. Users are solely responsible for ensuring they have the necessary rights, licences, or permissions to process any video content. ClipForge does not host, store, or distribute third-party copyrighted material. Use of this tool must comply with the terms of service of the source platform and all applicable copyright laws.
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5">
            <p className="text-white/22 text-xs">© 2026 ClipForge. All rights reserved.</p>
            <div className="flex items-center gap-1 text-white/20 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="ml-1">All systems operational</span>
            </div>
            <p className="text-white/22 text-xs">Built for content creators worldwide.</p>
          </div>
        </div>
      </footer>

      {/* ── VIDEO MODAL ────────────────────────────────────────── */}
      {videoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4"
          onClick={() => setVideoOpen(false)}>
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setVideoOpen(false)}
              className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
              <X size={18} /> Close (ESC)
            </button>
            <video ref={videoRef} src="/demo.mp4" controls autoPlay className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
