export const metadata = { title: "Refund Policy — ClipForge" };

export default function Refund() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 text-white/80 space-y-6">
      <h1 className="text-2xl font-bold text-white">Refund Policy</h1>
      <p className="text-white/40 text-sm">Last updated: June 2025</p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">30-Day Money-Back Guarantee</h2>
        <p>We offer a full refund within 30 days of purchase, no questions asked. If ClipForge does not meet your needs, contact us and we will process your refund promptly.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">How to Request a Refund</h2>
        <p>Email <a href="mailto:support@getclipforge.online" className="text-violet-400 underline">support@getclipforge.online</a> with your order number and we will issue a full refund within 3–5 business days.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">After a Refund</h2>
        <p>Your license key will be deactivated upon refund. You will no longer have access to Pro features.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Contact</h2>
        <p><a href="mailto:support@getclipforge.online" className="text-violet-400 underline">support@getclipforge.online</a></p>
      </section>
    </main>
  );
}
