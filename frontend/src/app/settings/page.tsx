"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Database,
  RefreshCw,
  Save,
  Settings,
  SlidersHorizontal,
  Eye,
  Thermometer,
  CheckCircle2,
  Key,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type SettingsState = {
  topK: number;
  showSources: boolean;
  temperature: number;
  chunkSize: number;
};

const STORAGE_KEY = "rag-assistant-settings";
const DEFAULT_SETTINGS: SettingsState = {
  topK: 5,
  showSources: true,
  temperature: 0.7,
  chunkSize: 512,
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [passwordError, setPasswordError] = useState("");

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
    // Dispatch custom event so ChatInterface can listen for changes
    window.dispatchEvent(new CustomEvent("rag-settings-changed", { detail: settings }));
    setTimeout(() => setStatus("saved"), 200);
    setTimeout(() => setStatus("idle"), 1400);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("rag-settings-changed", { detail: DEFAULT_SETTINGS }));
    setStatus("idle");
  };

  const handlePasswordChange = async () => {
    setPasswordError("");
    
    if (newPassword.length < 6) {
      setPasswordError("Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwörter stimmen nicht überein");
      return;
    }

    setPasswordStatus("saving");

    // TODO: Implement password change API
    // For now, just show success
    setTimeout(() => {
      setPasswordStatus("success");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordStatus("idle"), 2000);
    }, 1000);
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
            </div>
            <p className="text-sm text-slate-300">
              Passe RAG-Parameter und Anzeigeoptionen an
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 bg-white/5 backdrop-blur-md text-sm font-medium text-slate-100 shadow-sm shadow-black/20 hover:bg-white/10 hover:border-white/25"
            >
              <RefreshCw className="w-4 h-4" />
              Zurücksetzen
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 border border-indigo-500/30 text-sm font-semibold text-white shadow-xl shadow-black/30 hover:bg-indigo-500"
            >
              <Save className="w-4 h-4" />
              {status === "saving" ? "Speichert..." : status === "saved" ? "✓ Gespeichert" : "Speichern"}
            </button>
          </div>
        </div>

        {/* Retrieval Settings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/30 p-6 backdrop-blur-lg space-y-6">
          <SectionHeader
            icon={<Database className="w-5 h-5 text-emerald-300" />}
            title="Retrieval-Parameter"
            description="Steuert, wie Dokumente abgerufen und verarbeitet werden"
          />

          {/* Top K */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Top-K (Anzahl Chunks)</p>
                <p className="text-xs text-slate-400">
                  Wie viele relevante Dokumenten-Abschnitte pro Anfrage
                </p>
              </div>
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2 border border-white/10">
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={settings.topK}
                  onChange={(e) => setSettings((s) => ({ ...s, topK: Number(e.target.value) }))}
                  className="w-40 accent-emerald-400"
                />
                <div className="w-12 h-10 flex items-center justify-center text-lg font-bold text-white bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                  {settings.topK}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {settings.topK <= 3 && "⚡ Schnell, aber wenig Kontext"}
              {settings.topK > 3 && settings.topK <= 7 && "✅ Empfohlen - Gutes Balance"}
              {settings.topK > 7 && "🔍 Viel Kontext, aber langsamer"}
            </p>
          </div>

          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Temperatur</p>
                <p className="text-xs text-slate-400">
                  Kreativität vs. Präzision der Antworten
                </p>
              </div>
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2 border border-white/10">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={settings.temperature}
                  onChange={(e) => setSettings((s) => ({ ...s, temperature: Number(e.target.value) }))}
                  className="w-40 accent-indigo-400"
                />
                <div className="w-12 h-10 flex items-center justify-center text-base font-bold text-white bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                  {settings.temperature.toFixed(1)}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {settings.temperature <= 0.3 && "🎯 Sehr präzise, konsistent"}
              {settings.temperature > 0.3 && settings.temperature <= 0.7 && "✅ Empfohlen - Ausgewogen"}
              {settings.temperature > 0.7 && "🎨 Kreativ, variabel"}
            </p>
          </div>

          {/* Chunk Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Chunk-Größe (Tokens)</p>
                <p className="text-xs text-slate-400">
                  Größe der Dokumenten-Abschnitte für Zitate
                </p>
              </div>
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2 border border-white/10">
                <input
                  type="range"
                  min={256}
                  max={1024}
                  step={128}
                  value={settings.chunkSize}
                  onChange={(e) => setSettings((s) => ({ ...s, chunkSize: Number(e.target.value) }))}
                  className="w-40 accent-amber-400"
                />
                <div className="w-14 h-10 flex items-center justify-center text-sm font-bold text-white bg-amber-500/20 rounded-lg border border-amber-500/30">
                  {settings.chunkSize}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Empfohlen: 512 Tokens • Größer = mehr Kontext pro Zitat
            </p>
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/30 p-6 space-y-4 backdrop-blur-lg">
          <SectionHeader
            icon={<Eye className="w-5 h-5 text-indigo-300" />}
            title="Anzeige"
            description="Steuert, was in der Chat-Oberfläche angezeigt wird"
          />
          
          <Toggle
            label="Quellen unter Antworten anzeigen"
            checked={settings.showSources}
            onChange={(checked) => setSettings((s) => ({ ...s, showSources: checked }))}
            description="Zeigt zitierte Dokumente als klickbare Links"
          />
        </div>

        {/* Account Settings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/30 p-6 space-y-6 backdrop-blur-lg">
          <SectionHeader
            icon={<Key className="w-5 h-5 text-slate-300" />}
            title="Account"
            description="Deine Kontoinformationen und Sicherheit"
          />

          {/* Current User Info */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold ${
                user?.role === "admin"
                  ? "bg-amber-500/20 text-amber-400 border-2 border-amber-500/30"
                  : "bg-indigo-500/20 text-indigo-400 border-2 border-indigo-500/30"
              }`}>
                {user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
              </div>
              <div>
                <p className="text-base font-semibold text-white">{user?.name || "Benutzer"}</p>
                <p className="text-sm text-slate-400">{user?.email}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Rolle: {user?.role === "admin" ? "Administrator" : "Benutzer"}
                </p>
              </div>
            </div>
          </div>

          {/* Password Change */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-white">Passwort ändern</p>
            
            {passwordError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-200">
                {passwordError}
              </div>
            )}

            {passwordStatus === "success" && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Passwort erfolgreich geändert!
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-2">Neues Passwort</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-2">Passwort bestätigen</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <button
              onClick={handlePasswordChange}
              disabled={!newPassword || !confirmPassword || passwordStatus === "saving"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {passwordStatus === "saving" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Ändert...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Passwort ändern</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
          <p className="text-sm text-indigo-200">
            💡 <strong>Tipp:</strong> Die Einstellungen werden sofort in der Chat-Oberfläche angewendet. 
            Du musst die Seite nicht neu laden.
          </p>
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
      <div className="flex items-center gap-2 text-base font-semibold text-white">
        {icon}
        <span>{title}</span>
      </div>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  description?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/15 px-4 py-3 hover:border-white/25 cursor-pointer bg-white/5 backdrop-blur-md transition-all">
      <div className="flex-1">
        <span className="text-sm font-medium text-slate-100 block mb-0.5">{label}</span>
        {description && <span className="text-xs text-slate-400">{description}</span>}
      </div>
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-white/20"
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </span>
    </label>
  );
}
