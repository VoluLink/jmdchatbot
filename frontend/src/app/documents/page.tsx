import React from "react";
import fs from "fs/promises";
import path from "path";
import Link from "next/link";
import {
  FileText,
  FolderOpenDot,
  Link2,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  Eye,
} from "lucide-react";

type RawDocumentMeta = {
  source?: string | null;
  path?: string | null;
  url?: string | null;
  content_hash?: string | null;
};

type DocumentSummary = {
  name: string;
  source: string;
  path: string | null;
  url: string | null;
  parts: number;
  hashCount: number;
  lastHash?: string | null;
};

const METADATA_PATH = path.join(process.cwd(), "..", "data", "doc_metadata.json");

async function loadDocuments() {
  try {
    const raw = await fs.readFile(METADATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, RawDocumentMeta>;

    const grouped = new Map<string, DocumentSummary>();

    Object.values(parsed).forEach((entry) => {
      const key = entry.path ?? entry.url ?? "unknown";
      const source = entry.source ?? (entry.url ? "url" : "local");
      const name = extractFileName(entry.path ?? entry.url ?? "Unbekannt");
      const next: DocumentSummary = grouped.get(key) ?? {
        name,
        source,
        path: entry.path ?? null,
        url: entry.url ?? null,
        parts: 0,
        hashCount: 0,
      };

      next.parts += 1;
      if (entry.content_hash) {
        next.hashCount += 1;
        next.lastHash = entry.content_hash;
      }

      grouped.set(key, next);
    });

    const documents = Array.from(grouped.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    const stat = await fs.stat(METADATA_PATH);

    return {
      documents,
      totalEntries: Object.keys(parsed).length,
      uniqueFiles: documents.length,
      localCount: documents.filter((doc) => doc.source !== "url").length,
      urlCount: documents.filter((doc) => doc.source === "url").length,
      lastUpdated: stat.mtime,
    };
  } catch (error) {
    return {
      documents: [],
      totalEntries: 0,
      uniqueFiles: 0,
      localCount: 0,
      urlCount: 0,
      lastUpdated: null,
    };
  }
}

function extractFileName(rawPath: string) {
  const normalized = rawPath.replace(/\\/g, "/");
  const segments = normalized.split("/");
  return segments[segments.length - 1] || rawPath;
}

export default async function DocumentsPage() {
  const { documents, uniqueFiles, localCount, urlCount, lastUpdated } =
    await loadDocuments();

  return (
    <div className="h-full w-full overflow-y-auto bg-[#212121] text-slate-100 grey-scrollbar">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-base font-semibold uppercase tracking-[0.3em] text-slate-400">
              Knowledge Base
            </p>
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-semibold text-white leading-tight">
                Dokumentenverwaltung
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {lastUpdated
                    ? `Letztes Index-Update: ${lastUpdated.toLocaleString()}`
                    : "Metadaten wurden noch nicht erzeugt"}
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-300 whitespace-nowrap">Dateien über dieses Interface hochladen und anschließend den Update-Job ausführen, damit sie im Index landen.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            icon={<FileText className="w-5 h-5 text-emerald-300" />}
            label="Eindeutige Dateien"
            value={uniqueFiles}
            description="Basierend auf Dateipfad/URL"
          />
          <StatCard
            icon={<FolderOpenDot className="w-5 h-5 text-slate-200" />}
            label="Lokale Dateien"
            value={localCount}
            description="Im Verzeichnis data/sources"
          />
          <StatCard
            icon={<Link2 className="w-5 h-5 text-amber-300" />}
            label="Remote Quellen"
            value={urlCount}
            description="Über URLs eingebunden"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white/5 border border-white/10 rounded-3xl shadow-2xl shadow-black/40 p-6 backdrop-blur-lg space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-slate-50">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white">Dateien auswählen</h3>
                <p className="text-sm text-slate-200">
                  Ziehe Dateien hierher oder wähle sie aus. Unterstützt Mehrfachauswahl.
                </p>
              </div>
            </div>
            <label
              htmlFor="document-upload"
              className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/15 shadow-2xl shadow-black/30 text-slate-50 text-sm font-semibold transition-all hover:bg-white/20 hover:border-white/25 cursor-pointer w-full justify-center"
            >
              <UploadCloud className="w-5 h-5" />
              <span>Dateien auswählen</span>
              <input id="document-upload" type="file" multiple className="hidden" />
            </label>
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-300">
              Noch keine Dateien ausgewählt.
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl shadow-2xl shadow-black/40 p-6 backdrop-blur-lg space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white">Update-Job ausführen</h3>
              <p className="text-sm text-slate-200">
                Nach dem Upload den Index aktualisieren. Starte den Job im Backend-Terminal.
              </p>
            </div>
            <button className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 bg-white/5 backdrop-blur-md text-sm font-semibold text-slate-100 shadow-sm shadow-black/20 hover:bg-white/10 hover:border-white/25 w-full md:w-auto">
              <RefreshCw className="w-4 h-4" />
              <span>Update-Job (CLI)</span>
            </button>
            <p className="text-sm text-slate-300">
              Hinweis: Der Upload-Button legt Dateien nur lokal ab. Der Job baut/aktualisiert den Index.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/30 overflow-hidden backdrop-blur-lg">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Indexierte Dokumente
                </h3>
                <p className="text-sm text-slate-300">
                  Gruppen nach physischem Pfad oder URL (inkl. gesplitteter Dateien)
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="hidden md:inline">Sortiert A→Z</span>
              </div>
            </div>
            <div className="divide-y divide-white/10">
              {documents.length === 0 ? (
                <div className="px-5 py-8 text-sm text-slate-300">
                  Keine Metadaten gefunden. Führen Sie zunächst den Update-Job aus.
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={`${doc.path ?? doc.url}`}
                    className="px-5 py-4 flex flex-col gap-2 hover:bg-white/5 transition-colors rounded-lg group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <Link
                        href={`/documents/${encodeURIComponent(doc.name)}`}
                        className="flex items-start gap-3 flex-1 cursor-pointer"
                      >
                        <div className="mt-0.5 h-9 w-9 rounded-lg bg-white/10 text-slate-100 flex items-center justify-center border border-white/15 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-colors">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white break-all group-hover:text-indigo-300 transition-colors">
                            {doc.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Klicken zum Ansehen
                          </p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/documents/${encodeURIComponent(doc.name)}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/50"
                        >
                          <Eye className="w-3 h-3" />
                          Ansehen
                        </Link>
                        <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300/40 bg-red-500/10 text-xs font-semibold text-red-100 hover:bg-red-500/20 hover:border-red-200/60">
                          Löschen
                        </button>
                      </div>
                    </div>
                    <details className="group/details text-xs text-slate-300">
                      <summary className="cursor-pointer select-none inline-flex items-center gap-2 text-slate-200 hover:text-white">
                        <span className="inline-flex items-center px-2 py-1 rounded-full border border-white/15 bg-white/5 text-[11px]">
                          Details
                        </span>
                      </summary>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/15 bg-white/5">
                          {doc.source === "url" ? "URL" : "Local"}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span>{doc.parts} Teile</span>
                        <span className="text-slate-500">•</span>
                        <span>{doc.hashCount} Hashes</span>
                        <div className="w-full text-slate-400 break-all">
                          {doc.path ?? doc.url ?? "–"}
                        </div>
                      </div>
                    </details>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-black/30 p-5 space-y-3 backdrop-blur-lg">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-white/10 text-slate-100 flex items-center justify-center border border-white/15">
          {icon}
        </div>
        <div className="space-y-0.5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{label}</p>
          <p className="text-3xl font-semibold text-white">{value}</p>
        </div>
      </div>
      <p className="text-xs text-slate-300">{description}</p>
    </div>
  );
}
