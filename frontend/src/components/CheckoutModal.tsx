"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Zap, MessageCircle, CreditCard } from "lucide-react";

const GUMROAD_URL = process.env.NEXT_PUBLIC_GUMROAD_CHECKOUT_URL || "#";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function openCheckoutModal() {
  window.dispatchEvent(new CustomEvent("open-checkout"));
}

interface Props {
  open?: boolean;
  onClose?: () => void;
}

export function CheckoutModal({ open: openProp, onClose: onCloseProp }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [waNumber, setWaNumber] = useState("923116116679");

  const isOpen = openProp !== undefined ? openProp : internalOpen;
  const close = useCallback(() => {
    if (onCloseProp) onCloseProp();
    setInternalOpen(false);
  }, [onCloseProp]);

  useEffect(() => {
    const handler = () => setInternalOpen(true);
    window.addEventListener("open-checkout", handler);
    return () => window.removeEventListener("open-checkout", handler);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetch(`${API_BASE}/api/config`)
      .then(r => r.json())
      .then(d => setWaNumber(d.whatsapp_number || "923116116679"))
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    "Hi! I want to buy ClipForge Pro (PKR 5,000). Please share payment details."
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={close}>
      <div className="w-full max-w-sm glass border border-white/10 rounded-3xl p-7 space-y-5 animate-[fadeInUp_0.2s_ease-out]"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-brand-400" />
            <h2 className="font-bold text-white text-base">Get ClipForge Pro</h2>
          </div>
          <button onClick={close} className="text-white/30 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <p className="text-white/40 text-xs leading-relaxed">
          Choose your preferred currency. Both give you lifetime Pro access.
        </p>

        <div className="space-y-3">
          {/* USD — Gumroad */}
          <a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-brand-500/30 transition-all group cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center shrink-0 group-hover:bg-brand-500/25 transition-colors">
              <CreditCard size={20} className="text-brand-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Pay in USD</p>
              <p className="text-white/30 text-xs mt-0.5">Visa, Mastercard, PayPal via Gumroad</p>
            </div>
          </a>

          {/* PKR — WhatsApp */}
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-[#25D366]/30 transition-all group cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-[#25D366]/15 border border-[#25D366]/20 flex items-center justify-center shrink-0 group-hover:bg-[#25D366]/25 transition-colors">
              <MessageCircle size={20} className="text-[#25D366]" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Pay in PKR</p>
              <p className="text-white/30 text-xs mt-0.5">JazzCash, EasyPaisa, Bank Transfer via WhatsApp</p>
            </div>
          </a>
        </div>

        <p className="text-white/15 text-[10px] text-center">
          One-time payment · Lifetime access · 7-day money-back guarantee
        </p>
      </div>
    </div>
  );
}
