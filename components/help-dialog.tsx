"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2Icon, AlertCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HelpDialog = React.memo(({ isOpen, onOpenChange }: HelpDialogProps) => {
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !markdownContent && !isLoading && !error) {
      setIsLoading(true);
      setError(null);
      fetch('/document.md') // public ディレクトリのファイルにアクセス
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`ヘルプファイルの読み込みに失敗しました: ${response.status} ${response.statusText}`);
          }
          const text = await response.text();
          setMarkdownContent(text);
        })
        .catch((err) => {
          console.error("Failed to fetch help document:", err);
          setError(err instanceof Error ? err.message : "ヘルプファイルの読み込み中に不明なエラーが発生しました。");
          setMarkdownContent(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, markdownContent, isLoading, error]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>操作説明</DialogTitle>
          <DialogDescription>
            AI-Assisted Marp Slide Creator の基本的な使い方です。
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 my-0">
          <div className="p-6">
            {isLoading && (
              <div className="flex items-center justify-center py-10">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2 text-muted-foreground">読み込み中...</p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center py-10 text-destructive">
                <AlertCircleIcon className="mb-2 h-8 w-8" />
                <p>{error}</p>
              </div>
            )}
            {!isLoading && !error && markdownContent && (
              // ★ prose クラスにコードブロックの文字色指定を追加
              <article className={cn(
                "prose prose-sm dark:prose-invert max-w-none",
                "prose-headings:font-semibold prose-a:text-primary hover:prose-a:underline",
                // ライトテーマ時のインラインコード: 暗い文字、明るい背景
                "prose-code:text-gray-900 prose-code:bg-gray-100",
                "prose-code:before:content-none prose-code:after:content-none prose-code:font-mono prose-code:text-sm prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
                // ダークテーマ時のインラインコード: 明るい文字、暗い背景
                "dark:prose-code:text-gray-100 dark:prose-code:bg-gray-800",
                // ライトテーマ時のコードブロック: 暗い文字、明るい背景
                "prose-pre:bg-gray-100 prose-pre:text-gray-900",
                "prose-pre:p-4 prose-pre:rounded-md prose-pre:text-sm",
                 // ダークテーマ時のコードブロック: 明るい文字、暗い背景
                "dark:prose-pre:bg-gray-900 dark:prose-pre:text-gray-100"
              )}>
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                  {markdownContent}
                </ReactMarkdown>
              </article>
            )}
            {!isLoading && !error && !markdownContent && (
               <div className="flex items-center justify-center py-10 text-muted-foreground">
                 ヘルプコンテンツが見つかりません。
               </div>
            )}
          </div>
        </ScrollArea>
        {/* 
        <DialogFooter className="p-6 pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              閉じる
            </Button>
          </DialogClose>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
});

HelpDialog.displayName = "HelpDialog";
