"use client";

import React from "react"; // useState, useCallback は不要に
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Dialog 関連のインポートは不要に
// Checkbox, Label も不要に
// downloadFile, processMarkdownForRender も不要に
import { DownloadIcon } from "lucide-react"; // Loader2Icon は ExportDialog 内
// Marp のインポートも不要に
import { useExporter } from "@/hooks/use-exporter"; // 作成したフックをインポート
import { ExportDialog } from "./export-dialog"; // 作成したダイアログをインポート

interface ExportDropdownProps {
  markdown: string;
  documentTitle: string;
}

export const ExportDropdown = React.memo(({ markdown, documentTitle }: ExportDropdownProps) => {
  // useExporter フックから状態と関数を取得
  const {
    isExporting,
    exportFormat,
    includeSpeakerNotes,
    isDialogOpen,
    openExportDialog,
    handleOpenChange,
    handleIncludeSpeakerNotesChange,
    handleExport,
  } = useExporter({ markdown, documentTitle });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <DownloadIcon className="mr-1 h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* DropdownMenuItem をクリックしたらダイアログを開く */}
          <DropdownMenuItem onSelect={() => openExportDialog("html")}>
            HTMLとしてエクスポート
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openExportDialog("markdown")}>
            Markdownとしてエクスポート
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ExportDialog をレンダリングし、状態とハンドラを渡す */}
      <ExportDialog
        isOpen={isDialogOpen}
        onOpenChange={handleOpenChange}
        exportFormat={exportFormat}
        includeSpeakerNotes={includeSpeakerNotes}
        onIncludeSpeakerNotesChange={handleIncludeSpeakerNotesChange}
        isExporting={isExporting}
        onExport={handleExport}
        documentTitle={documentTitle}
      />
    </>
  );
});

ExportDropdown.displayName = "ExportDropdown";
