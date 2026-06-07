import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const api = axios.create({ baseURL: `${API_BASE}/api` });

export async function activateLicense(key: string): Promise<{ valid: boolean; plan: string }> {
  const res = await api.post("/license/activate", { key });
  return res.data;
}

export async function verifyLicense(key: string): Promise<boolean> {
  try {
    await api.post("/license/verify", { key });
    return true;
  } catch {
    return false;
  }
}

export function getZipDownloadUrl(jobId: string): string {
  return `${API_BASE}/api/jobs/${jobId}/clips/download-all`;
}

export interface Product {
  name: string;
  description: string;
  start: number;
  end: number;
  clip_url?: string;
  clip_filename?: string;
  affiliate_url?: string;
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
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getJob(jobId: string): Promise<Job> {
  const res = await api.get(`/jobs/${jobId}`);
  return res.data;
}

export function getClipDownloadUrl(jobId: string, filename: string): string {
  return `${API_BASE}/api/jobs/${jobId}/clips/${filename}`;
}
