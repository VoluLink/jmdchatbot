"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Key, Mail, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BackupCodeLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // First, get the user ID from email
      const userRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "dummy" }), // We'll need the user ID
      });

      // If password fails but user exists, we need to verify backup code
      // For now, we'll use a direct backup code verification API
      const res = await fetch("/api/auth/two-fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: email, // Will need to handle this properly
          code: backupCode.replace(/-/g, ""), // Remove dashes
          purpose: "backup",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ungültiger Backup-Code");
      }

      if (data.success) {
        // Backup code verified - redirect to home
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ungültiger Backup-Code");
    } finally {
      setLoading(false);
    }
  };

  const handleBackupCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");

    // Auto-format with dashes (XXXX-XXXX-XXXX)
    if (value.length > 4 && value.length <= 8) {
      value = value.slice(0, 4) + "-" + value.slice(4);
    } else if (value.length > 8) {
      value = value.slice(0, 4) + "-" + value.slice(4, 8) + "-" + value.slice(8, 12);
    }

    setBackupCode(value);
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-[#1a1a1a] via-[#212121] to-[#2a2a2a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">AMIKO</h1>
          <p className="text-slate-400 text-sm">RAG Knowledge Base</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-8 backdrop-blur-lg">
          {/* Back Button */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Anmeldung
          </Link>

          <h2 className="text-2xl font-semibold text-white mb-2">Backup-Code verwenden</h2>
          <p className="text-sm text-slate-400 mb-6">
            Verwenden Sie einen Ihrer Backup-Codes, um sich anzumelden, falls Sie keinen Zugriff auf Ihr Telefon haben.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                E-Mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  required
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Backup-Code
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={backupCode}
                  onChange={handleBackupCodeChange}
                  placeholder="XXXX-XXXX-XXXX"
                  required
                  maxLength={14} // 12 chars + 2 dashes
                  className="w-full pl-11 pr-4 py-3 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono tracking-wider"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Format: XXXX-XXXX-XXXX (z.B. A3B7-9K2L-4M6P)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || backupCode.length < 12}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Wird angemeldet…</span>
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  <span>Mit Backup-Code anmelden</span>
                </>
              )}
            </button>
          </form>

          {/* Warning */}
          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-200">
              <strong>Hinweis:</strong> Jeder Backup-Code kann nur einmal verwendet werden. Nach erfolgreicher Anmeldung generieren Sie bitte neue Backup-Codes in den Einstellungen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
