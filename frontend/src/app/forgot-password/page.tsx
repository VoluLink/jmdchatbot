"use client";

import { useState, FormEvent } from "react";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("sending");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Senden der E-Mail");
      }

      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
      setStatus("error");
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-[#1a1a1a] via-[#212121] to-[#2a2a2a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Login Link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Anmeldung
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">JMDChatbot</h1>
          <p className="text-slate-400 text-sm">RAG Knowledge Base</p>
        </div>

        {/* Forgot Password Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-8 backdrop-blur-lg">
          {status !== "sent" ? (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0077DD]/20 rounded-full mb-4">
                  <Mail className="w-8 h-8 text-[#0077DD]" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">Passwort vergessen?</h2>
                <p className="text-sm text-slate-300">
                  Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen.
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
                    E-Mail-Adresse
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

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0077DD] hover:bg-[#0066C0] text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "sending" ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Wird gesendet…</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      <span>Reset-Link senden</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0077DD]/20 border-2 border-[#0077DD]/30 rounded-full mb-2">
                <CheckCircle2 className="w-8 h-8 text-[#0077DD]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">E-Mail gesendet!</h3>
                <p className="text-sm text-slate-300 mb-4">
                  Wenn ein Konto mit <span className="font-medium text-white">{email}</span> existiert,
                  haben wir Ihnen einen Link zum Zurücksetzen des Passworts gesendet.
                </p>
                <p className="text-xs text-slate-400 mb-6">
                  Überprüfen Sie auch Ihren Spam-Ordner, falls Sie die E-Mail nicht finden.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-[#0077DD] hover:text-[#66B3FF] font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Zurück zur Anmeldung
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Help Text */}
        {status !== "sent" && (
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Haben Sie Probleme? Kontaktieren Sie Ihren Administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
