"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Key, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwörter stimmen nicht überein");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Ändern des Passworts");
      }

      // Success - redirect to home
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-[#1a1a1a] via-[#212121] to-[#2a2a2a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">JMDChatbot</h1>
          <p className="text-slate-400 text-sm">RAG Knowledge Base</p>
        </div>

        {/* Change Password Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-8 backdrop-blur-lg">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/20 rounded-full mb-4">
              <Key className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Passwort ändern</h2>
            <p className="text-sm text-slate-300">
              Ihr Passwort wurde von einem Administrator zurückgesetzt. Bitte wählen Sie ein neues Passwort.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Neues Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  minLength={6}
                  className="w-full pl-11 pr-4 py-3 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0077DD]/50 focus:ring-2 focus:ring-[#0077DD]/20 transition-all"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Mindestens 6 Zeichen</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Passwort bestätigen
              </label>
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-11 pr-4 py-3 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0077DD]/50 focus:ring-2 focus:ring-[#0077DD]/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0077DD] hover:bg-[#0066C0] text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Wird gespeichert…</span>
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  <span>Passwort ändern</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
