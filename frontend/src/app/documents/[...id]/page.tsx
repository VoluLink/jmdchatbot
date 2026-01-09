"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Download, ExternalLink, Hash, Layers } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { encodePathSegments } from "@/lib/utils";

interface DocumentInfo {
  name: string;
  relativePath: string; // relative to data/sources
  source: string;
  url: string | null;
}

function safeDecode(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export default function DocumentViewPage() {
  const params = useParams();
  const router = useRouter();
  const [docInfo, setDocInfo] = useState<DocumentInfo | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const relativePath = useMemo(() => {
    const raw = params.id as string | string[] | undefined;
    if (!raw) return "";
    const segments = Array.isArray(raw) ? raw : [raw];
    return segments.map(safeDecode).join("/");
  }, [params.id]);

  useEffect(() => {
    if (!relativePath) return;

    const name = relativePath.split("/").filter(Boolean).pop() ?? relativePath;
    setDocInfo({
      name,
      relativePath,
      url: null,
      source: "local",
    });

    // Fetch text preview for supported formats
    const lowerName = name.toLowerCase();
    if (lowerName.endsWith('.docx') || lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.doc')) {
      setLoadingPreview(true);
      fetch(`/api/documents/preview/${encodePathSegments(relativePath)}`)
        .then(res => res.json())
        .then(data => {
          setTextPreview(data.text || "Kein Inhalt verfügbar.");
        })
        .catch(() => {
          setTextPreview("Fehler beim Laden der Vorschau.");
        })
        .finally(() => {
          setLoadingPreview(false);
        });
    }
  }, [relativePath]);

  if (!docInfo) {
    return (
      <div className="h-full flex items-center justify-center bg-[#212121]">
        <div className="animate-spin h-8 w-8 border-2 border-white/20 border-t-white rounded-full" />
      </div>
    );
  }

  const isPdf = docInfo.name.toLowerCase().endsWith(".pdf");
  const apiPath = `/api/documents/${encodePathSegments(docInfo.relativePath)}`;

  return (
    <div className="h-full bg-[#212121] text-slate-100 flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white truncate max-w-[500px]">
                  {docInfo.name}
                </h1>
                <p className="text-xs text-slate-400">data/sources/{docInfo.relativePath}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/documents"
              className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              Alle Dokumente
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Document Info Sidebar */}
        <div className="w-80 border-r border-white/10 p-6 overflow-y-auto">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Dokument-Details
          </h2>

          <div className="space-y-4">
            <InfoRow icon={<FileText className="h-4 w-4" />} label="Dateiname" value={docInfo.name} />
            <InfoRow
              icon={<Layers className="h-4 w-4" />}
              label="Quelle"
              value={docInfo.source === "url" ? "Remote (URL)" : "Lokal"}
            />
            <InfoRow
              icon={<Hash className="h-4 w-4" />}
              label="Pfad"
              value={`data/sources/${docInfo.relativePath}`}
            />
          </div>

          <div className="mt-8 space-y-3">
            {isPdf && (
              <a
                href={apiPath}
                download={docInfo.name}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium"
              >
                <Download className="h-4 w-4" />
                PDF herunterladen
              </a>
            )}
            {docInfo.url && (
              <a
                href={docInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium border border-white/10"
              >
                <ExternalLink className="h-4 w-4" />
                Original öffnen
              </a>
            )}
          </div>
        </div>

        {/* Document Preview */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            {isPdf ? (
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden h-[calc(100vh-200px)]">
                <iframe src={apiPath} className="w-full h-full" title={docInfo.name} />
              </div>
            ) : loadingPreview ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-8">
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-4" />
                  <p className="text-sm text-slate-300">Lade Vorschau…</p>
                </div>
              </div>
            ) : textPreview !== null ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-8">
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-slate-200 font-sans leading-relaxed">
                    {textPreview}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
                <FileText className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Vorschau nicht verfügbar</h3>
                <p className="text-slate-400 text-sm">
                  Für diesen Dateityp ist keine Vorschau verfügbar.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-slate-200 break-all">{value}</p>
      </div>
    </div>
  );
}


