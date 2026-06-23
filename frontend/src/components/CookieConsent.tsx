"use client";
import { useState, useEffect } from "react";
import { Shield, X } from "lucide-react";

const CONSENT_KEY = "clipforge_cookie_consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setShow(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] p-4">
      <div className="max-w-xl mx-auto glass border border-white/10 rounded-2xl p-4 flex items-start gap-3">
        <Shield size={18} className="text-brand-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p className="text-white/70 text-xs leading-relaxed">
            We use essential cookies and local storage to keep you signed in and remember your preferences.
            No tracking cookies. See our{" "}
            <a href="/privacy" className="text-brand-400 hover:underline">Privacy Policy</a>.
          </p>
          <div className="flex items-center gap-2">
            <button onClick={accept}
              className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-all">
              Got it
            </button>
          </div>
        </div>
        <button onClick={accept} className="text-white/20 hover:text-white/50 shrink-0">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
