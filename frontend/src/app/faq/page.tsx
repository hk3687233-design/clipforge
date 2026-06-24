import type { Metadata } from "next";
import { Scissors, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ — ClipForge",
  description: "Frequently asked questions about ClipForge — pricing, features, refunds, and how it works.",
};

const faqs = [
  { q: "Does it work with any video?", a: "Yes — YouTube, TikTok, Instagram Reels, and direct MP4 uploads are all supported. Best results with product review videos that have chapter markers or timestamps in the description." },
  { q: "How accurate is the product detection?", a: "For YouTube videos with chapters: 100% accurate, instant. For videos with timestamps in description: very accurate. For others: Whisper AI transcription is used as fallback — still highly accurate." },
  { q: "Do I need any API keys or subscriptions?", a: "No. ClipForge handles everything server-side — just paste a URL or upload a video and you're done. No setup, no config, no hidden requirements." },
  { q: "What is the difference between Free and Pro?", a: "Free allows 3 exports/day, max 10-minute videos, max 5 clips. Pro is unlimited — unlimited videos, 100+ clips per video, ZIP download, affiliate link extraction, and priority processing." },
  { q: "How do I activate my license key?", a: "After purchase, check your email for the license key. Go to getclipforge.online/auth, sign in or create an account, then click 'Activate Key' and paste your key. Your account instantly upgrades to Pro." },
  { q: "Is this a one-time purchase?", a: "Yes. Pay $29 once, use forever. No monthly fees, no renewal, no surprises. Price increases after the launch period ends." },
  { q: "Can I get a refund?", a: "Yes — 7-day no-questions-asked refund via Gumroad. Just email support@getclipforge.online and we'll process it immediately." },
  { q: "What video formats are supported?", a: "MP4, MKV, WebM, and most common video formats. For URL-based processing, we support YouTube, TikTok, and Instagram Reels." },
  { q: "How long does processing take?", a: "Average 2 minutes for a 10-minute video. Longer videos take proportionally more time. You can queue multiple videos at once." },
  { q: "Is my data safe?", a: "Yes. Videos are processed temporarily and deleted within 24 hours. We don't store or share your content. See our Privacy Policy for full details." },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="orb w-96 h-96 bg-brand-600/20 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-20">
        <div className="flex items-center gap-3 mb-12">
          <a href="/" className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={18} /></a>
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Scissors size={14} className="text-white" />
            </div>
            <span className="font-bold text-lg">ClipForge</span>
          </a>
        </div>

        <div className="text-center mb-14">
          <p className="text-brand-400 text-xs font-bold tracking-widest uppercase mb-4">FAQ</p>
          <h1 className="text-3xl font-black">Frequently Asked Questions</h1>
          <p className="text-white/40 mt-4 text-sm">Everything you need to know about ClipForge.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="glass glass-hover rounded-2xl p-5 border border-white/6">
              <p className="font-bold text-white/90 text-sm mb-2">{faq.q}</p>
              <p className="text-white/45 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/30 text-sm mb-3">Still have questions?</p>
          <a href="/contact" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
