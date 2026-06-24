"use client";
import { useEffect, useState } from "react";
import { getJob, getClipDownloadUrl, getZipDownloadUrl, Job } from "@/lib/api";
import {
  Download, CheckCircle2, Loader2, AlertCircle,
  Package, Sparkles, Film, Lock, Zap, ShoppingCart
} from "lucide-react";

const CHECKOUT_URL = process.env.NEXT_PUBLIC_GUMROAD_CHECKOUT_URL || "#";
const FREE_CLIP_LIMIT = 5;

const STATUS_CONFIG: Record<string, { label: string; detail: string; color: string; step: number }> = {
  pending:     { label: "Queued",           detail: "Waiting to start...",                      color: "text-yellow-400", step: 0 },
  downloading: { label: "Downloading",      detail: "Fetching video from URL...",               color: "text-blue-400",   step: 1 },
  analyzing:   { label: "AI Analyzing",     detail: "Detecting products & timestamps...",       color: "text-violet-400", step: 2 },
  extracting:  { label: "Extracting Clips", detail: "Cutting & encoding in 2K quality...",      color: "text-purple-400", step: 3 },
  done:        { label: "Complete!",        detail: "Your clips are ready to download.",         color: "text-emerald-400",step: 4 },
  failed:      { label: "Failed",           detail: "Something went wrong.",                    color: "text-red-400",    step: -1 },
};

const STEPS = ["Downloading", "AI Analyzing", "Extracting Clips"];
const ACTIVE = new Set(["pending", "downloading", "analyzing", "extracting"]);

function resLabel(res?: string): string {
  if (!res || res === "unknown") return "";
  if (res.startsWith("2560") || res.startsWith("2048")) return "2K";
  if (res.startsWith("1920")) return "1080p";
  if (res.startsWith("1280")) return "720p";
  if (res.startsWith("854"))  return "480p";
  return res.split("x")[1] ? res.split("x")[1] + "p" : res;
}

