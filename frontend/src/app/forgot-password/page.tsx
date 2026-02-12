"use client";

import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-[#1a1a1a] via-[#212121] to-[#2a2a2a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurueck zur Anmeldung
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">JMDChatbot</h1>
          <p className="text-slate-400 text-sm">RAG Knowledge Base</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-8 backdrop-blur-lg">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-100 mb-1">
                Passwort-Reset per E-Mail ist deaktiviert
              </p>
              <p className="text-sm text-amber-200/90">
                Bitte den Administrator kontaktieren. Konten werden ueber Einladungslinks verwaltet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
