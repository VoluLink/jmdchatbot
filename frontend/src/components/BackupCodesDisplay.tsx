"use client";

import { useState } from "react";

interface BackupCodesDisplayProps {
  codes: string[];
  onConfirm?: () => void;
}

export default function BackupCodesDisplay({ codes, onConfirm }: BackupCodesDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopyAll = async () => {
    const text = codes.join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = `2FA Backup Codes\n\nBewahren Sie diese Codes sicher auf. Jeder Code kann nur einmal verwendet werden.\n\n${codes.join("\n")}\n\nGeneriert am: ${new Date().toLocaleString("de-DE")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Warning Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-amber-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Wichtig: Backup-Codes sicher aufbewahren!
            </h3>
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              Diese Codes werden nur einmal angezeigt. Speichern Sie sie an einem sicheren Ort.
              Sie benötigen sie, falls Sie keinen Zugriff auf Ihr Telefon haben.
            </p>
          </div>
        </div>
      </div>

      {/* Backup Codes Grid */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        {codes.map((code, index) => (
          <div
            key={index}
            className="font-mono text-sm font-semibold text-center py-2 px-3 bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
          >
            {code}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCopyAll}
          className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Kopiert!
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Alle kopieren
            </>
          )}
        </button>

        <button
          onClick={handleDownload}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Als Datei speichern
        </button>
      </div>

      {/* Confirmation Checkbox */}
      {onConfirm && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Ich habe diese Backup-Codes gespeichert und verstehe, dass sie nicht erneut angezeigt werden.
            </span>
          </label>

          <button
            onClick={onConfirm}
            disabled={!confirmed}
            className="mt-4 w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
          >
            Bestätigen und fortfahren
          </button>
        </div>
      )}
    </div>
  );
}
