// components/custom-css-dialog.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CustomCssDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialCss: string;
  onSave: (newCss: string) => void; // 保存時に新しいCSS文字列を渡す
}

export const CustomCssDialog = React.memo(
  ({ isOpen, onOpenChange, initialCss, onSave }: CustomCssDialogProps) => {
    const [cssValue, setCssValue] = useState(initialCss);

    // ダイアログが開かれたときに初期CSSをセット
    useEffect(() => {
      if (isOpen) {
        setCssValue(initialCss);
      }
    }, [isOpen, initialCss]);

    const handleSave = () => {
      onSave(cssValue); // 保存処理を呼び出し
      onOpenChange(false); // ダイアログを閉じる
    };

    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>カスタムCSS編集</DialogTitle>
            <DialogDescription>
              ここに記述したCSSがスライド全体に適用されます。テーマ設定は「Custom CSS」になります。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="custom-css-textarea">カスタムCSS</Label>
              <Textarea
                id="custom-css-textarea"
                placeholder="/* 例: h1 { color: blue; } */"
                value={cssValue}
                onChange={(e) => setCssValue(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                aria-label="カスタムCSS入力エリア"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSave}>
              保存して適用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

CustomCssDialog.displayName = "CustomCssDialog";
