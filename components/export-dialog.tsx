"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2Icon } from "lucide-react";

export type ExportFormat = "html" | "markdown";

interface ExportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  exportFormat: ExportFormat;
  includeSpeakerNotes: boolean; // スピーカーノートの状態
  onIncludeSpeakerNotesChange: (checked: boolean) => void; // スピーカーノートの状態変更ハンドラ
  isExporting: boolean;
  onExport: () => void; // エクスポート実行関数
  documentTitle: string;
}

export const ExportDialog = React.memo(
  ({
    isOpen,
    onOpenChange,
    exportFormat,
    includeSpeakerNotes,
    onIncludeSpeakerNotesChange,
    isExporting,
    onExport,
    documentTitle,
  }: ExportDialogProps) => {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{exportFormat.toUpperCase()}としてエクスポート</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* スピーカーノートのチェックボックス (現在は未対応のため disabled) */}
            {/* <div className="flex items-center space-x-2 opacity-50">
              <Checkbox
                id="speaker-notes"
                checked={includeSpeakerNotes}
                onCheckedChange={(checked) => onIncludeSpeakerNotesChange(checked === true)}
                disabled // 未対応のため無効化
              />
              <Label htmlFor="speaker-notes" className="text-muted-foreground">
                スピーカーノートを含める (未対応)
              </Label>
            </div> */}
            <p className="text-sm text-muted-foreground">
              {exportFormat === "html"
                ? "インタラクティブ機能付きのスタンドアロンHTMLファイルを生成します。"
                : "現在のMarkdownコンテンツをファイルとしてダウンロードします。"}
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">キャンセル</Button>
            </DialogClose>
            <Button onClick={onExport} disabled={isExporting}>
              {isExporting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              {isExporting ? "エクスポート中..." : `${exportFormat.toUpperCase()}としてエクスポート`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

ExportDialog.displayName = "ExportDialog";
