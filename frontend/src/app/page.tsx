"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import LicenseGate from "@/components/LicenseGate";
import {
  Scissors, CheckCircle2, Zap, Download, Shield, Play,
  Sparkles, ArrowRight, Star, X, Lock, RefreshCw, Clock,
  Film, Package, Link2, TrendingUp,
} from "lucide-react";

const LEMON_URL = process.env.NEXT_PUBLIC_LEMON_CHECKOUT_URL || "#";
const LICENSE_KEY = "clipforge_license_key";

export default function Home() {
  const router = useRouter();
  const [videoOpen, setVideoOpen] = useState(false);
  const [freeModal, setFreeModal] = useState(false);
  const [freeEmail, setFreeEmail] = useState("");
  const [freeLoading, setFreeLoading] = useState(false);
  const [freeError, setFreeError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [alreadyLicensed, setAlreadyLicensed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LICENSE_KEY);
    setAlreadyLicensed(!!saved);
  }, []);

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

  const handleActivated = (key: string, p: string = "pro") => {
    localStorage.setItem(LICENSE_KEY, key);
    localStorage.setItem("clipforge_plan", p);
    router.push("/tool");
  };

  const handleFreeSignup = async () => {
    if (!freeEmail || !freeEmail.includes("@")) {
      setFreeError("Please enter a valid email address");
      return;
    }
    setFreeLoading(true);
    setFreeError("");
    try {
      const r = await fetch(`${API}/api/license/free-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: freeEmail }),
      });
      const data = await r.json();
      if (r.ok && data.key) {
        handleActivated(data.key, "free");
        setFreeModal(false);
      } else {
        setFreeError(data.detail || "Something went wrong. Try again.");
      }
    } catch {
      setFreeError("Network error. Please try again.");
    }
    setFreeLoading(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setVideoOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* BG orbs */}
      <div className="orb w-[700px] h-[700px] bg-brand-700/20 -top-72 left-1/2 -translate-x-1/2" />
      <div className="orb w-96 h-96 bg-purple-900/20 top-1/2 -left-48" />
      <div className="orb w-96 h-96 bg-pink-900/10 top-1/3 -right-48" />

      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <nav className="relative z-20 flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <button onClick={handleLogoClick} className="flex items-center gap-2.5 select-none">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Scissors size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">ClipForge</span>
        </button>
        <div className="flex items-center gap-2 sm:gap-4">
          <a href="#how-it-works" className="text-sm text-white/40 hover:text-white transition-colors hidden md:block">How it works</a>
          <a href="#pricing" className="text-sm text-white/40 hover:text-white transition-colors hidden sm:block">Pricing</a>
          {alreadyLicensed ? (
            <a href="/tool" className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all glow-button">
              <Zap size={14} /> Open Tool
            </a>
          ) : (
            <>
              <LicenseGate onActivated={handleActivated} inline />
              <a href={LEMON_URL} className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl transition-all glow-button">
                <Zap size={14} /><span className="hidden sm:inline">Get Pro — </span>$29
              </a>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative z-10 text-center max-w-5xl mx-auto px-6 pt-14 pb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-brand-500/30 text-brand-400 text-xs font-semibold tracking-wide uppercase mb-8">
          <Sparkles size={12} /> AI-Powered Clip Extractor
        </div>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
          Turn any review video
          <br />
          <span className="gradient-text">into product clips</span>
          <br />
          automatically.
        </h1>
        <p className="text-white/50 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Paste any YouTube, TikTok, or Instagram URL. ClipForge detects every product mentioned,
          cuts individual clips — with affiliate buy links — ready to post in minutes.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <a href={LEMON_URL} className="w-full sm:w-auto flex items-center justify-center gap-3 bg-brand-600 hover:bg-brand-500 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all glow-button">
            <Zap size={20} /> Get Pro Lifetime — $29 <ArrowRight size={18} />
          </a>
          <button
            onClick={() => setVideoOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-3 glass border border-white/10 hover:border-brand-500/40 text-white font-semibold px-6 py-4 rounded-2xl text-base transition-all hover:bg-brand-500/10"
          >
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
              <Play size={14} className="text-white ml-0.5" fill="white" />
            </div>
            Watch Demo
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="line-through text-white/25 text-sm">$99</span>
          <span className="text-green-400 font-semibold text-sm">70% off — Launch price</span>
        </div>
        <p className="text-white/25 text-sm">One-time payment · No subscription · No hidden fees</p>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
          {[
            { icon: <Star size={14} className="text-yellow-400 fill-yellow-400" />, text: "4.9/5 from creators" },
            { icon: <Shield size={14} className="text-green-400" />, text: "Secure via Lemon Squeezy" },
            { icon: <Zap size={14} className="text-brand-400" />, text: "License delivered instantly" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-white/35 text-sm">{item.icon}{item.text}</div>
          ))}
        </div>
      </section>

      {/* ── DEMO VIDEO ─────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-16">
        <div
          className="relative glass rounded-3xl overflow-hidden cursor-pointer group glow-purple"
          onClick={() => setVideoOpen(true)}
        >
          <video
            className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            src="/demo.mp4"
            muted loop autoPlay playsInline
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
            <div className="w-20 h-20 rounded-full bg-brand-600/90 border-2 border-white/20 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
              <Play size={32} className="text-white ml-2" fill="white" />
            </div>
          </div>
          <div className="absolute bottom-4 left-4 glass px-4 py-2 rounded-xl border border-white/10">
            <p className="text-white/70 text-xs font-medium">🎬 Real product review → 100+ clips in under 2 minutes</p>
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: "10x", label: "Faster than manual editing", icon: <TrendingUp size={16} className="text-brand-400" /> },
            { value: "< 2 min", label: "Average processing time", icon: <Clock size={16} className="text-purple-400" /> },
            { value: "100+", label: "Products detected per video", icon: <Film size={16} className="text-pink-400" /> },
            { value: "∞", label: "Videos with lifetime Pro", icon: <Zap size={16} className="text-yellow-400" /> },
          ].map((s, i) => (
            <div key={i} className="glass glass-hover rounded-2xl p-5 text-center flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-1">{s.icon}</div>
              <p className="text-3xl font-black gradient-text-purple">{s.value}</p>
              <p className="text-white/40 text-xs leading-relaxed">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────── */}
      <section id="how-it-works" className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <p className="text-brand-400 text-xs font-semibold tracking-widest uppercase mb-3">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold">From URL to clips in 3 steps</h2>
          <p className="text-white/35 mt-3 text-sm max-w-md mx-auto">No editing skills needed. No timeline scrubbing. Just paste and download.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { icon: <Link2 size={22} />, step: "01", title: "Paste any video URL", body: "YouTube, TikTok, Instagram Reels, or upload directly. ClipForge downloads and processes in the background — no install needed." },
            { icon: <Sparkles size={22} />, step: "02", title: "AI detects every product", body: "Advanced AI reads chapters, timestamps, and descriptions. Finds every product automatically — instant and highly accurate, even in 45-minute videos." },
            { icon: <Download size={22} />, step: "03", title: "Download all your clips", body: "Get individual high-quality MP4s or download everything in one ZIP. Each clip comes with its affiliate buy link, ready to post." },
          ].map((s) => (
            <div key={s.step} className="glass glass-hover rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-4 right-4 text-5xl font-black text-white/[0.04] select-none group-hover:text-white/[0.07] transition-colors">{s.step}</div>
              <div className="w-11 h-11 rounded-xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-5">{s.icon}</div>
              <h3 className="font-bold text-base mb-2 text-white/90">{s.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Connector arrow on desktop */}
        <div className="hidden sm:flex items-center justify-center gap-2 mt-6 text-white/20 text-xs">
          <span>Paste URL</span>
          <ArrowRight size={12} />
          <span>AI processes</span>
          <ArrowRight size={12} />
          <span>Download clips</span>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <p className="text-brand-400 text-xs font-semibold tracking-widest uppercase mb-3">Features</p>
          <h2 className="text-3xl sm:text-4xl font-bold">Everything a creator needs</h2>
          <p className="text-white/35 mt-3 text-sm">Built specifically for product reviewers, affiliate marketers, and short-form creators.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: <Sparkles size={18} />, title: "AI Product Detection", body: "Whisper AI + chapter parsing detects 100+ products per video automatically — no manual timestamps.", color: "text-brand-400 bg-brand-500/10 border-brand-500/20" },
            { icon: <Film size={18} />, title: "High-Quality MP4 Clips", body: "Original video quality preserved. No re-encoding artifacts. Each clip is a clean, shareable file.", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
            { icon: <Package size={18} />, title: "One-Click ZIP Download", body: "Grab all clips in a single ZIP file. Perfect for batch uploading to Reels, Shorts, or TikTok.", color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
            { icon: <Link2 size={18} />, title: "Affiliate Link Extraction", body: "Automatically pulls Amazon & affiliate links from descriptions. Every clip ships with its buy link.", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
            { icon: <Zap size={18} />, title: "Lightning Fast Processing", body: "Average 2-minute turnaround. Background processing means you can queue multiple videos at once.", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
            { icon: <Shield size={18} />, title: "No Subscription Ever", body: "Pay $29 once, use forever. Lifetime access with free updates. No monthly bills, no surprises.", color: "text-green-400 bg-green-500/10 border-green-500/20" },
          ].map((f, i) => (
            <div key={i} className="glass glass-hover rounded-2xl p-5 border border-white/6">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-4 ${f.color}`}>{f.icon}</div>
              <h3 className="font-bold text-sm text-white/90 mb-1.5">{f.title}</h3>
              <p className="text-white/40 text-xs leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── REVIEWS ────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p className="text-brand-400 text-xs font-semibold tracking-widest uppercase mb-3">Testimonials</p>
          <h2 className="text-3xl sm:text-4xl font-bold">Creators love ClipForge</h2>
          <div className="flex items-center justify-center gap-1 mt-4">
            {[...Array(5)].map((_, i) => <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />)}
            <span className="text-white/40 text-sm ml-2">4.9 / 5 average rating</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              name: "Marcus T.",
              handle: "@marcustechreviews",
              avatar: "MT",
              badge: "Pro user",
              review: "I used to spend 3+ hours cutting product clips from my reviews. ClipForge does it in literally 2 minutes. This is insane value for $29.",
            },
            {
              name: "Priya S.",
              handle: "@priyaunboxes",
              avatar: "PS",
              badge: "Pro user",
              review: "Detected 100+ products from my 45-minute tech haul video. Every single one was accurate. The affiliate links saved me another hour of work.",
            },
            {
              name: "Jake R.",
              handle: "@jakereviews",
              avatar: "JR",
              badge: "Pro user",
              review: "Bought it on a whim and it's already paid for itself 10x over. ZIP download of all clips in one click is a game changer for Reels repurposing.",
            },
          ].map((r, i) => (
            <div key={i} className="glass glass-hover rounded-2xl p-6 flex flex-col gap-4 border border-white/6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, j) => <Star key={j} size={12} className="text-yellow-400 fill-yellow-400" />)}
              </div>
              <p className="text-white/65 text-sm leading-relaxed flex-1">"{r.review}"</p>
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-600/25 border border-brand-500/30 flex items-center justify-center text-brand-400 text-xs font-bold shrink-0">
                    {r.avatar}
                  </div>
                  <div>
                    <p className="text-white/80 text-xs font-semibold">{r.name}</p>
                    <p className="text-white/30 text-xs">{r.handle}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-full">{r.badge}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────── */}
      <section id="pricing" className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <p className="text-brand-400 text-xs font-semibold tracking-widest uppercase mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold">Simple, honest pricing</h2>
          <p className="text-white/40 mt-3 text-sm">Start free. Upgrade when you're ready. No sneaky fees.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="glass rounded-3xl p-8 border border-white/8 flex flex-col">
            <div className="mb-6">
              <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-3">Free</p>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-4xl font-black text-white">$0</span>
              </div>
              <p className="text-white/30 text-sm">Forever free · No credit card</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                { t: "3 video exports per day", ok: true },
                { t: "Max 5 clips per video", ok: true },
                { t: "YouTube & TikTok support", ok: true },
                { t: "Standard quality MP4", ok: true },
                { t: "ZIP download", ok: false },
                { t: "Affiliate link extraction", ok: false },
                { t: "Unlimited clips", ok: false },
              ].map((f, i) => (
                <li key={i} className={`flex items-center gap-3 text-sm ${f.ok ? "text-white/70" : "text-white/25"}`}>
                  <CheckCircle2 size={15} className={f.ok ? "text-green-400 shrink-0" : "text-white/15 shrink-0"} />
                  {f.t}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setFreeModal(true)}
              className="flex items-center justify-center gap-3 w-full bg-white/8 hover:bg-white/12 border border-white/10 text-white font-semibold py-3.5 rounded-2xl text-sm transition-all"
            >
              Start for Free — Enter your email
            </button>
          </div>

          {/* Pro Plan */}
          <div className="relative glass rounded-3xl p-8 border border-brand-500/30 glow-purple flex flex-col">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-purple-500 text-white text-xs font-black px-5 py-1.5 rounded-full tracking-wide shadow-lg whitespace-nowrap">
              ⭐ MOST POPULAR
            </div>
            <div className="mb-6 pt-2">
              <p className="text-brand-400 text-sm font-semibold uppercase tracking-widest mb-3">Pro Lifetime</p>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-white/30 line-through text-xl">$99</span>
                <span className="text-4xl font-black text-white">$29</span>
              </div>
              <p className="text-white/30 text-sm">one-time · lifetime · no renewal</p>
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
                  <CheckCircle2 size={15} className="text-green-400 shrink-0" />{f}
                </li>
              ))}
            </ul>
            <a href={LEMON_URL} className="flex items-center justify-center gap-3 w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 rounded-2xl text-base transition-all glow-button">
              <Zap size={18} /> Get Lifetime Access — $29
            </a>
            <div className="flex items-center justify-center gap-3 mt-4 text-white/25 text-xs">
              <Shield size={11} /> Secure · Lemon Squeezy · Instant delivery
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p className="text-brand-400 text-xs font-semibold tracking-widest uppercase mb-3">FAQ</p>
          <h2 className="text-3xl font-bold">Frequently asked</h2>
        </div>
        <div className="space-y-3">
          {[
            { q: "Does it work with any video?", a: "Yes — YouTube, TikTok, Instagram Reels, and direct MP4 uploads are all supported. Best results with product review videos that have chapter markers or timestamps in the description." },
            { q: "How accurate is the product detection?", a: "For YouTube videos with chapters: 100% accurate, instant. For videos with timestamps in description: very accurate. For others: Whisper AI transcription is used as fallback — still highly accurate." },
            { q: "Do I need any API keys or subscriptions?", a: "No. ClipForge handles everything server-side — just paste a URL or upload a video and you're done. No setup, no config, no hidden requirements." },
            { q: "What is the difference between Free and Pro?", a: "Free allows 3 videos/day with max 5 clips each. Pro is unlimited — unlimited videos, 100+ clips per video, ZIP download, affiliate link extraction, and priority processing." },
            { q: "Is this a one-time purchase?", a: "Yes. Pay $29 once, use forever. No monthly fees, no renewal, no surprises. Price increases after the launch period ends." },
            { q: "Can I get a refund?", a: "Yes — 7-day no-questions-asked refund via Lemon Squeezy. Just email us and we'll process it immediately." },
          ].map((faq, i) => (
            <div key={i} className="glass glass-hover rounded-2xl p-5 border border-white/6">
              <p className="font-semibold text-white/90 text-sm mb-2">{faq.q}</p>
              <p className="text-white/45 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA BANNER ───────────────────────────────────── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <div className="glass rounded-3xl border border-brand-500/20 glow-purple p-10 sm:p-14 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold tracking-wide uppercase mb-6">
            <Sparkles size={12} /> Limited launch pricing
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            Stop editing manually.<br />
            <span className="gradient-text">Start ClipForging.</span>
          </h2>
          <p className="text-white/45 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            One video. 100+ clips. Done in 2 minutes. For $29 — once, forever.
          </p>
          <p className="text-brand-400/60 text-xs mb-6 font-mono tracking-wider">getclipforge.online</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={LEMON_URL} className="w-full sm:w-auto flex items-center justify-center gap-3 bg-brand-600 hover:bg-brand-500 text-white font-bold px-10 py-4 rounded-2xl text-lg transition-all glow-button">
              <Zap size={20} /> Get Lifetime Access — $29
            </a>
            <button onClick={() => setFreeModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors py-4 px-6">
              Or start free →
            </button>
          </div>
          <p className="text-white/20 text-xs mt-6">7-day money back guarantee · No subscription · Instant delivery</p>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center">
              <Scissors size={12} className="text-white" />
            </div>
            <span className="font-bold text-sm">ClipForge</span>
            <span className="text-white/25 text-sm">· Built for content creators</span>
          </div>
          <div className="flex items-center gap-4 text-white/25 text-xs">
            <span>© 2026 ClipForge</span>
            <span>·</span>
            <a href="mailto:support@getclipforge.online" className="hover:text-white/50 transition-colors">support@getclipforge.online</a>
          </div>
          <LicenseGate onActivated={handleActivated} />
        </div>
      </footer>

      {/* ── FREE PLAN EMAIL MODAL ───────────────────────────────── */}
      {freeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setFreeModal(false)}>
          <div className="relative w-full max-w-md glass rounded-3xl p-8 border border-white/10"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setFreeModal(false)}
              className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
              <X size={18} />
            </button>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
                <Zap size={24} className="text-brand-400" />
              </div>
              <h2 className="text-xl font-black mb-1">Start Free Plan</h2>
              <p className="text-white/40 text-sm">Enter your email to get instant free access.</p>
            </div>
            <div className="space-y-3">
              <input
                type="email"
                value={freeEmail}
                onChange={e => setFreeEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleFreeSignup()}
                placeholder="your@gmail.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-500/50"
                autoFocus
              />
              {freeError && <p className="text-red-400 text-xs">{freeError}</p>}
              <button
                onClick={handleFreeSignup}
                disabled={freeLoading}
                className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                {freeLoading ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                {freeLoading ? "Setting up access..." : "Get Free Access →"}
              </button>
              <p className="text-white/25 text-xs text-center">No credit card · Instant access · 5 clips per video</p>
            </div>
          </div>
        </div>
      )}

      {/* ── VIDEO MODAL ────────────────────────────────────────── */}
      {videoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setVideoOpen(false)}
        >
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setVideoOpen(false)}
              className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors flex items-center gap-2 text-sm"
            >
              <X size={18} /> Close (ESC)
            </button>
            <video
              ref={videoRef}
              src="/demo.mp4"
              controls
              autoPlay
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
