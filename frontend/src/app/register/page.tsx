"use client";

import Link from "next/link";
import { Mail } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-[#1a1a1a] via-[#212121] to-[#2a2a2a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">JMDChatbot</h1>
          <p className="text-slate-400 text-sm">RAG Knowledge Base</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-8 backdrop-blur-lg">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Registrierung nur mit Einladung
          </h2>
          <div className="p-4 bg-[#00529E]/10 border border-[#0066C0]/20 rounded-lg mb-6">
            <p className="text-sm text-slate-200">
              Neue Konten werden ausschließlich durch Administratoren freigeschaltet.
              Bitte einen Einladungslink anfordern und damit das Passwort setzen.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0077DD] hover:bg-[#0066C0] text-white font-semibold rounded-lg transition-all"
            >
              <Mail className="w-5 h-5" />
              Zur Anmeldung
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
