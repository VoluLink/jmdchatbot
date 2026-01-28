"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Key, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "validating" | "valid" | "invalid" | "resetting" | "success" | "error">("validating");
  const [error, setError] = useState("");
  const [tokenData, setTokenData] = useState<{ email: string } | null>(null);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setStatus("invalid");
        setError("Kein Zurücksetzen-Token gefunden");
        return;
      }

      try {
        const res = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Ungültiges oder abgelaufenes Token");
        }

        setTokenData({ email: data.email });
        setStatus("valid");
      } catch (err) {
        setStatus("invalid");
        setError(err instanceof Error ? err.message : "Token-Validierung fehlgeschlagen");
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setStatus("resetting");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Zurücksetzen des Passworts");
      }

      setStatus("success");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Login Link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Anmeldung
        </Link>

        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0077DD] rounded-2xl mb-4 shadow-lg">
              <Key className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Passwort zurücksetzen</h1>
            {tokenData && (
              <p className="text-sm text-slate-300">
                für <span className="font-medium text-white">{tokenData.email}</span>
              </p>
            )}
          </div>

          {/* Validating State */}
          {status === "validating" && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
              <p className="text-sm text-slate-300">Token wird validiert...</p>
            </div>
          )}

          {/* Invalid Token */}
          {status === "invalid" && (
            <div className="space-y-4">
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-200 mb-1">Ungültiges Token</p>
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              </div>
              <Link
                href="/login"
                className="block w-full text-center px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-colors"
              >
                Zur Anmeldung
              </Link>
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0077DD]/20 border-2 border-[#0077DD]/30 rounded-full mb-2">
                <CheckCircle2 className="w-8 h-8 text-[#0077DD]" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white mb-2">Passwort erfolgreich geändert!</p>
                <p className="text-sm text-slate-300">Sie werden zur Anmeldung weitergeleitet...</p>
              </div>
            </div>
          )}

          {/* Reset Form */}
          {status === "valid" && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Neues Passwort
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mindestens 6 Zeichen"
                  minLength={6}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0077DD] focus:ring-2 focus:ring-[#0077DD]/20 transition-colors"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Passwort bestätigen
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort erneut eingeben"
                  minLength={6}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0077DD] focus:ring-2 focus:ring-[#0077DD]/20 transition-colors"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={status === "resetting"}
                className="w-full px-4 py-3 bg-[#0077DD] hover:bg-[#0066C0] text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "resetting" ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Passwort wird gesetzt...
                  </span>
                ) : (
                  "Passwort zurücksetzen"
                )}
              </button>
            </form>
          )}

          {/* Error State (after reset attempt) */}
          {status === "error" && (
            <div className="space-y-4">
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-200 mb-1">Fehler</p>
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              </div>
              <button
                onClick={() => setStatus("valid")}
                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-colors"
              >
                Erneut versuchen
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Haben Sie Probleme? Kontaktieren Sie Ihren Administrator.
        </p>
      </div>
    </div>
  );
}
