"use client";
import { useEffect, useState } from "react";
import { getJob, getClipDownloadUrl, getZipDownloadUrl, Job } from "@/lib/api";
import { Download, CheckCircle2, Loader2, AlertCircle, Package, Sparkles, Film, ExternalLink, Lock, Zap } from "lucide-react";

const LEMON_URL = process.env.NEXT_PUBLIC_LEMON_CHECKOUT_URL || "#";
const FREE_CLIP_LIMIT = 5;

const STATUS_CONFIG: Record<string, { label: string; detail: string; color: string; step: number }> = {
  pending:     { label: "Queued",                 detail: "Waiting to start...",                          color: "text-yellow-400", step: 0 },
  downloading: { label: "Downloading",            detail: "Fetching video from URL...",                   color: "text-blue-400",   step: 1 },
  analyzing:   { label: "AI Analyzing",           detail: "Detecting products & segments...",             color: "text-brand-400",  step: 2 },
  extracting:  { label: "Extracting Clips",       detail: "Cutting and encoding videos...",               color: "text-purple-400", step: 3 },
  done:        { label: "Complete!",              detail: "Your clips are ready to download.",             color: "text-green-400",  step: 4 },
  failed:      { label: "Failed",                 detail: "Something went wrong.",                        color: "text-red-400",    step: -1 },
};

const STEPS = ["Downloading", "AI Analyzing", "Extracting Clips"];
const ACTIVE = new Set(["pending", "downloading", "analyzing", "extracting"]);

