import type { Metadata } from "next";
import { Scissors, ArrowLeft, Mail, Clock, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Support — ClipForge",
  description: "Get help with ClipForge — email support, response times, and refund information.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="orb w-96 h-96 bg-brand-600/20 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-20">
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
          <p className="text-brand-400 text-xs font-bold tracking-widest uppercase mb-4">Support</p>
          <h1 className="text-3xl font-black">Contact Us</h1>
          <p className="text-white/40 mt-4 text-sm">We're here to help. Reach out anytime.</p>
        </div>

        <div className="space-y-4">
          <a href="mailto:support@getclipforge.online"
            className="glass glass-hover border border-white/10 rounded-2xl p-6 flex items-start gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center shrink-0">
              <Mail size={20} className="text-brand-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm mb-1 group-hover:text-brand-400 transition-colors">Email Support</p>
              <p className="text-brand-400 text-sm font-medium mb-2">support@getclipforge.online</p>
              <p className="text-white/35 text-xs leading-relaxed">Best for account issues, license key problems, feature requests, or bug reports.</p>
            </div>
          </a>

          <div className="glass border border-white/10 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Clock size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm mb-1">Response Time</p>
              <p className="text-white/40 text-xs leading-relaxed">We typically respond within 24 hours on business days. Pro users get priority support.</p>
            </div>
          </div>

          <div className="glass border border-white/10 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Shield size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm mb-1">Refunds</p>
              <p className="text-white/40 text-xs leading-relaxed">
                7-day no-questions-asked refund policy. Email us and we'll process it immediately. See our{" "}
                <a href="/refund" className="text-brand-400 hover:underline">Refund Policy</a> for details.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-white/20 text-xs">
          <p>You can also check our <a href="/faq" className="text-brand-400/60 hover:text-brand-400">FAQ</a> for common questions.</p>
        </div>
      </div>
    </div>
  );
}
