"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const colors = {
    success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    error: "text-red-400 bg-red-500/10 border-red-500/20",
    info: "text-brand-400 bg-brand-500/10 border-brand-500/20",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => {
          const Icon = icons[t.type];
          return (
            <div key={t.id}
              className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-xl text-sm animate-[fadeInUp_0.2s_ease-out] ${colors[t.type]}`}>
              <Icon size={16} className="shrink-0 mt-0.5" />
              <span className="flex-1 text-white/80">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="text-white/20 hover:text-white/50 shrink-0">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
