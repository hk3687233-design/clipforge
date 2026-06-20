import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const api = axios.create({ baseURL: `${API_BASE}/api` });

const TOKEN_KEY = "clipforge_token";

function _authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) return { Authorization: `Bearer ${token}` };
  // Fallback: legacy license key header (backward compat)
  const key = typeof window !== "undefined" ? (localStorage.getItem("clipforge_license_key") || "") : "";
  return key ? { "X-License-Key": key } : {};
}

export interface Product {
  name: string;
  description: string;
  start: number;
  end: number;
  clip_url?: string;
  clip_filename?: string;
  affiliate_url?: string;
  resolution?: string;
  error?: string;
}

export interface Job {
  job_id: string;
  status: "pending" | "downloading" | "analyzing" | "extracting" | "done" | "failed";
  products: Product[];
  error?: string;
}

export async function submitJob(data: FormData): Promise<{ job_id: string }> {
  const res = await api.post("/jobs/", data, {
    headers: { "Content-Type": "multipart/form-data", ..._authHeaders() },
  });
  return res.data;
}

export async function getJob(jobId: string): Promise<Job> {
  const res = await api.get(`/jobs/${jobId}`);
  return res.data;
}

export function getZipDownloadUrl(jobId: string): string {
  return `${API_BASE}/api/jobs/${jobId}/clips/download-all`;
}

export function getClipDownloadUrl(jobId: string, filename: string): string {
  return `${API_BASE}/api/jobs/${jobId}/clips/${filename}`;
}
