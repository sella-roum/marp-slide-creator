"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { preprocessMarkdownForExport, generateInteractiveHtml } from "@/lib/exportUtils"; // 作成したユーティリティをインポート
import { downloadFile } from "@/lib/utils"; // downloadFile は既存の utils から
import type { ExportFormat } from "@/components/export-dialog"; // ExportFormat 型をインポート

interface UseExporterProps {
  markdown: string;
  documentTitle: string;
}

export function useExporter({ markdown, documentTitle }: UseExporterProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("html");
  const [includeSpeakerNotes, setIncludeSpeakerNotes] = useState(false); // スピーカーノートの状態
  const [isDialogOpen, setIsDialogOpen] = useState(false); // ダイアログの開閉状態

  // エクスポート処理
  const handleExport = useCallback(async () => {
    if (!markdown) {
      toast({
        title: "エラー",
        description: "エクスポートするコンテンツがありません",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      // Markdown の前処理 (画像参照解決、Marp ディレクティブ追加)
      const processedMarkdown = await preprocessMarkdownForExport(markdown);

      if (exportFormat === "markdown") {
        downloadFile(processedMarkdown, `${documentTitle}.md`, "text/markdown");
        toast({ title: "成功", description: `MARKDOWNとしてエクスポートしました` });
      } else if (exportFormat === "html") {
        // Marp Core を動的にインポート
        const { Marp } = await import(/* webpackChunkName: "marp-core" */ "@marp-team/marp-core");
        const marp = new Marp({ html: true, math: true, minifyCSS: false });
        const { html, css } = marp.render(processedMarkdown);

        // インタラクティブHTMLを生成
        const fullHTML = generateInteractiveHtml(html, css, documentTitle);

        downloadFile(fullHTML, `${documentTitle}.html`, "text/html");
        toast({ title: "成功", description: `HTMLとしてエクスポートしました` });
      }

      setIsDialogOpen(false); // 成功したらダイアログを閉じる
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "エクスポート失敗",
        description: `エクスポート中にエラー: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [markdown, documentTitle, exportFormat, toast]); // includeSpeakerNotes は未実装のため依存配列から除外

  // ダイアログを開く関数 (フォーマット指定付き)
  const openExportDialog = useCallback((format: ExportFormat) => {
    setExportFormat(format);
    setIsDialogOpen(true);
  }, []);

  // ダイアログの開閉状態ハンドラ
  const handleOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // ダイアログが閉じられたらエクスポート状態をリセット
      setIsExporting(false);
    }
  }, []);

  // スピーカーノートの状態変更ハンドラ
  const handleIncludeSpeakerNotesChange = useCallback((checked: boolean) => {
    setIncludeSpeakerNotes(checked);
    // ここでスピーカーノートを含める処理を実装する（将来的に）
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
