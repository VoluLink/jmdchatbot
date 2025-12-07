"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Download, ExternalLink, Calendar, Hash, Layers } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

interface DocumentInfo {
  name: string;
  path: string | null;
  url: string | null;
  source: string;
}

export default function DocumentViewPage() {
  const params = useParams();
  const router = useRouter();
  const [docInfo, setDocInfo] = useState<DocumentInfo | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  // Decode the document ID (which is the encoded filename)
  const documentId = decodeURIComponent(params.id as string);

  useEffect(() => {
    // Create document info from the ID
    const info: DocumentInfo = {
      name: documentId,
      path: `data/sources/${documentId}`,
      url: null,
      source: "local"
    };
    setDocInfo(info);

    // Try to load the PDF - in a real app this would be an API endpoint
    // For now, we'll just set a relative path
    if (documentId.toLowerCase().endsWith('.pdf')) {
      setPdfUrl(`/api/documents/${encodeURIComponent(documentId)}`);
    }
  }, [documentId]);

  if (!docInfo) {
    return (
      <div className="h-full flex items-center justify-center bg-[#212121]">
        <div className="animate-spin h-8 w-8 border-2 border-white/20 border-t-white rounded-full" />
      </div>
    );
  }

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
                <p className="text-xs text-slate-400">
                  {docInfo.path || docInfo.url}
                </p>
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
            <InfoRow 
              icon={<FileText className="h-4 w-4" />}
              label="Dateiname"
              value={docInfo.name}
            />
            <InfoRow 
              icon={<Layers className="h-4 w-4" />}
              label="Quelle"
              value={docInfo.source === "url" ? "Remote (URL)" : "Lokal"}
            />
            <InfoRow 
              icon={<Hash className="h-4 w-4" />}
              label="Pfad"
              value={docInfo.path || docInfo.url || "–"}
            />
          </div>

          <div className="mt-8 space-y-3">
            {docInfo.path && docInfo.path.toLowerCase().endsWith('.pdf') && (
              <a
                href={`/api/documents/${encodeURIComponent(docInfo.name)}`}
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
            {docInfo.name.toLowerCase().endsWith('.pdf') ? (
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden h-[calc(100vh-200px)]">
                <iframe
                  src={`/api/documents/${encodeURIComponent(docInfo.name)}`}
                  className="w-full h-full"
                  title={docInfo.name}
                />
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
                <FileText className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Vorschau nicht verfügbar
                </h3>
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

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

