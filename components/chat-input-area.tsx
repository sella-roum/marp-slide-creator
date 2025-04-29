"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendIcon } from "lucide-react";
import type { DocumentType } from "@/lib/types";

interface ChatInputAreaProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  isHistoryLoading: boolean;
  currentDocument: DocumentType | null;
  isDbInitialized: boolean;
}

export const ChatInputArea = React.memo(
  ({
    inputValue,
    onInputChange,
    onSendMessage,
    isLoading,
    isHistoryLoading,
    currentDocument,
    isDbInitialized,
  }: ChatInputAreaProps) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSendMessage();
      }
    };

    const isDisabled = isLoading || isHistoryLoading || !currentDocument || !isDbInitialized;
    const placeholderText = !isDbInitialized
      ? "データベース初期化中..."
      : !currentDocument
        ? "ドキュメント読み込み中..."
        : isHistoryLoading
          ? "履歴を読み込み中..."
          : "AIにメッセージを送信...";

    return (
      <div className="flex items-start gap-2 border-t p-4">
        <Textarea
          id="chat-input"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholderText}
          className="max-h-[150px] min-h-[40px] flex-1 resize-none text-sm"
          rows={1}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
        />
        <Button
          onClick={onSendMessage}
          size="icon"
          disabled={isDisabled || !inputValue.trim()}
        >
          <SendIcon className="h-4 w-4" />
        </Button>
      </div>
    );
  }
);

ChatInputArea.displayName = "ChatInputArea";
