"use client";
import { useState, useRef, DragEvent } from "react";
import { Upload, Link2, Loader2, Sparkles, Film } from "lucide-react";
import { submitJob } from "@/lib/api";

interface Props {
  onJobCreated: (jobId: string) => void;
}

export default function Uploader({ onJobCreated }: Props) {
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) { setFile(f); setMode("upload"); }
  };

  const handleSubmit = async () => {
    setError("");
    if (mode === "url" && !url.trim()) return setError("Please enter a video URL");
    if (mode === "upload" && !file) return setError("Please select a video file");
    setLoading(true);
    try {
      const form = new FormData();
      if (mode === "url") form.append("url", url.trim());
      if (mode === "upload" && file) form.append("file", file);
      const { job_id } = await submitJob(form);
      onJobCreated(job_id);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-2xl overflow-hidden p-1 glass border border-white/8">
        {(["url", "upload"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all ${
              mode === m
                ? "bg-brand-600 text-white shadow-lg shadow-brand-900/50"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {m === "url" ? <Link2 size={15} /> : <Upload size={15} />}
            {m === "url" ? "Paste URL" : "Upload File"}
          </button>
        ))}
      </div>

      {/* Input area */}
      {mode === "url" ? (
        <div className="glass rounded-2xl border border-white/8 focus-within:border-brand-500/50 transition-colors">
          <div className="flex items-center gap-3 px-4 py-4">
            <Link2 size={18} className="text-white/30 shrink-0" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube, TikTok, or Instagram URL..."
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          {/* Supported platforms */}
          <div className="px-4 pb-3 flex items-center gap-2">
            {["YouTube", "TikTok", "Instagram"].map((p) => (
              <span key={p} className="text-[10px] font-medium text-white/20 bg-white/5 px-2 py-0.5 rounded-full">{p}</span>
            ))}
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
            dragging
              ? "border-brand-500 bg-brand-500/10 scale-[1.01]"
              : "border-white/10 hover:border-brand-500/40 hover:bg-brand-500/5"
          }`}
        >
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {file ? (
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto">
                <Film size={22} className="text-brand-400" />
              </div>
              <p className="text-sm font-semibold text-brand-400">{file.name}</p>
              <p className="text-xs text-white/30">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                <Upload size={22} className="text-white/30" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/60">Drop your video here</p>
                <p className="text-xs text-white/30 mt-1">or click to browse · MP4, MOV — max 500 MB</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />{error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-white text-base transition-all glow-button flex items-center justify-center gap-3"
      >
        {loading ? (
          <><Loader2 size={18} className="animate-spin" /> Processing...</>
        ) : (
          <><Sparkles size={18} /> Extract Product Clips</>
        )}
      </button>
    </div>
  );
}
