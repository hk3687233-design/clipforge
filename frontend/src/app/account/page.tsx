"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import {
  Scissors, User, Mail, Lock, Eye, EyeOff, Shield, Trash2,
  Loader2, ArrowLeft, Zap, Key, CheckCircle2,
} from "lucide-react";
import { CheckoutModal } from "@/components/CheckoutModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AccountPage() {
  const router = useRouter();
  const { user, token, loading, logout, refreshUser } = useAuth();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass]         = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [savingPass, setSavingPass]   = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/auth"); return; }
    setFirstName(user.name?.split(" ")[0] || "");
    setLastName(user.name?.split(" ").slice(1).join(" ") || "");
  }, [user, loading, router]);

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={22} className="text-brand-500 animate-spin" />
    </div>
  );

  const headers = { Authorization: `Bearer ${token}` };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await axios.patch(`${API_BASE}/api/auth/profile`, { first_name: firstName, last_name: lastName }, { headers });
      await refreshUser();
      toast("Profile updated.", "success");
    } catch (err: any) {
      toast(err?.response?.data?.detail || "Failed to update profile.", "error");
    } finally { setSavingProfile(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) { toast("Password must be at least 6 characters.", "error"); return; }
    if (newPass !== confirmPass) { toast("Passwords don't match.", "error"); return; }
    setSavingPass(true);
    try {
      await axios.post(`${API_BASE}/api/auth/change-password`, {
        current_password: currentPass, new_password: newPass,
      }, { headers });
      toast("Password changed.", "success");
      setCurrentPass(""); setNewPass(""); setConfirmPass("");
    } catch (err: any) {
      toast(err?.response?.data?.detail || "Failed to change password.", "error");
    } finally { setSavingPass(false); }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE}/api/auth/account`, { headers });
      logout();
      router.replace("/");
    } catch (err: any) {
      toast(err?.response?.data?.detail || "Failed to delete account.", "error");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="orb w-96 h-96 bg-brand-600/20 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-16 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/tool" className="text-white/30 hover:text-white/60 transition-colors">
              <ArrowLeft size={18} />
            </a>
            <h1 className="font-bold text-xl text-white">Account Settings</h1>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            user.plan === "pro"
              ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
              : "bg-white/5 text-white/30 border border-white/10"
          }`}>
            {user.plan === "pro" ? "PRO" : "FREE"}
          </span>
        </div>

        {/* Profile section */}
        <div className="glass border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white/60 text-sm font-semibold">
            <User size={15} /> Profile
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
              : <div className="w-10 h-10 rounded-full bg-brand-600/30 flex items-center justify-center"><User size={18} className="text-brand-400" /></div>
            }
            <div>
              <p className="text-white text-sm font-medium">{user.name || "User"}</p>
              <p className="text-white/30 text-xs">{user.email}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div className="flex gap-2">
              <input type="text" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)}
                className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all" />
              <input type="text" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)}
                className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all" />
            </div>
            <button type="submit" disabled={savingProfile}
              className="bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50">
              {savingProfile ? <Loader2 size={13} className="animate-spin" /> : "Save Name"}
            </button>
          </form>
        </div>

        {/* Password section */}
        <div className="glass border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white/60 text-sm font-semibold">
            <Lock size={15} /> {user.has_password ? "Change Password" : "Set Password"}
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            {user.has_password && (
              <div className="relative">
                <input type={showPass ? "text" : "password"} placeholder="Current password" value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 pr-10 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all"
                  required />
              </div>
            )}
            <div className="relative">
              <input type={showPass ? "text" : "password"} placeholder="New password (min 6 chars)" value={newPass}
                onChange={e => setNewPass(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 pr-10 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all"
                required />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <input type={showPass ? "text" : "password"} placeholder="Confirm new password" value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/50 transition-all"
              required />
            <button type="submit" disabled={savingPass}
              className="bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50">
              {savingPass ? <Loader2 size={13} className="animate-spin" /> : "Update Password"}
            </button>
          </form>
        </div>

        {/* Plan info */}
        <div className="glass border border-white/10 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-white/60 text-sm font-semibold">
            <Zap size={15} /> Plan
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">{user.plan === "pro" ? "Pro (Lifetime)" : "Free Plan"}</p>
              <p className="text-white/30 text-xs">
                {user.plan === "pro" ? "Unlimited access — one-time purchase" : "3 exports/day, 5 clips, 10 min max"}
              </p>
            </div>
            {user.plan === "free" && (
              <button onClick={() => setShowCheckout(true)}
                className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">
                Upgrade
              </button>
            )}
          </div>
        </div>

        {/* Danger zone */}
        <div className="glass border border-red-500/15 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-red-400/70 text-sm font-semibold">
            <Trash2 size={15} /> Danger Zone
          </div>
          <p className="text-white/30 text-xs leading-relaxed">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold px-4 py-2 rounded-xl transition-all">
              Delete Account
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={handleDeleteAccount} disabled={deleting}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50">
                {deleting ? <Loader2 size={13} className="animate-spin" /> : "Yes, Delete Everything"}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)}
                className="text-white/30 hover:text-white/50 text-xs transition-colors">
                Cancel
              </button>
            </div>
          )}
        </div>

      </div>
      <CheckoutModal open={showCheckout} onClose={() => setShowCheckout(false)} />
    </div>
  );
}
