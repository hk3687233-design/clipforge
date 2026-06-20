import { Scissors } from "lucide-react";

export const metadata = { title: "Terms of Service — ClipForge" };

export default function TermsOfService() {
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
          <h1 className="text-4xl font-black mb-3">Terms of Service</h1>
          <p className="text-white/35 text-sm">Last updated: June 21, 2026</p>
        </div>

        <div className="space-y-10 text-sm text-white/55 leading-relaxed">

          <Section title="1. Acceptance of Terms">
            <p>By accessing or using ClipForge ("Service", "we", "us", or "our") at getclipforge.online, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, you may not use the Service.</p>
          </Section>

          <Section title="2. Description of Service">
            <p>ClipForge is a web-based AI tool that analyzes video content (YouTube, TikTok, Instagram, or direct upload) to detect product mentions and automatically extract short video clips. It is intended for content creators, affiliate marketers, and short-form video producers for personal and commercial use.</p>
          </Section>

          <Section title="3. Account Registration">
            <p>To use the Service you must create an account with a valid email address and password, or via Google Sign-In. You are responsible for maintaining the security of your account credentials. You agree to notify us immediately at <a href="mailto:support@getclipforge.online" className="text-brand-400 hover:text-brand-300 underline">support@getclipforge.online</a> if you suspect unauthorized access to your account.</p>
          </Section>

          <Section title="4. License Grant">
            <p>Upon purchase of a Pro lifetime plan, we grant you a non-exclusive, non-transferable, non-sublicensable license to access and use the Service for your own personal and commercial content creation purposes.</p>
            <p className="mt-3">This license does not permit you to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Resell, sublicense, or transfer your license key to another person or entity</li>
              <li>Share your account credentials with others (each license is for one account)</li>
              <li>Use the Service to build a competing product or service</li>
              <li>Reverse-engineer, decompile, or extract proprietary components of the Service</li>
            </ul>
          </Section>

          <Section title="5. Acceptable Use">
            <p>You agree to use the Service only in compliance with all applicable laws and platform terms. You must not use the Service to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Process video content for which you do not hold the necessary rights, permissions, or licences</li>
              <li>Extract or distribute copyrighted material in a manner that violates copyright law</li>
              <li>Circumvent, disable, or interfere with security features of the Service</li>
              <li>Automate or script access in a manner that overloads or disrupts the Service</li>
              <li>Engage in any fraudulent, harmful, or illegal activity</li>
            </ul>
            <p className="mt-4">You are solely responsible for ensuring your use complies with the terms of service of any third-party platform (YouTube, TikTok, Instagram, etc.) whose content you process.</p>
          </Section>

          <Section title="6. Free Plan Limits">
            <p>Free accounts are subject to the following usage limits, which may be updated at our discretion:</p>
            <div className="glass rounded-xl p-5 border border-white/6 mt-4 space-y-2">
              {[
                "3 video exports per day",
                "Maximum 5 clips per video",
                "Maximum 10-minute video length",
                "YouTube and TikTok only",
              ].map(l => (
                <p key={l} className="text-white/55 text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />{l}
                </p>
              ))}
            </div>
          </Section>

          <Section title="7. Payments & Billing">
            <p>All payments are processed securely by Lemon Squeezy. By completing a purchase you agree to their terms and conditions. All prices are in USD. The Pro plan is a one-time lifetime purchase — there are no recurring charges.</p>
            <p className="mt-3">We reserve the right to change pricing at any time for new customers. Existing lifetime purchasers are not affected by price increases.</p>
          </Section>

          <Section title="8. Refunds">
            <p>We offer a 7-day money-back guarantee. See our <a href="/refund" className="text-brand-400 hover:text-brand-300 underline">Refund Policy</a> for full details.</p>
          </Section>

          <Section title="9. Intellectual Property">
            <p>The Service, including its design, code, branding, and AI models, is owned by ClipForge and protected by applicable intellectual property laws. Nothing in these Terms transfers any ownership rights to you.</p>
            <p className="mt-3">You retain full ownership of any video content you upload or process. We claim no rights over your content.</p>
          </Section>

          <Section title="10. Service Availability">
            <p>We strive to maintain high availability but do not guarantee uninterrupted access to the Service. We may perform maintenance, updates, or experience downtime outside of our control. We are not liable for losses resulting from service interruptions.</p>
          </Section>

          <Section title="11. Disclaimer of Warranties">
            <p>The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that all videos will be processed successfully or that product detection will be 100% accurate.</p>
          </Section>

          <Section title="12. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law, ClipForge shall not be liable for any indirect, incidental, special, exemplary, or consequential damages (including loss of profits, data, or business interruption) arising from your use of the Service, even if advised of the possibility of such damages.</p>
            <p className="mt-3">Our total liability to you for any claim arising from these Terms or your use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
          </Section>

          <Section title="13. Termination">
            <p>We reserve the right to suspend or terminate your account at our sole discretion if you violate these Terms, engage in fraudulent activity, or abuse the Service. Upon termination, your license key will be deactivated and access to Pro features will be revoked.</p>
          </Section>

          <Section title="14. Changes to Terms">
            <p>We may revise these Terms at any time by updating this page. Material changes will be communicated via email or an in-app notice. Continued use of the Service after changes take effect constitutes your acceptance of the revised Terms.</p>
          </Section>

          <Section title="15. Governing Law">
            <p>These Terms shall be governed by and construed in accordance with applicable international law. Any disputes shall be resolved through good-faith negotiation or, failing that, through binding arbitration.</p>
          </Section>

          <Section title="16. Contact">
            <div className="glass rounded-xl p-5 border border-white/6 mt-2">
              <p className="text-white/80 font-bold text-sm">ClipForge Support</p>
              <p className="text-white/45 text-sm mt-1">Email: <a href="mailto:support@getclipforge.online" className="text-brand-400 hover:text-brand-300 underline">support@getclipforge.online</a></p>
              <p className="text-white/45 text-sm">Website: <span className="text-brand-400">getclipforge.online</span></p>
            </div>
          </Section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/22 text-xs">© 2026 ClipForge. All rights reserved.</p>
          <div className="flex items-center gap-4 text-white/25 text-xs">
            <a href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</a>
            <span>·</span>
            <a href="/refund" className="hover:text-white/60 transition-colors">Refund Policy</a>
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
