import { Scissors, CheckCircle2, Mail, Clock, Shield } from "lucide-react";

export const metadata = { title: "Refund Policy — ClipForge", description: "ClipForge 7-day money-back guarantee. No questions asked refund policy." };

export default function RefundPolicy() {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="orb w-[600px] h-[600px] bg-brand-700/10 -top-64 left-1/2 -translate-x-1/2" />

      <nav className="relative z-20 flex items-center justify-between max-w-4xl mx-auto px-6 py-5 border-b border-white/5">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-700 flex items-center justify-center">
            <Scissors size={15} className="text-white" />
          </div>
          <span className="font-black text-base">ClipForge</span>
        </a>
        <a href="/" className="text-white/35 hover:text-white/75 text-sm transition-colors">← Back to Home</a>
      </nav>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <p className="text-brand-400 text-xs font-bold tracking-widest uppercase mb-3">Legal</p>
          <h1 className="text-4xl font-black mb-3">Refund Policy</h1>
          <p className="text-white/35 text-sm">Last updated: June 21, 2026</p>
        </div>

        {/* Highlight card */}
        <div className="rounded-2xl p-px bg-gradient-to-br from-emerald-500/40 to-teal-600/20 mb-12">
          <div className="rounded-[calc(1rem-1px)] bg-[#0a0e0c] p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <Shield size={22} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-emerald-400 font-black text-lg">7-Day Money-Back Guarantee</p>
              <p className="text-white/50 text-sm mt-1 leading-relaxed">Not happy? Get a full refund within 7 days of purchase. No questions asked. No hoops to jump through.</p>
            </div>
          </div>
        </div>

        <div className="space-y-10 text-sm text-white/55 leading-relaxed">

          <Section title="Our Guarantee">
            <p>We stand behind ClipForge with a <strong className="text-white/80">7-day no-questions-asked refund guarantee</strong>. If the tool doesn't work for your use case or you're not satisfied for any reason, we will issue a full refund — no explanations needed.</p>
            <p>We believe in the product and we want you to feel confident buying it. Your satisfaction is more important to us than keeping $29.</p>
          </Section>

          <Section title="How to Request a Refund">
            <p>Requesting a refund is simple:</p>
            <div className="space-y-3 mt-4">
              {[
                { step: "01", icon: <Mail size={16} />, title: "Email us", body: "Send a refund request to support@getclipforge.online from the email address you used to purchase." },
                { step: "02", icon: <Clock size={16} />, title: "We process it fast", body: "We'll initiate your refund within 24 hours of receiving your request. No lengthy review process." },
                { step: "03", icon: <CheckCircle2 size={16} />, title: "Refund arrives", body: "Funds are returned to your original payment method within 3–5 business days via Lemon Squeezy." },
              ].map(s => (
                <div key={s.step} className="glass rounded-xl p-4 border border-white/6 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500/20 to-purple-600/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">{s.icon}</div>
                  <div>
                    <p className="text-white/80 font-semibold text-sm">{s.title}</p>
                    <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="glass rounded-xl p-4 border border-brand-500/20 bg-brand-500/5 mt-5">
              <p className="text-white/70 text-sm font-semibold mb-1">Refund email address</p>
              <a href="mailto:support@getclipforge.online" className="text-brand-400 hover:text-brand-300 text-sm underline">support@getclipforge.online</a>
              <p className="text-white/35 text-xs mt-1">Please include your order number or the email used for purchase to speed up processing.</p>
            </div>
          </Section>

          <Section title="Eligibility">
            <p>To be eligible for a refund:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Your refund request must be submitted within <strong className="text-white/70">7 calendar days</strong> of your original purchase date</li>
              <li>The request must come from the email address associated with the purchase</li>
            </ul>
            <p className="mt-4">We do not require you to explain why you want a refund — but feedback is always appreciated and helps us improve.</p>
          </Section>

          <Section title="After a Refund">
            <p>Once a refund is processed:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Your license key will be deactivated</li>
              <li>Your account will revert to the Free plan</li>
              <li>Any clips previously downloaded remain yours to keep</li>
            </ul>
          </Section>

          <Section title="Exceptions">
            <p>We reserve the right to deny refund requests that show clear evidence of abuse (e.g., purchasing, downloading all clips, and immediately requesting a refund repeatedly). In such cases, we may ban the account from future purchases.</p>
          </Section>

          <Section title="Contact">
            <div className="glass rounded-xl p-5 border border-white/6 mt-2">
              <p className="text-white/80 font-bold text-sm">ClipForge Support</p>
              <p className="text-white/45 text-sm mt-1">Email: <a href="mailto:support@getclipforge.online" className="text-brand-400 hover:text-brand-300 underline">support@getclipforge.online</a></p>
              <p className="text-white/40 text-xs mt-2">We typically respond within a few hours during business days.</p>
            </div>
          </Section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/22 text-xs">© 2026 ClipForge. All rights reserved.</p>
          <div className="flex items-center gap-4 text-white/25 text-xs">
            <a href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</a>
            <span>·</span>
            <a href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</a>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-white/90 text-lg font-bold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
