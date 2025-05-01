"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DownloadIcon } from "lucide-react";
import { useExporter } from "@/hooks/use-exporter";
import { ExportDialog } from "./export-dialog";
import type { DocumentType } from "@/lib/types"; // ★ DocumentType をインポート

interface ExportDropdownProps {
  currentDocument: DocumentType | null; // ★ 変更
}

export const ExportDropdown = React.memo(({ currentDocument }: ExportDropdownProps) => { // ★ Props を変更
  // ★ useExporter に currentDocument を渡す
  const {
    isExporting,
    exportFormat,
    includeSpeakerNotes,
    isDialogOpen,
    openExportDialog,
    handleOpenChange,
    handleIncludeSpeakerNotesChange,
    handleExport,
  } = useExporter({ currentDocument });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* ★ disabled 属性を追加 */}
          <Button variant="outline" size="sm" disabled={!currentDocument}>
            <DownloadIcon className="mr-1 h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => openExportDialog("html")} disabled={!currentDocument}>
            HTMLとしてエクスポート
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openExportDialog("markdown")} disabled={!currentDocument}>
            Markdownとしてエクスポート
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExportDialog
        isOpen={isDialogOpen}
        onOpenChange={handleOpenChange}
        exportFormat={exportFormat}
        includeSpeakerNotes={includeSpeakerNotes}
        onIncludeSpeakerNotesChange={handleIncludeSpeakerNotesChange}
        isExporting={isExporting}
        onExport={handleExport}
        // ★ documentTitle を currentDocument から取得
        documentTitle={currentDocument?.title || "Untitled"}
      />
    </>
  );
});

ExportDropdown.displayName = "ExportDropdown";
