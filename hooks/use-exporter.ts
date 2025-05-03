// hooks/use-exporter.ts
"use client";

import { useState, useCallback } from "react";
// ★ preprocessMarkdownForExport, generateInteractiveHtml をインポート
import { preprocessMarkdownForExport, generateInteractiveHtml } from "@/lib/exportUtils";
// ★ downloadFile, updateMarkdownTheme をインポート (updateMarkdownTheme はHTML生成時に必要)
import { downloadFile, updateMarkdownTheme } from "@/lib/utils";
import type { ExportFormat } from "@/components/export-dialog";
import { useErrorHandler } from "@/hooks/use-error-handler";
import type { DocumentType } from "@/lib/types";
import { processMarkdownForRender } from "@/lib/markdown-processor"; // ★ processMarkdownForRender をインポート

interface UseExporterProps {
  currentDocument: DocumentType | null;
}

export function useExporter({ currentDocument }: UseExporterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { handleError } = useErrorHandler();
  const [exportFormat, setExportFormat] = useState<ExportFormat>("html");
  const [includeSpeakerNotes, setIncludeSpeakerNotes] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // エクスポート処理
  const handleExport = useCallback(async () => {
    if (!currentDocument) {
      handleError({ error: new Error("No document selected for export."), context: "ファイルのエクスポート" });
      return;
    }
    const { content: markdown, title: documentTitle, selectedTheme, customCss } = currentDocument;

    if (!markdown) {
      console.warn("Export attempted with no markdown content.");
      return;
    }

    setIsExporting(true);

    try {
      if (exportFormat === "markdown") {
        const processedMarkdown = await preprocessMarkdownForExport(markdown, selectedTheme);
        downloadFile(processedMarkdown, `${documentTitle}.md`, "text/markdown");
      } else if (exportFormat === "html") {
        // ★ HTML生成時は元のMarkdownから画像参照を解決
        const processedMarkdownImages = await processMarkdownForRender(markdown, new Map(), () => {});
        // ★ 適用するテーマを決定
        const themeToRender = selectedTheme === 'custom' ? 'default' : selectedTheme;
        // ★ テーマディレクティブを更新したMarkdownを生成
        const markdownWithTheme = updateMarkdownTheme(processedMarkdownImages, themeToRender);

        const { Marp } = await import(/* webpackChunkName: "marp-core" */ "@marp-team/marp-core");
        const marp = new Marp({ html: true, math: true, minifyCSS: false });
        // ★ テーマ反映済みのMDをレンダリング
        const { html, css } = marp.render(markdownWithTheme);

        // ★ generateInteractiveHtml に selectedTheme と customCss を渡す
        const fullHTML = generateInteractiveHtml(html, css, documentTitle, selectedTheme, customCss);

        downloadFile(fullHTML, `${documentTitle}.html`, "text/html");
      }

      setIsDialogOpen(false);
    } catch (error) {
      handleError({ error, context: "ファイルのエクスポート" });
    } finally {
      setIsExporting(false);
    }
  }, [currentDocument, exportFormat, handleError]);

  // ダイアログを開く関数
  const openExportDialog = useCallback((format: ExportFormat) => {
    setExportFormat(format);
    setIsDialogOpen(true);
  }, []);

  // ダイアログの開閉状態ハンドラ
  const handleOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setIsExporting(false);
    }
  }, []);

  // スピーカーノートの状態変更ハンドラ
  const handleIncludeSpeakerNotesChange = useCallback((checked: boolean) => {
    setIncludeSpeakerNotes(checked);
    console.log("Include speaker notes:", checked);
  }, []);


  return {
    isExporting,
    exportFormat,
    includeSpeakerNotes,
    isDialogOpen,
    openExportDialog,
    handleOpenChange,
    handleIncludeSpeakerNotesChange,
    handleExport,
  };
}
