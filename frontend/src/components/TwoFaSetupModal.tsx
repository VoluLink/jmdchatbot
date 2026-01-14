"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Download, Smartphone, QrCode } from "lucide-react";
import BackupCodesDisplay from "./BackupCodesDisplay";

interface TwoFaSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

type Step = "qr" | "verify" | "backup";

export default function TwoFaSetupModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
}: TwoFaSetupModalProps) {
  const [step, setStep] = useState<Step>("qr");
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [manualEntryKey, setManualEntryKey] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Reset state when modal opens and generate QR code
  useEffect(() => {
    if (isOpen) {
      setStep("qr");
      setQrCodeBase64("");
      setManualEntryKey("");
      setVerificationCode("");
      setBackupCodes([]);
      setError("");
      setCopied(false);
      handleGenerateQR();
    }
  }, [isOpen]);

  const handleGenerateQR = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/two-fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setQrCodeBase64(data.qrCodeBase64);
        setManualEntryKey(data.manualEntryKey);
      } else {
        setError(data.error || "Fehler beim Generieren des QR-Codes");
      }
    } catch (err) {
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      setError("Bitte geben Sie einen 6-stelligen Code ein");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/two-fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setBackupCodes(data.backupCodes);
        setStep("backup");
      } else {
        setError(data.error || "Ungültiger Code");
        setVerificationCode("");
      }
    } catch (err) {
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onSuccess();
    onClose();
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(manualEntryKey.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Zwei-Faktor-Authentifizierung aktivieren
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 p-6 bg-slate-50 dark:bg-slate-900/50">
          {["qr", "verify", "backup"].map((s, index) => {
            const currentIndex = ["qr", "verify", "backup"].indexOf(step);
            const stepIndex = index;
            const isActive = stepIndex === currentIndex;
            const isCompleted = stepIndex < currentIndex;

            return (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    isCompleted
                      ? "bg-indigo-600 text-white"
                      : isActive
                      ? "bg-blue-600 text-white"
                      : "bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {isCompleted ? "✓" : stepIndex + 1}
                </div>
                {index < 2 && (
                  <div
                    className={`w-16 h-1 mx-2 transition-colors ${
                      isCompleted ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Scan QR Code */}
          {step === "qr" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Schritt 1: Authenticator-App einrichten
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Scannen Sie den QR-Code mit einer Authenticator-App:
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                    <Smartphone className="w-3 h-3" />
                    Google Authenticator
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                    <Smartphone className="w-3 h-3" />
                    Microsoft Authenticator
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                    <Smartphone className="w-3 h-3" />
                    Authy
                  </span>
                </div>
              </div>

              {loading && !qrCodeBase64 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : qrCodeBase64 ? (
                <>
                  {/* QR Code */}
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 bg-white rounded-lg border-2 border-slate-200 dark:border-slate-700">
                      <img
                        src={`data:image/png;base64,${qrCodeBase64}`}
                        alt="QR Code"
                        className="w-64 h-64"
                      />
                    </div>

                    {/* Manual Entry */}
                    <div className="w-full">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 text-center">
                        Oder geben Sie diesen Schlüssel manuell ein:
                      </p>
                      <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                        <code className="flex-1 text-sm font-mono text-slate-900 dark:text-slate-100 break-all">
                          {manualEntryKey}
                        </code>
                        <button
                          onClick={handleCopyKey}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors flex-shrink-0"
                          title="Kopieren"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep("verify")}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Weiter zur Verifizierung
                  </button>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                  <button
                    onClick={handleGenerateQR}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Erneut versuchen
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Verify Code */}
          {step === "verify" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Schritt 2: Code verifizieren
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein:
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Verifizierungscode
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    disabled={loading}
                    className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("qr")}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Zurück
                </button>
                <button
                  onClick={handleVerifyAndEnable}
                  disabled={loading || verificationCode.length !== 6}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                >
                  {loading ? "Wird verifiziert..." : "Verifizieren & Aktivieren"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Backup Codes */}
          {step === "backup" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Schritt 3: Backup-Codes speichern
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Bewahren Sie diese Codes sicher auf. Sie können damit auf Ihr Konto zugreifen, falls Sie keinen Zugriff auf Ihre Authenticator-App haben.
                </p>
              </div>

              <BackupCodesDisplay codes={backupCodes} onConfirm={handleComplete} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
