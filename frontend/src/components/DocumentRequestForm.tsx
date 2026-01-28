"use client";

import { useState } from "react";
import {
  FileText,
  Send,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type RequestStatus = "idle" | "submitting" | "success" | "error";

export function DocumentRequestForm() {
  const [requestType, setRequestType] = useState<"text" | "file">("text");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (requestType === "text" && !description.trim()) {
      setErrorMessage("Bitte geben Sie eine Beschreibung ein");
      return;
    }

    if (requestType === "file" && !file) {
      setErrorMessage("Bitte wählen Sie eine Datei aus");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("type", requestType);

      if (requestType === "text") {
        formData.append("description", description);
      } else {
        formData.append("file", file!);
        if (description.trim()) {
          formData.append("description", description);
        }
      }

      const res = await fetch("/api/document-requests", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setStatus("success");
      setDescription("");
      setFile(null);

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setStatus("idle");
      }, 3000);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleClearFile = () => {
    setFile(null);
    const fileInput = document.getElementById("file-input") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl shadow-2xl shadow-black/40 p-6 backdrop-blur-lg space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-slate-50">
          <FileText className="w-5 h-5" />
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="text-lg font-semibold text-white">Dokument vorschlagen</h3>
          <p className="text-sm text-slate-200">
            Schlagen Sie neue Dokumente vor, die zur Wissensdatenbank hinzugefügt werden sollen.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Request Type Toggle */}
        <div className="flex gap-2 p-1 bg-black/20 rounded-lg">
          <button
            type="button"
            onClick={() => setRequestType("text")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              requestType === "text"
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Textbeschreibung
          </button>
          <button
            type="button"
            onClick={() => setRequestType("file")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              requestType === "file"
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Datei hochladen
          </button>
        </div>

        {/* Text Description */}
        {requestType === "text" && (
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Beschreibung des gewünschten Dokuments
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z.B. Ich benötige Informationen über..."
              rows={5}
              className="w-full px-4 py-3 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
            />
          </div>
        )}

        {/* File Upload */}
        {requestType === "file" && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Datei hochladen
              </label>
              {!file ? (
                <label
                  htmlFor="file-input"
                  className="flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed border-white/15 rounded-lg cursor-pointer hover:border-white/25 hover:bg-white/5 transition-all"
                >
                  <Upload className="w-10 h-10 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-300">
                    Klicken Sie hier, um eine Datei auszuwählen
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    PDF, DOCX, PPTX, TXT, etc.
                  </p>
                  <input
                    id="file-input"
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                  <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    title="Datei entfernen"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Zusätzliche Anmerkungen (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z.B. Bitte im Ordner 'Beratung' speichern..."
                rows={3}
                className="w-full px-4 py-3 bg-black/30 border border-white/15 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Message */}
        {status === "success" && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-200">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Ihre Anfrage wurde erfolgreich eingereicht!</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            status === "submitting" ||
            (requestType === "text" && !description.trim()) ||
            (requestType === "file" && !file)
          }
          className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/15 shadow-2xl shadow-black/30 text-slate-50 text-sm font-semibold transition-all hover:bg-white/20 hover:border-white/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Wird eingereicht...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Anfrage einreichen</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
