"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import {
  Scissors, ArrowLeft, Loader2, CheckCircle2, XCircle, Clock,
  Download, Film, ExternalLink, Package,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface HistoryJob {
  job_id: string;
  status: string;
  source_url: string | null;
  original_filename: string | null;
  products: any[];
  error: string | null;
  created_at: string | null;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  done:        { icon: CheckCircle2, color: "text-emerald-400", label: "Done" },
  failed:      { icon: XCircle,      color: "text-red-400",     label: "Failed" },
  pending:     { icon: Clock,        color: "text-white/40",    label: "Pending" },
  downloading: { icon: Clock,        color: "text-blue-400",    label: "Downloading" },
  analyzing:   { icon: Clock,        color: "text-purple-400",  label: "Analyzing" },
  extracting:  { icon: Clock,        color: "text-brand-400",   label: "Extracting" },
};

export default function HistoryPage() {
  const router = useRouter();
  const { user, token, loading } = useAuth();
  const [jobs, setJobs]         = useState<HistoryJob[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/auth"); return; }
    fetchJobs(1);
  }, [user, loading]);

  const fetchJobs = async (p: number) => {
    setFetching(true);
    try {
      const res = await axios.get(`${API_BASE}/api/jobs/`, {
        params: { page: p, limit: 20 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobs(res.data.items);
      setTotal(res.data.total);
      setPage(p);
    } catch {
      setJobs([]);
    } finally { setFetching(false); }
  };

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={22} className="text-brand-500 animate-spin" />
    </div>
  );

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="orb w-96 h-96 bg-brand-600/20 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-16 space-y-6">

        <div className="flex items-center gap-3">
          <a href="/tool" className="text-white/30 hover:text-white/60 transition-colors">
            <ArrowLeft size={18} />
          </a>
          <h1 className="font-bold text-xl text-white">Job History</h1>
          <span className="text-white/20 text-xs ml-auto">{total} total</span>
        </div>

        {fetching ? (
          <div className="flex justify-center py-20">
            <Loader2 size={22} className="text-brand-500 animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="glass border border-white/10 rounded-2xl p-10 text-center space-y-3">
            <Film size={32} className="text-white/15 mx-auto" />
            <p className="text-white/30 text-sm">No jobs yet. Go process your first video!</p>
            <a href="/tool" className="inline-block bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all">
              Start Clipping
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => {
              const sc = statusConfig[job.status] || statusConfig.pending;
              const Icon = sc.icon;
              const clipCount = (job.products || []).filter((p: any) => p.clip_filename).length;
              const source = job.original_filename || (job.source_url ? new URL(job.source_url).hostname : "Direct upload");
              const date = job.created_at ? new Date(job.created_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
              }) : "";

              return (
                <div key={job.job_id} className="glass border border-white/10 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{source}</p>
                      <p className="text-white/20 text-xs mt-0.5">{date}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${sc.color}`}>
                      <Icon size={13} /> {sc.label}
                    </div>
                  </div>

                  {clipCount > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-white/30 text-xs flex items-center gap-1">
                        <Package size={11} /> {clipCount} clip{clipCount !== 1 ? "s" : ""}
                      </span>
                      {job.status === "done" && (
                        <a href={`${API_BASE}/api/jobs/${job.job_id}/clips/download-all`}
                          className="text-brand-400 hover:text-brand-300 text-xs font-medium flex items-center gap-1 transition-colors">
                          <Download size={11} /> Download ZIP
                        </a>
                      )}
                    </div>
                  )}

                  {job.error && (
                    <p className="text-red-400/70 text-xs truncate">{job.error}</p>
                  )}
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => fetchJobs(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      p === page ? "bg-brand-600 text-white" : "bg-white/5 text-white/30 hover:bg-white/10"
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
