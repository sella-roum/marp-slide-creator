"use client";

import React, { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  BotIcon,
  UserIcon,
  CopyIcon,
  CheckIcon,
  Loader2Icon,
  ClipboardPasteIcon,
  PaletteIcon, // ★ PaletteIcon をインポート
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessageType } from "@/lib/types";

// --- ▼ Props を修正 ▼ ---
interface ChatMessageListProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  isHistoryLoading: boolean;
  copiedStates: Record<string, boolean>; // キーが 'md-' or 'css-' プレフィックス付きになる
  onCopyMarkdown: (code: string | null | undefined, messageId: string) => void;
  onCopyCss: (code: string | null | undefined, messageId: string) => void;
  onApplyMarkdown: (codeToApply: string | null | undefined) => void;
  onApplyCss: (codeToApply: string | null | undefined) => void;
  setViewportRef: (element: HTMLDivElement | null) => void;
}
// --- ▲ Props を修正 ▲ ---

export const ChatMessageList = React.memo(
  ({
    messages,
    isLoading,
    isHistoryLoading,
    copiedStates,
    onCopyMarkdown, // 受け取る
    onCopyCss,      // 受け取る
    onApplyMarkdown,// 受け取る
    onApplyCss,     // 受け取る
    setViewportRef,
  }: ChatMessageListProps) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (scrollAreaRef.current) {
        const viewportElement = scrollAreaRef.current.querySelector<HTMLDivElement>(
          "div[data-radix-scroll-area-viewport]"
        );
        setViewportRef(viewportElement);
      }
    }, [setViewportRef]);

    return (
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {isHistoryLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isHistoryLoading && messages.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              チャット履歴はありません。
            </div>
          )}
          {!isHistoryLoading &&
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-6 w-6 flex-shrink-0 self-start">
                    <AvatarFallback>
                      <BotIcon className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                {message.role !== "system" && (
                  <div
                    className={`max-w-[85%] rounded-lg p-3 md:max-w-[75%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    } whitespace-pre-wrap break-words`}
                  >
                    {message.content}
                    {/* --- ▼ ボタン表示ロジックを修正 ▼ --- */}
                    {message.role === "assistant" && (message.slideMarkdown || message.cssCode) && (
                      <div className="mt-2 flex flex-wrap gap-2 border-t border-muted-foreground/20 pt-2">
                        {/* Markdown用ボタン */}
                        {message.slideMarkdown && (
                          <>
                            <Button
                              variant="ghost" size="sm" className="h-7 px-2 text-xs"
                              onClick={() => onCopyMarkdown(message.slideMarkdown, message.id)}
                              aria-label={`メッセージ ${message.id} のMarkdownコードをコピー`}
                            >
                              {copiedStates[`md-${message.id}`] ? <CheckIcon className="mr-1 h-3 w-3" /> : <CopyIcon className="mr-1 h-3 w-3" />}
                              Markdownコピー
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-7 px-2 text-xs"
                              onClick={() => onApplyMarkdown(message.slideMarkdown)}
                              aria-label={`メッセージ ${message.id} のMarkdownコードをエディタに適用`}
                            >
                              <ClipboardPasteIcon className="mr-1 h-3 w-3" />
                              エディタに適用
                            </Button>
                          </>
                        )}
                        {/* CSS用ボタン */}
                        {message.cssCode && (
                          <>
                            <Button
                              variant="ghost" size="sm" className="h-7 px-2 text-xs"
                              onClick={() => onCopyCss(message.cssCode, message.id)}
                              aria-label={`メッセージ ${message.id} のCSSコードをコピー`}
                            >
                              {copiedStates[`css-${message.id}`] ? <CheckIcon className="mr-1 h-3 w-3" /> : <CopyIcon className="mr-1 h-3 w-3" />}
                              CSSコピー
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-7 px-2 text-xs"
                              onClick={() => onApplyCss(message.cssCode)}
                              aria-label={`メッセージ ${message.id} のCSSコードをカスタムCSSに適用`}
                            >
                              <PaletteIcon className="mr-1 h-3 w-3" /> {/* アイコン例 */}
                              CSSに適用
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                    {/* --- ▲ ボタン表示ロジックを修正 ▲ --- */}
                  </div>
                )}
                {message.role === "system" && (
                  <div className="my-2 w-full rounded bg-destructive/10 px-2 py-1 text-center text-xs italic text-destructive">
                    {message.content}
                  </div>
                )}
                {message.role === "user" && (
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarFallback>
                      <UserIcon className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          {isLoading && !isHistoryLoading && (
            <div className="flex items-end justify-start gap-2">
              <Avatar className="h-6 w-6 flex-shrink-0 self-start">
                <AvatarFallback>
                  <BotIcon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="max-w-[75%] rounded-lg bg-muted p-3">
                <Skeleton className="flex h-4 w-16 items-center">
                  <Loader2Icon className="h-3 w-3 animate-spin" />
                </Skeleton>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  }
);

ChatMessageList.displayName = "ChatMessageList";