export default function JobPoller({ jobId, onReset, plan = "pro" }: { jobId: string; onReset: () => void; plan?: "free" | "pro" }) {
  const [job, setJob] = useState<Job | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Elapsed timer — shows seconds ticking so user knows it's alive
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      while (!cancelled) {
        try {
          const data = await getJob(jobId);
          if (!cancelled) setJob(data);
          if (!ACTIVE.has(data.status)) break;
        } catch {}
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    poll();
    return () => { cancelled = true; };
  }, [jobId]);

  const cfg = job ? STATUS_CONFIG[job.status] : STATUS_CONFIG.pending;
  const currentStep = cfg.step;

  return (
    <div className="w-full space-y-6">
      {/* Status card */}
      <div className="glass rounded-2xl border border-white/8 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className={`flex items-center gap-2 font-bold text-base ${cfg.color}`}>
              {job?.status === "done" ? (
                <CheckCircle2 size={18} />
              ) : job?.status === "failed" ? (
                <AlertCircle size={18} />
              ) : (
                <Loader2 size={18} className="animate-spin" />
              )}
              {cfg.label}
            </div>
            <p className="text-white/35 text-xs mt-1">{cfg.detail}</p>
          </div>
          <div className="text-right shrink-0">
            {ACTIVE.has(job?.status ?? "") && (
              <div className="text-white/30 text-xs font-mono tabular-nums">
                {Math.floor(elapsed / 60).toString().padStart(2,"0")}:{(elapsed % 60).toString().padStart(2,"0")}
              </div>
            )}
            {job?.status === "analyzing" && (
              <div className="flex items-center gap-1.5 text-brand-400 text-xs bg-brand-500/10 px-2 py-1 rounded-full border border-brand-500/20 mt-1">
                <Sparkles size={11} /> ~15 sec
              </div>
            )}
          </div>
        </div>

        {/* Progress steps */}
        {job && job.status !== "failed" && (
          <div className="space-y-2">
            {STEPS.map((step, i) => {
              const isDone = currentStep > i + 1;
              const isActive = currentStep === i + 1;
              return (
                <div key={step} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    isDone ? "bg-green-500 border-green-500" :
                    isActive ? "border-brand-400 bg-brand-400/20" :
                    "border-white/15 bg-transparent"
                  }`}>
                    {isDone ? (
                      <CheckCircle2 size={12} className="text-white" />
                    ) : isActive ? (
                      <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${isDone ? "text-white/60" : isActive ? "text-white/90" : "text-white/25"}`}>{step}</span>
                      {isDone && <span className="text-xs text-green-400">Done</span>}
                      {isActive && <span className="text-xs text-brand-400 animate-pulse">In progress...</span>}
                    </div>
                    {isActive && (
                      <div className="mt-1.5 h-0.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full shimmer" style={{ width: "60%" }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Error */}
      {job?.status === "failed" && (
        <div className="glass rounded-2xl border border-red-500/20 bg-red-950/20 p-5 text-red-300 text-sm leading-relaxed">
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{job.error || "An unexpected error occurred. Please try again."}</span>
          </div>
        </div>
      )}

      {/* No products */}
      {job?.status === "done" && job.products.length === 0 && (
        <div className="glass rounded-2xl border border-white/8 p-8 text-center">
          <Film size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/50 font-medium">No products detected</p>
          <p className="text-white/30 text-sm mt-1">Try a product review or unboxing video for best results.</p>
        </div>
      )}

      {/* Results */}
      {job?.status === "done" && job.products.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
            <div>
              <h2 className="font-bold text-base text-white/90">
                {job.products.length} Product{job.products.length !== 1 ? "s" : ""} Found
              </h2>
              <p className="text-white/35 text-xs mt-0.5">
                {plan === "free" ? `Free plan: showing first ${FREE_CLIP_LIMIT} clips` : "High quality MP4 · Ready to download"}
              </p>
            </div>
            {plan === "pro" ? (
              <a
                href={getZipDownloadUrl(jobId)}
                className="flex items-center gap-2 glass border border-white/10 hover:border-brand-500/40 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all hover:bg-brand-500/10"
              >
                <Package size={14} /> Download All (ZIP)
              </a>
            ) : (
              <a href={LEMON_URL} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all">
                <Zap size={12} /> Upgrade — $29
              </a>
            )}
          </div>

          <div className="space-y-2.5">
            {job.products.map((p, i) => {
              const locked = plan === "free" && i >= FREE_CLIP_LIMIT;
              return (
                <div key={i} className={`glass rounded-2xl border p-3 sm:p-4 flex items-center gap-2 sm:gap-4 ${locked ? "border-white/3 opacity-50" : "glass-hover border-white/6"}`}>
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl border flex items-center justify-center font-bold text-xs ${
                    locked ? "bg-white/5 border-white/10 text-white/20" : "bg-brand-600/15 border-brand-500/20 text-brand-400"
                  }`}>
                    {locked ? <Lock size={14} /> : String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${locked ? "text-white/30" : "text-white/90"}`}>{p.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-white/35">
                        {formatTime(p.start)} – {formatTime(p.end)}
                      </span>
                      <span className="text-xs text-white/20">·</span>
                      <span className="text-xs text-white/35">{(p.end - p.start).toFixed(1)}s</span>
                    </div>
                    {p.error && <p className="text-xs text-red-400 mt-1">{p.error}</p>}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {locked ? (
                      <a href={LEMON_URL} className="flex items-center gap-1.5 bg-brand-600/20 border border-brand-500/30 text-brand-400 text-xs font-bold px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl transition-all hover:bg-brand-600/30">
                        <Lock size={11} /> Pro
                      </a>
                    ) : (
                      <>
                        {p.affiliate_url && (
                          <a
                            href={p.affiliate_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-400 text-xs font-bold px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl transition-all"
                          >
                            <ExternalLink size={12} /> Buy
                          </a>
                        )}
                        {(p.clip_url || p.clip_filename) && !p.error && (
                          <a
                            href={p.clip_url ?? getClipDownloadUrl(jobId, p.clip_filename!)}
                            download={p.clip_filename}
                            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all"
                          >
                            <Download size={13} /> Save
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {plan === "free" && job.products.length > FREE_CLIP_LIMIT && (
            <div className="glass rounded-2xl border border-brand-500/20 p-5 text-center">
              <p className="text-white/60 text-sm font-semibold mb-2">
                🔒 {job.products.length - FREE_CLIP_LIMIT} more clips locked
              </p>
              <p className="text-white/35 text-xs mb-4">Upgrade to Pro to download all {job.products.length} clips + ZIP + affiliate links</p>
              <a href={LEMON_URL} className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all">
                <Zap size={14} /> Upgrade to Pro — $29 lifetime
              </a>
            </div>
          )}
        </div>
      )}

      {/* Reset */}
      {(job?.status === "done" || job?.status === "failed") && (
        <div className="text-center pt-2">
          <button onClick={onReset} className="text-sm text-white/30 hover:text-white/60 transition-colors underline underline-offset-4">
            Process another video
          </button>
        </div>
      )}
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
