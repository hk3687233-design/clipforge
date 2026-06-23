import { Scissors } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="orb w-96 h-96 bg-brand-600/20 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <a href="/" className="flex items-center gap-2.5 mb-10 hover:opacity-80 transition-opacity">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
          <Scissors size={18} className="text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight">ClipForge</span>
      </a>

      <div className="glass border border-white/10 rounded-3xl p-10 max-w-md w-full text-center space-y-5">
        <p className="text-6xl font-black text-brand-500">404</p>
        <div className="space-y-2">
          <h1 className="font-bold text-white text-xl">Page Not Found</h1>
          <p className="text-white/40 text-sm leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <a href="/"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm">
          Go Home
        </a>
      </div>
    </div>
  );
}
