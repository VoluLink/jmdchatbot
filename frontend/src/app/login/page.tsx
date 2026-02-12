"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Mail, Lock, AlertCircle, Smartphone } from "lucide-react";
import Link from "next/link";
import CodeVerificationInput from "@/components/CodeVerificationInput";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA states
  const [requiresTwoFa, setRequiresTwoFa] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Check if 2FA is required
      if (data.requiresTwoFa) {
        setRequiresTwoFa(true);
        setSessionToken(data.sessionToken);
      } else if (data.mustChangePassword) {
        // User must change password - redirect to change password page
        router.push("/change-password");
        router.refresh();
      } else {
        // Regular login success - redirect to home
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (code: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/two-fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          code,
          purpose: "login",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ungültiger Code");
      }

      if (data.success) {
        if (data.mustChangePassword) {
          // User must change password
          router.push("/change-password");
          router.refresh();
        } else {
          // 2FA success - redirect to home
          router.push("/");
          router.refresh();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ungültiger Code");
      setVerificationCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setRequiresTwoFa(false);
    setSessionToken("");
    setVerificationCode("");
    setError("");
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-[#1a1a1a] via-[#212121] to-[#2a2a2a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">JMDChatbot</h1>
          <p className="text-slate-400 text-sm">RAG Knowledge Base</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-8 backdrop-blur-lg">
          <h2 className="text-2xl font-semibold text-white mb-6">
            {requiresTwoFa ? "Bestätigungscode eingeben" : "Anmelden"}
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {!requiresTwoFa ? (
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
                  className="w-full pl-11 pr-4 py-3 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0077DD]/50 focus:ring-2 focus:ring-[#0077DD]/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0077DD]/50 focus:ring-2 focus:ring-[#0077DD]/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0077DD] hover:bg-[#0066C0] text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Wird angemeldet…</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Anmelden</span>
                </>
              )}
            </button>
          </form>
          ) : (
            /* 2FA Verification UI */
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0077DD]/20 rounded-full mb-4">
                  <Smartphone className="w-8 h-8 text-[#0077DD]" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Zwei-Faktor-Authentifizierung</h3>
                <p className="text-slate-300 text-sm">
                  Öffnen Sie Ihre Authenticator-App und geben Sie den 6-stelligen Code ein.
                </p>
              </div>

              <CodeVerificationInput
                value={verificationCode}
                onChange={setVerificationCode}
                onComplete={handleVerify2FA}
                disabled={loading}
                error={!!error}
              />

              <div className="flex gap-3">
                <button
                  onClick={handleBackToLogin}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/15 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Zurück
                </button>
              </div>

              <div className="text-center text-sm text-slate-400">
                Keinen Code erhalten?{" "}
                <Link
                  href="/login/backup-code"
                  className="text-[#0077DD] hover:text-[#66B3FF] font-medium"
                >
                  Backup-Code verwenden
                </Link>
              </div>
            </div>
          )}

          {/* Register Link (only show when not in 2FA mode) */}
          {!requiresTwoFa && (
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Noch kein Konto? Bitte beim Administrator einen Einladungslink anfordern.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