function formatDur(sec: number): string {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  }
  if (sec >= 60) return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
  return `${Math.round(sec)}s`;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function JobPoller({
  jobId, onReset, plan = "pro",
}: { jobId: string; onReset: () => void; plan?: "free" | "pro" }) {
  const [job, setJob]       = useState<Job | null>(null);
  const [elapsed, setElapsed] = useState(0);

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
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    poll();
    return () => { cancelled = true; };
  }, [jobId]);

  const cfg         = job ? STATUS_CONFIG[job.status] : STATUS_CONFIG.pending;
  const currentStep = cfg.step;
  const mm = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");

  return (
    <div className="w-full space-y-5">

      {/* ── Status card ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className={`flex items-center gap-2 font-bold text-sm ${cfg.color}`}>
              {job?.status === "done"   ? <CheckCircle2 size={16} /> :
               job?.status === "failed" ? <AlertCircle  size={16} /> :
                                          <Loader2 size={16} className="animate-spin" />}
              {cfg.label}
            </div>
            <p className="text-white/35 text-xs mt-1 leading-relaxed">{cfg.detail}</p>
          </div>

          {ACTIVE.has(job?.status ?? "") && (
            <div className="shrink-0 text-right">
              <div className="font-mono text-sm tabular-nums text-white/40">{mm}:{ss}</div>
              {job?.status === "analyzing" && (
                <div className="flex items-center gap-1 text-violet-400 text-[10px] bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full mt-1">
                  <Sparkles size={9} /> ~2-3 min
                </div>
              )}
            </div>
          )}
        </div>

        {/* Steps */}
        {job && job.status !== "failed" && (
          <div className="space-y-2.5">
            {STEPS.map((step, i) => {
              const done   = currentStep > i + 1;
              const active = currentStep === i + 1;
              return (
                <div key={step} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${
                    done   ? "bg-emerald-500 border-emerald-500" :
                    active ? "border-violet-400 bg-violet-400/20" :
                             "border-white/10"
                  }`}>
                    {done   && <CheckCircle2 size={11} className="text-white" />}
                    {active && <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${
                        done ? "text-white/50" : active ? "text-white/90" : "text-white/20"
                      }`}>{step}</span>
                      {done   && <span className="text-[11px] text-emerald-400">Done</span>}
                      {active && <span className="text-[11px] text-violet-400 animate-pulse">In progress…</span>}
                    </div>
                    {active && (
                      <div className="mt-1.5 h-0.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full shimmer" style={{ width: "65%" }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Error ───────────────────────────────────────────── */}
      {job?.status === "failed" && (
        <div className="rounded-2xl border border-red-500/20 bg-red-950/15 p-4">
          <div className="flex items-start gap-3 text-red-300 text-sm">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed">{job.error || "An unexpected error occurred. Please try again."}</span>
          </div>
        </div>
      )}

      {/* ── No products ─────────────────────────────────────── */}
      {job?.status === "done" && job.products.length === 0 && (
        <div className="rounded-2xl border border-white/8 p-10 text-center">
          <Film size={28} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/50 font-semibold text-sm">No products detected</p>
          <p className="text-white/25 text-xs mt-1">Try a product review or compilation video for best results.</p>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────── */}
      {job?.status === "done" && job.products.length > 0 && (
        <div className="space-y-3">

          {/* Header row */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-white/90">
                {job.products.length} Product{job.products.length !== 1 ? "s" : ""} Found
              </h2>
              <p className="text-white/30 text-xs mt-0.5">
                {plan === "free"
                  ? `Free plan · first ${FREE_CLIP_LIMIT} clips`
                  : "2K quality MP4 clips · ready to download"}
              </p>
            </div>

            {plan === "pro" ? (
              <a
                href={getZipDownloadUrl(jobId)}
                className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shrink-0"
              >
                <Package size={13} />
                <span>Download ZIP</span>
              </a>
            ) : (
              <a href={CHECKOUT_URL}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shrink-0">
                <Zap size={11} /> Upgrade — $29
              </a>
            )}
          </div>

          {/* Clip cards */}
          <div className="space-y-1.5">
            {job.products.map((p, i) => {
              const locked   = plan === "free" && i >= FREE_CLIP_LIMIT;
              const rl       = resLabel(p.resolution);
              const durSec   = p.end - p.start;
              const isError  = !!p.error;

              return (
                <div key={i} className={`group rounded-xl border transition-all duration-200 ${
                  locked  ? "border-white/4 bg-white/[0.015] opacity-40 cursor-not-allowed" :
                  isError ? "border-red-500/15 bg-red-950/10" :
                            "border-white/7 bg-white/[0.025] hover:bg-white/[0.045] hover:border-white/14"
                }`}>
                  <div className="flex items-center gap-3 px-3.5 py-3">

                    {/* Number */}
                    <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums ${
                      locked  ? "bg-white/5 text-white/15" :
                      isError ? "bg-red-500/10 text-red-400/70" :
                                "bg-brand-500/12 text-brand-400"
                    }`}>
                      {locked ? <Lock size={12} /> : String(i + 1).padStart(2, "0")}
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate leading-snug ${
                        locked ? "text-white/20" : isError ? "text-red-300/70" : "text-white/88"
                      }`}>
                        {p.name}
                      </p>
                      <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0 mt-0.5">
                        <span className="text-[11px] text-white/35 font-mono tabular-nums">
                          {formatTime(p.start)}–{formatTime(p.end)}
                        </span>
                        <span className="text-white/15 text-xs">·</span>
                        <span className="text-[11px] text-white/35">{formatDur(durSec)}</span>
                        {rl && !locked && !isError && (
                          <>
                            <span className="text-white/15 text-xs">·</span>
                            <span className="text-[10px] font-bold text-emerald-400/70 bg-emerald-500/8 border border-emerald-500/15 px-1.5 py-px rounded">
                              {rl}
                            </span>
                          </>
                        )}
                        {isError && (
                          <span className="text-[11px] text-red-400/60 truncate max-w-[180px]">{p.error}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {locked ? (
                        <a href={CHECKOUT_URL}
                          className="flex items-center gap-1.5 text-brand-400/70 border border-brand-500/20 bg-brand-500/8 hover:bg-brand-500/15 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all">
                          <Lock size={10} /> Pro
                        </a>
                      ) : (
                        <>
                          {p.affiliate_url && (
                            <a href={p.affiliate_url} target="_blank" rel="noopener noreferrer"
                              title="Buy this product"
                              className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/8 text-white/40 hover:text-white/70 text-[11px] px-2 py-1.5 rounded-lg transition-all">
                              <ShoppingCart size={11} />
                            </a>
                          )}
                          {(p.clip_url || p.clip_filename) && !isError && (
                            <a
                              href={p.clip_filename ? getClipDownloadUrl(jobId, p.clip_filename) : (p.clip_url ?? "#")}
                              download
                              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
                            >
                              <Download size={11} />
                              <span>Save</span>
                            </a>
                          )}
                        </>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Free upsell */}
          {plan === "free" && job.products.length > FREE_CLIP_LIMIT && (
            <div className="rounded-2xl border border-brand-500/15 bg-brand-950/20 p-5 text-center mt-2">
              <p className="text-white/55 text-sm font-semibold mb-1">
                🔒 {job.products.length - FREE_CLIP_LIMIT} more clips locked
              </p>
              <p className="text-white/30 text-xs mb-4">
                Unlock all {job.products.length} clips · ZIP download · 2K quality
              </p>
              <a href={CHECKOUT_URL}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all">
                <Zap size={13} /> Upgrade to Pro — $29 lifetime
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── Reset ───────────────────────────────────────────── */}
      {(job?.status === "done" || job?.status === "failed") && (
        <div className="text-center pt-1">
          <button onClick={onReset}
            className="text-xs text-white/25 hover:text-white/50 transition-colors underline underline-offset-4">
            Process another video
          </button>
        </div>
      )}
    </div>
  );
}
