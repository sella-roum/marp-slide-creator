import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BotIcon,
  UserIcon,
  CopyIcon,
  CheckIcon,
  Loader2Icon,
  ClipboardPasteIcon,
} from "lucide-react";
import type { ChatMessageType } from "@/lib/types";

interface ChatMessageItemProps {
  message: ChatMessageType;
  isBotLoading?: boolean;
  copiedStates: Record<string, boolean>;
  onCopyCode: (code: string | null | undefined, messageId: string) => void;
  onApplyCode: (codeToApply: string | null | undefined) => void;
}

export const ChatMessageItem = React.memo(
  ({
    message,
    isBotLoading = false,
    copiedStates,
    onCopyCode,
    onApplyCode,
  }: ChatMessageItemProps) => {
    if (isBotLoading) {
      // ローディング中のボットメッセージスケルトン
      return (
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
      );
    }

    // 通常のメッセージ表示
    return (
      <div
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
    );
  }
);

ChatMessageItem.displayName = "ChatMessageItem";
