"use client";

import { useState, useEffect } from "react";
import PhoneNumberInput from "./PhoneNumberInput";
import CodeVerificationInput from "./CodeVerificationInput";
import BackupCodesDisplay from "./BackupCodesDisplay";

interface TwoFaSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

type Step = "phone" | "verify" | "backup";

export default function TwoFaSetupModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
}: TwoFaSetupModalProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+49");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expiresIn, setExpiresIn] = useState<number>(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("phone");
      setPhoneNumber("");
      setCountryCode("+49");
      setVerificationCode("");
      setBackupCodes([]);
      setError("");
      setExpiresIn(0);
    }
  }, [isOpen]);

  // Countdown timer for code expiration
  useEffect(() => {
    if (step === "verify" && expiresIn > 0) {
      const timer = setInterval(() => {
        setExpiresIn((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, expiresIn]);

  const handleSendCode = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/two-fa/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          purpose: "setup",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setExpiresIn(data.expiresIn);
        setStep("verify");
      } else {
        setError(data.error || "Fehler beim Senden des Codes");
      }
    } catch (err) {
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async (code: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/two-fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          countryCode,
          verificationCode: code,
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
          {["phone", "verify", "backup"].map((s, index) => {
            const currentIndex = ["phone", "verify", "backup"].indexOf(step);
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
          {/* Step 1: Phone Number */}
          {step === "phone" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Schritt 1: Telefonnummer eingeben
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Geben Sie Ihre Telefonnummer ein. Sie erhalten einen Bestätigungscode per SMS.
                </p>
              </div>

              <PhoneNumberInput
                value={phoneNumber}
                onChange={setPhoneNumber}
                countryCode={countryCode}
                onCountryCodeChange={setCountryCode}
                disabled={loading}
                error={error}
              />

              <button
                onClick={handleSendCode}
                disabled={!phoneNumber || loading}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                {loading ? "Wird gesendet..." : "Code senden"}
              </button>
            </div>
          )}

          {/* Step 2: Verify Code */}
          {step === "verify" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Schritt 2: Code eingeben
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Geben Sie den 6-stelligen Code ein, den wir an {countryCode} {phoneNumber} gesendet haben.
                </p>
              </div>

              <div className="space-y-4">
                <CodeVerificationInput
                  value={verificationCode}
                  onChange={setVerificationCode}
                  onComplete={handleVerifyAndEnable}
                  disabled={loading}
                  error={!!error}
                />

                {expiresIn > 0 && (
                  <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                    Code läuft ab in: <span className="font-semibold">{formatTime(expiresIn)}</span>
                  </p>
                )}

                {error && (
                  <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("phone")}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Zurück
                </button>
                <button
                  onClick={handleSendCode}
                  disabled={loading || expiresIn > 540}
                  className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                >
                  {loading ? "Wird gesendet..." : "Code erneut senden"}
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
                  Bewahren Sie diese Codes sicher auf. Sie können damit auf Ihr Konto zugreifen, falls Sie Ihr Telefon verlieren.
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
