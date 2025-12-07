"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Database,
  RefreshCw,
  Save,
  Settings,
  SlidersHorizontal,
} from "lucide-react";

type SettingsState = {
  topK: number;
  showSources: boolean;
  streaming: boolean;
  language: "de" | "en";
};

const STORAGE_KEY = "rag-assistant-settings";
const DEFAULT_SETTINGS: SettingsState = {
  topK: 5,
  showSources: true,
  streaming: false,
  language: "de",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<SettingsState>;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
  }, []);

  const handleSave = () => {
    setStatus("saving");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setTimeout(() => setStatus("saved"), 200);
    setTimeout(() => setStatus("idle"), 1400);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
    setStatus("idle");
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#212121] text-slate-100 grey-scrollbar">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-base font-semibold uppercase tracking-[0.3em] text-slate-400">
              Systemsteuerung
            </p>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-semibold text-white leading-tight">Einstellungen</h1>
              <span className="inline-flex items-center gap-2 text-xs text-slate-100 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm">
                <Settings className="w-4 h-4" />
                Clientseitig gespeichert
              </span>
            </div>
            <p className="text-sm text-slate-300">
              Passe das Retrieval-Verhalten und Anzeigeoptionen an. Werte werden lokal im Browser gespeichert.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 bg-white/5 backdrop-blur-md text-sm font-medium text-slate-100 shadow-sm shadow-black/20 hover:bg-white/10 hover:border-white/25"
            >
              <RefreshCw className="w-4 h-4" />
              Auf Defaults
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/15 text-sm font-semibold text-slate-50 shadow-xl shadow-black/30 backdrop-blur-md hover:bg-white/20 hover:border-white/25"
            >
              <Save className="w-4 h-4" />
              {status === "saving" ? "Speichern..." : status === "saved" ? "Gespeichert" : "Speichern"}
            </button>
          </div>
        </div>

        {/* Retrieval Profil - Full Width */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/30 p-6 backdrop-blur-lg">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
                <Database className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-white">Retrieval Profil</p>
                <p className="text-sm text-slate-300">
                  top_k bestimmt, wie viele Dokumenten-Chunks pro Anfrage an das LLM gesendet werden.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Empfohlen: 5–8 Chunks. Höhere Werte liefern mehr Kontext, können aber die Antwortzeit erhöhen.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Chunks</span>
              <input
                type="range"
                min={1}
                max={12}
                value={settings.topK}
                onChange={(e) => setSettings((s) => ({ ...s, topK: Number(e.target.value) }))}
                className="w-48 accent-emerald-400"
              />
              <div className="w-10 h-10 flex items-center justify-center text-lg font-bold text-white bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                {settings.topK}
              </div>
            </div>
          </div>
        </div>

        {/* Darstellung */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/30 p-6 space-y-4 backdrop-blur-lg">
            <SectionHeader
              icon={<SlidersHorizontal className="w-4 h-4 text-slate-200" />}
              title="Darstellung"
              description="Clientseitige Anzeigeoptionen"
            />
            <Toggle
              label="Quellen unter Antworten anzeigen"
              checked={settings.showSources}
              onChange={(checked) => setSettings((s) => ({ ...s, showSources: checked }))}
            />
            <Toggle
              label="Streaming / Typing-Animation"
              checked={settings.streaming}
              onChange={(checked) => setSettings((s) => ({ ...s, streaming: checked }))}
            />
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Sprache UI</label>
              <div className="flex gap-2">
                {(["de", "en"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSettings((s) => ({ ...s, language: lang }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                      settings.language === lang
                        ? "border-white/30 bg-white/20 text-slate-50"
                        : "border-white/15 bg-white/5 text-slate-200 hover:border-white/25"
                    }`}
                  >
                    {lang === "de" ? "Deutsch" : "English"}
                  </button>
                ))}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        {icon}
        <span>{title}</span>
      </div>
      <p className="text-xs text-slate-300">{description}</p>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/15 px-3 py-2.5 hover:border-white/25 cursor-pointer bg-white/5 backdrop-blur-md">
      <span className="text-sm text-slate-100">{label}</span>
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-white/80" : "bg-white/20"
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-5 bg-slate-900" : "translate-x-1 bg-white"
          }`}
        />
      </span>
    </label>
  );
}
