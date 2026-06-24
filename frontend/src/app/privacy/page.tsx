import { Scissors } from "lucide-react";

export const metadata = { title: "Privacy Policy — ClipForge", description: "How ClipForge collects, uses, and protects your data. GDPR compliant." };

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl font-black mb-3">Privacy Policy</h1>
          <p className="text-white/35 text-sm">Last updated: June 21, 2026</p>
        </div>

        <div className="space-y-10 text-sm text-white/55 leading-relaxed">

          <Section title="1. Overview">
            <p>ClipForge ("we", "us", or "our") operates getclipforge.online and the ClipForge application (the "Service"). This Privacy Policy explains what information we collect, how we use it, and your rights regarding your personal data.</p>
            <p>By using our Service, you agree to the collection and use of information as described in this policy.</p>
          </Section>

          <Section title="2. Information We Collect">
            <Sub>Account Information</Sub>
            <p>When you create an account we collect:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>First name and last name</li>
              <li>Email address</li>
              <li>Password (stored as a secure cryptographic hash — we never store plain-text passwords)</li>
              <li>Google profile data (name, email, profile picture) if you sign in with Google</li>
            </ul>

            <Sub>License & Payment Information</Sub>
            <p>We collect your license key and the plan type (Free or Pro) linked to your account. Payment processing is handled entirely by Gumroad — we never receive or store your credit card, bank, or billing details.</p>

            <Sub>Usage Data</Sub>
            <p>We collect limited technical data to operate the service: number of daily video exports, date of last export (for rate-limiting), and account creation timestamp.</p>

            <Sub>Video Content</Sub>
            <p>Videos are processed server-side and temporarily stored only for clip extraction. Processed clips are stored on Cloudflare R2 and are linked to your job only long enough to enable download. We do not retain video content beyond the active processing window.</p>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul className="list-disc pl-5 space-y-2">
              <li>To create and manage your account</li>
              <li>To process video jobs and deliver clip downloads</li>
              <li>To enforce plan limits (Free vs. Pro)</li>
              <li>To send your license key by email after purchase</li>
              <li>To respond to support requests</li>
              <li>To detect and prevent abuse or unauthorized access</li>
            </ul>
            <p className="mt-4">We do not sell, rent, or trade your personal information to third parties for marketing purposes.</p>
          </Section>

          <Section title="4. Third-Party Services">
            <p>ClipForge relies on the following third-party services, each with their own privacy policies:</p>
            <div className="mt-4 space-y-3">
              {[
                { name: "Gumroad", role: "Payment processing and license management" },
                { name: "Google OAuth", role: "Optional Google Sign-In authentication" },
                { name: "Cloudflare R2", role: "Temporary clip storage and delivery" },
                { name: "Railway", role: "Backend hosting and PostgreSQL database" },
                { name: "Vercel", role: "Frontend hosting and CDN" },
              ].map(t => (
                <div key={t.name} className="glass rounded-xl p-4 border border-white/6 flex items-center justify-between gap-4">
                  <p className="text-white/80 font-semibold text-sm">{t.name}</p>
                  <p className="text-white/35 text-xs">{t.role}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="5. Data Retention">
            <p>We retain your account data for as long as your account is active. If you request account deletion, your personal data is permanently removed from our database within 30 days. Processed video files are deleted automatically within 24 hours of job completion.</p>
          </Section>

          <Section title="6. Cookies & Local Storage">
            <p>ClipForge stores your authentication token in your browser's local storage to keep you signed in between sessions. We do not use third-party tracking cookies or advertising cookies.</p>
          </Section>

          <Section title="7. Your Rights">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white/70">Access</strong> — request a copy of the data we hold about you</li>
              <li><strong className="text-white/70">Correction</strong> — request correction of inaccurate data</li>
              <li><strong className="text-white/70">Deletion</strong> — request permanent deletion of your account and data</li>
              <li><strong className="text-white/70">Portability</strong> — receive your data in a structured, machine-readable format</li>
            </ul>
            <p className="mt-4">To exercise any of these rights, email <a href="mailto:support@getclipforge.online" className="text-brand-400 hover:text-brand-300 underline">support@getclipforge.online</a>.</p>
          </Section>

          <Section title="8. Security">
            <p>We implement industry-standard security including HTTPS encryption in transit, password hashing using PBKDF2-SHA256 with 200,000 iterations, timing-safe comparison, and JWT-based session tokens. No method of transmission over the internet is 100% secure, but we take commercially reasonable precautions.</p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>ClipForge is not directed to individuals under the age of 13. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us immediately and we will delete it.</p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by updating the "Last updated" date at the top of this page. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="11. Contact">
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
            <a href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</a>
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

function Sub({ children }: { children: React.ReactNode }) {
  return <p className="text-white/70 font-semibold mt-5 mb-1.5">{children}</p>;
}
