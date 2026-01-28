"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Eye,
  CheckCircle2,
  Key,
  Shield,
  Smartphone,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import TwoFaSetupModal from "@/components/TwoFaSetupModal";
import BackupCodesDisplay from "@/components/BackupCodesDisplay";

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
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [passwordError, setPasswordError] = useState("");

  // 2FA states
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaLoading, setTwoFaLoading] = useState(true);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableError, setDisableError] = useState("");
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [regenerateError, setRegenerateError] = useState("");
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);

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

  // Fetch 2FA status
  useEffect(() => {
    const fetchTwoFaStatus = async () => {
      try {
        const res = await fetch("/api/auth/two-fa/status");
        if (res.ok) {
          const data = await res.json();
          setTwoFaEnabled(data.enabled);
          setBackupCodesRemaining(data.backupCodesRemaining || 0);
        }
      } catch (err) {
        console.error("Failed to fetch 2FA status:", err);
      } finally {
        setTwoFaLoading(false);
      }
    };

    fetchTwoFaStatus();
  }, []);

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

  const handleTwoFaSetupSuccess = () => {
    setShowSetupModal(false);
    setTwoFaEnabled(true);
    // Refresh status
    fetch("/api/auth/two-fa/status")
      .then((res) => res.json())
      .then((data) => {
          setBackupCodesRemaining(data.backupCodesRemaining || 0);
      });
  };

  const handleDisableTwoFa = async () => {
    setDisableError("");

    if (!disablePassword) {
      setDisableError("Passwort erforderlich");
      return;
    }

    try {
      const res = await fetch("/api/auth/two-fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Deaktivieren");
      }

      setTwoFaEnabled(false);
      setBackupCodesRemaining(0);
      setShowDisableConfirm(false);
      setDisablePassword("");
    } catch (err) {
      setDisableError(err instanceof Error ? err.message : "Fehler beim Deaktivieren");
    }
  };

  const handleRegenerateBackups = async () => {
    setRegenerateError("");

    if (!regeneratePassword) {
      setRegenerateError("Passwort erforderlich");
      return;
    }

    try {
      const res = await fetch("/api/auth/two-fa/regenerate-backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: regeneratePassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Generieren");
      }

      setNewBackupCodes(data.backupCodes);
      setBackupCodesRemaining(data.backupCodes.length);
      setRegeneratePassword("");
    } catch (err) {
      setRegenerateError(err instanceof Error ? err.message : "Fehler beim Generieren");
    }
  };

  const handleBackupCodesConfirm = () => {
    setShowRegenerateModal(false);
    setNewBackupCodes([]);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#212121] text-slate-100 grey-scrollbar">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="space-y-2">
          <p className="text-base font-semibold uppercase tracking-[0.3em] text-slate-400">
            Systemsteuerung
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-semibold text-white leading-tight">Einstellungen</h1>
          </div>
          <p className="text-sm text-slate-300">
            Verwalte dein Konto und passe Anzeigeoptionen an
          </p>
        </div>

        {/* Display Settings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/30 p-6 space-y-4 backdrop-blur-lg">
          <SectionHeader
            icon={<Eye className="w-5 h-5 text-[#66B3FF]" />}
            title="Anzeige"
            description="Steuert, was in der Chat-Oberfläche angezeigt wird"
          />
          
          <Toggle
            label="Quellen unter Antworten anzeigen"
            checked={settings.showSources}
            onChange={(checked) => {
              const newSettings = { ...settings, showSources: checked };
              setSettings(newSettings);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
              window.dispatchEvent(new CustomEvent("rag-settings-changed", { detail: newSettings }));
            }}
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
                  ? "bg-purple-500/20 text-purple-400 border-2 border-purple-500/30"
                  : "bg-[#00529E]/20 text-[#0077DD] border-2 border-[#0066C0]/30"
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
                  className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0066C0]/50 focus:ring-2 focus:ring-[#0066C0]/20"
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
                  className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0066C0]/50 focus:ring-2 focus:ring-[#0066C0]/20"
                />
              </div>
            </div>
            <button
              onClick={handlePasswordChange}
              disabled={!newPassword || !confirmPassword || passwordStatus === "saving"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00529E] text-white font-semibold hover:bg-[#0066C0] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

        {/* Two-Factor Authentication */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/30 p-6 space-y-6 backdrop-blur-lg">
          <SectionHeader
            icon={<Shield className="w-5 h-5 text-[#66B3FF]" />}
            title="Zwei-Faktor-Authentifizierung (2FA)"
            description="Erhöhe die Sicherheit deines Kontos mit einem zusätzlichen Schutz"
          />

          {twoFaLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : twoFaEnabled ? (
            /* 2FA Enabled - Show Management */
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="p-4 bg-[#00529E]/10 border border-[#0066C0]/20 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#0077DD] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#99CCFF] mb-1">2FA ist aktiviert</p>
                  <p className="text-xs text-[#66B3FF]/80">
                    Dein Konto ist durch eine zusätzliche Sicherheitsebene geschützt.
                  </p>
                </div>
              </div>

              {/* Authenticator App Info */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Authenticator-App</p>
                    <p className="text-xs text-slate-400">
                      Google/Microsoft Authenticator, Authy
                    </p>
                  </div>
                </div>
              </div>

              {/* Backup Codes Status */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Backup-Codes</p>
                    <p className="text-xs text-slate-400">
                      {backupCodesRemaining} von 8 Codes verbleibend
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRegenerateModal(true)}
                  className="px-4 py-2 text-sm font-medium text-[#0077DD] hover:text-[#66B3FF] transition-colors"
                >
                  Neu generieren
                </button>
              </div>

              {/* Warning if low backup codes */}
              {backupCodesRemaining <= 2 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200">
                    Du hast nur noch {backupCodesRemaining} Backup-Code{backupCodesRemaining !== 1 ? "s" : ""} übrig.
                    Generiere neue Codes, um sicherzustellen, dass du immer Zugriff auf dein Konto hast.
                  </p>
                </div>
              )}

              {/* Disable Button */}
              <button
                onClick={() => setShowDisableConfirm(true)}
                className="w-full px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-red-200 font-medium transition-colors"
              >
                2FA deaktivieren
              </button>
            </div>
          ) : (
            /* 2FA Disabled - Show Enable Option */
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-200 mb-3">
                  <strong>Empfohlen:</strong> Aktiviere 2FA, um dein Konto besser zu schützen.
                  Bei jedem Login wird zusätzlich zu deinem Passwort ein Code aus deiner Authenticator-App benötigt.
                </p>
                <ul className="space-y-1.5 text-xs text-blue-300/80">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">✓</span>
                    <span>Zusätzliche Sicherheit vor unbefugtem Zugriff</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">✓</span>
                    <span>Funktioniert mit Google Authenticator, Microsoft Authenticator, Authy</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">✓</span>
                    <span>Backup-Codes für den Notfall</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setShowSetupModal(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#00529E] hover:bg-[#0066C0] text-white font-semibold rounded-lg transition-colors"
              >
                <Shield className="w-5 h-5" />
                2FA aktivieren
              </button>
            </div>
          )}
        </div>

      </div>

      {/* 2FA Setup Modal */}
      {user && (
        <TwoFaSetupModal
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          onSuccess={handleTwoFaSetupSuccess}
          userId={user.id}
        />
      )}

      {/* Disable 2FA Confirmation Modal */}
      {showDisableConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              2FA deaktivieren?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Dein Konto wird weniger sicher sein. Gib dein Passwort ein, um zu bestätigen.
            </p>

            {disableError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                {disableError}
              </div>
            )}

            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Passwort eingeben"
              className="w-full px-4 py-2.5 mb-4 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDisableConfirm(false);
                  setDisablePassword("");
                  setDisableError("");
                }}
                className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDisableTwoFa}
                disabled={!disablePassword}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Deaktivieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Backup Codes Modal */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Backup-Codes neu generieren
            </h3>

            {newBackupCodes.length === 0 ? (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Alte Backup-Codes werden ungültig. Gib dein Passwort ein, um fortzufahren.
                </p>

                {regenerateError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                    {regenerateError}
                  </div>
                )}

                <input
                  type="password"
                  value={regeneratePassword}
                  onChange={(e) => setRegeneratePassword(e.target.value)}
                  placeholder="Passwort eingeben"
                  className="w-full px-4 py-2.5 mb-4 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRegenerateModal(false);
                      setRegeneratePassword("");
                      setRegenerateError("");
                    }}
                    className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleRegenerateBackups}
                    disabled={!regeneratePassword}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generieren
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Deine neuen Backup-Codes. Speichere sie sicher!
                </p>
                <BackupCodesDisplay codes={newBackupCodes} onConfirm={handleBackupCodesConfirm} />
              </>
            )}
          </div>
        </div>
      )}
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
