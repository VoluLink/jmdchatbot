import React from "react";
import {
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { DocumentManager } from "@/components/DocumentManager";
import { FileUploader } from "@/components/FileUploader";
import { UrlSourcesManager } from "@/components/UrlSourcesManager";

export default async function DocumentsPage() {
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
                  Ordnerstruktur basiert auf <span className="font-mono">data/sources</span>
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-300 whitespace-nowrap">Dateien über dieses Interface hochladen und anschließend den Update-Job ausführen, damit sie im Index landen.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <FileUploader />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <DocumentManager />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <UrlSourcesManager />
        </div>
      </div>
    </div>
  );
}
