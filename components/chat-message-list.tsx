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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessageType } from "@/lib/types";

interface ChatMessageListProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  isHistoryLoading: boolean;
  copiedStates: Record<string, boolean>;
  onCopyCode: (code: string | null | undefined, messageId: string) => void;
  onApplyCode: (codeToApply: string | null | undefined) => void;
  setViewportRef: (element: HTMLDivElement | null) => void; // Ref を受け取るための Prop
}

export const ChatMessageList = React.memo(
  ({
    messages,
    isLoading,
    isHistoryLoading,
    copiedStates,
    onCopyCode,
    onApplyCode,
    setViewportRef, // Prop を受け取る
  }: ChatMessageListProps) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // ScrollArea の Viewport を取得して親コンポーネント (useChat フック) に渡す
    useEffect(() => {
      if (scrollAreaRef.current) {
        const viewportElement = scrollAreaRef.current.querySelector<HTMLDivElement>(
          "div[data-radix-scroll-area-viewport]"
        );
        setViewportRef(viewportElement); // Ref を設定
      }
      // setViewportRef は useCallback でメモ化されている想定
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
                key={message.id} // DB永続化前の仮IDでも動作
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
                    {message.role === "assistant" && message.markdownCode && (
                      <div className="mt-2 flex flex-wrap gap-2 border-t border-muted-foreground/20 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => onCopyCode(message.markdownCode, message.id)}
                        >
                          {copiedStates[message.id] ? (
                            <CheckIcon className="mr-1 h-3 w-3" />
                          ) : (
                            <CopyIcon className="mr-1 h-3 w-3" />
                          )}
                          コードコピー
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => onApplyCode(message.markdownCode)}
                          disabled={!message.markdownCode}
                        >
                          <ClipboardPasteIcon className="mr-1 h-3 w-3" />
                          エディタに適用
                        </Button>
                      </div>
                    )}
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
