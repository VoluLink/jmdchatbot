"use client";

import { useCallback, useEffect, useState } from "react";
import {
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  Folder,
  File,
  RefreshCw,
} from "lucide-react";

type UploadStatus = "idle" | "uploading" | "success" | "error";

type FileUploadResult = {
  file: string;
  status: "success" | "error";
  error?: string;
};

export function FileUploader({
  onUploadComplete,
}: {
  onUploadComplete?: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [targetFolder, setTargetFolder] = useState("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [results, setResults] = useState<FileUploadResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList);
    setFiles((prev) => [...prev, ...newFiles]);
    setStatus("idle");
    setResults([]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setStatus("uploading");
    setResults([]);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append("targetFolder", targetFolder);

      const res = await fetch("/api/sources/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Build results
      const uploadResults: FileUploadResult[] = [];

      // Success files
      (data.uploaded || []).forEach((fileName: string) => {
        uploadResults.push({ file: fileName, status: "success" });
      });

      // Error files
      (data.errors || []).forEach((err: { file: string; error: string }) => {
        uploadResults.push({ file: err.file, status: "error", error: err.error });
      });

      setResults(uploadResults);
      setStatus(uploadResults.some((r) => r.status === "error") ? "error" : "success");

      // Clear successful files
      if (data.uploaded && data.uploaded.length > 0) {
        const successNames = new Set(data.uploaded);
        setFiles((prev) => prev.filter((f) => !successNames.has(f.name)));
      }

      // Callback
      if (onUploadComplete) {
        onUploadComplete();
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sources-updated"));
      }
    } catch (err) {
      setStatus("error");
      setResults([
        {
          file: "Upload",
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        },
      ]);
    }
  };

  const clearResults = () => {
    setResults([]);
    setStatus("idle");
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl shadow-2xl shadow-black/40 p-6 backdrop-blur-lg space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-slate-50">
          <UploadCloud className="w-5 h-5" />
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="text-lg font-semibold text-white">Dateien hochladen</h3>
          <p className="text-sm text-slate-200">
            Dateien werden in Root hochgeladen. Anschließend kannst du sie in Ordner verschieben.
          </p>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-2xl border-2 border-dashed transition-all ${
          isDragging
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-white/15 bg-white/5 hover:border-white/25 hover:bg-white/10"
        }`}
      >
        <input
          id="file-upload"
          type="file"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center px-6 py-8 cursor-pointer"
        >
          <UploadCloud
            className={`w-12 h-12 mb-3 transition-colors ${
              isDragging ? "text-indigo-400" : "text-slate-400"
            }`}
          />
          <p className="text-sm font-medium text-white mb-1">
            {isDragging ? "Dateien hier ablegen…" : "Klicken oder Dateien hierher ziehen"}
          </p>
          <p className="text-xs text-slate-400">
            PDF, DOCX, PPTX, TXT, MD, HTML, etc.
          </p>
        </label>
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">
            {files.length} Datei(en) ausgewählt
          </p>
          <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-black/20 rounded-lg">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg group"
              >
                <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-200 flex-1 truncate">
                  {file.name}
                </span>
                <span className="text-xs text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Entfernen"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-300">Ergebnisse</p>
            <button
              onClick={clearResults}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Löschen
            </button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-2 p-2 bg-black/20 rounded-lg">
            {results.map((result, index) => (
              <div
                key={`${result.file}-${index}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  result.status === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-red-500/10 border border-red-500/20"
                }`}
              >
                {result.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm truncate ${
                      result.status === "success" ? "text-emerald-200" : "text-red-200"
                    }`}
                  >
                    {result.file}
                  </p>
                  {result.error && (
                    <p className="text-xs text-red-300 truncate">{result.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={files.length === 0 || status === "uploading"}
        className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/15 shadow-2xl shadow-black/30 text-slate-50 text-sm font-semibold transition-all hover:bg-white/20 hover:border-white/25 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "uploading" ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Wird hochgeladen…</span>
          </>
        ) : (
          <>
            <UploadCloud className="w-5 h-5" />
            <span>
              {files.length > 0
                ? `${files.length} Datei(en) hochladen`
                : "Keine Dateien ausgewählt"}
            </span>
          </>
        )}
      </button>

      {status === "success" && (
        <IndexFilesButton onComplete={() => setStatus("idle")} />
      )}
      
      {status === "error" && (
        <p className="text-sm text-center text-red-300">
          ⚠️ Einige Dateien konnten nicht hochgeladen werden. Siehe Ergebnisse oben.
        </p>
      )}
    </div>
  );
}

function IndexFilesButton({ onComplete }: { onComplete?: () => void }) {
  const [indexing, setIndexing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs/index-files", { method: "GET" });
      const data = await res.json();

      if (data.running) {
        return;
      }

      setIndexing(false);
      const success = !!data.success;
      setResult({
        success,
        message: success
          ? "Indexierung abgeschlossen. Suche ist jetzt aktualisiert."
          : data.message || "Indexierung fehlgeschlagen.",
      });

      if (success && onComplete) {
        setTimeout(onComplete, 2000);
      }

      if (success && typeof window !== "undefined") {
        window.dispatchEvent(new Event("sources-updated"));
      }
    } catch {
      setIndexing(false);
      setResult({
        success: false,
        message: "Status konnte nicht abgefragt werden.",
      });
    }
  }, [onComplete]);

  useEffect(() => {
    if (!indexing) return;

    const timer = setInterval(() => {
      pollStatus();
    }, 2500);

    return () => clearInterval(timer);
  }, [indexing, pollStatus]);

  const handleIndex = async () => {
    setResult(null);

    try {
      const res = await fetch("/api/jobs/index-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });
      const data = await res.json();

      if (res.status === 409 && data.running) {
        setIndexing(true);
        setResult({
          success: true,
          message: "Indexierung laeuft bereits im Hintergrund.",
        });
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || "Indexierung fehlgeschlagen");
      }

      setIndexing(true);
      setResult({
        success: true,
        message:
          "Indexierung gestartet. Das kann je nach Anzahl/Groesse der Dateien etwas dauern.",
      });
    } catch {
      setIndexing(false);
      setResult({
        success: false,
        message: "Fehler beim Starten der Indexierung.",
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
        <p className="text-sm text-emerald-200 mb-3">
          Upload erfolgreich. Jetzt indexieren, damit die Suche neue Dateien findet.
        </p>
        <button
          onClick={handleIndex}
          disabled={indexing}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {indexing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Indexierung laeuft...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>Jetzt indexieren</span>
            </>
          )}
        </button>
      </div>

      {result && (
        <div
          className={`p-3 rounded-lg text-sm ${
            result.success
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-200"
              : "bg-red-500/10 border border-red-500/20 text-red-200"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
