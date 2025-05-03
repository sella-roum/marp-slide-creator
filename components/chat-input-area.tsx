// components/chat-input-area.tsx
"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendIcon, MessageCircleIcon, FileTextIcon, PaletteIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DocumentType, GeminiTaskType } from "@/lib/types";
import { cn } from "@/lib/utils"; // cnユーティリティをインポート

interface ChatInputAreaProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  isHistoryLoading: boolean;
  currentDocument: DocumentType | null;
  isDbInitialized: boolean;
  selectedTaskType: GeminiTaskType;
  onTaskTypeChange: (taskType: GeminiTaskType) => void;
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
    selectedTaskType,
    onTaskTypeChange,
  }: ChatInputAreaProps) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSendMessage();
      }
    };

    const isDisabled = isLoading || isHistoryLoading || !currentDocument || !isDbInitialized;

    let placeholderText = "AIにメッセージを送信...";
    if (!isDbInitialized) {
      placeholderText = "データベース初期化中...";
    } else if (!currentDocument) {
      placeholderText = "ドキュメント読み込み中...";
    } else if (isHistoryLoading) {
      placeholderText = "履歴を読み込み中...";
    } else if (selectedTaskType === "GenerateSlideContent") {
      placeholderText = "作成したいスライドの概要や指示を入力...";
    } else if (selectedTaskType === "GenerateTheme") {
      placeholderText = "作成したいテーマの要望を入力 (例: 青系のクールなテーマ)...";
    } else { // GeneralConsultation
      placeholderText = "AIへの質問や相談を入力...";
    }

    // --- ▼ 選択状態のスタイルを定義 ▼ ---
    const selectedStyle = "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground focus-visible:ring-primary/50";
    // --- ▲ 選択状態のスタイルを定義 ▲ ---

    return (
      <div className="border-t p-4">
        <div className="mb-2 flex items-center justify-start space-x-1">
          <span className="text-xs text-muted-foreground mr-2">AIへの依頼:</span>
          <TooltipProvider delayDuration={100}>
            <ToggleGroup
              type="single"
              variant="outline" // variant="outline" は維持
              size="sm"
              value={selectedTaskType}
              onValueChange={(value) => {
                if (value) onTaskTypeChange(value as GeminiTaskType);
              }}
              aria-label="AIへの依頼タイプ選択"
              disabled={isDisabled}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* ▼ className を修正し、選択状態のスタイルを適用 ▼ */}
                  <ToggleGroupItem
                    value="GenerateSlideContent"
                    aria-label="スライド作成"
                    className={cn(
                      // 選択されている場合に selectedStyle を適用
                      selectedTaskType === "GenerateSlideContent" && selectedStyle
                    )}
                  >
                    <FileTextIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                  {/* ▲ className を修正 ▲ */}
                </TooltipTrigger>
                <TooltipContent>スライド作成</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* ▼ className を修正し、選択状態のスタイルを適用 ▼ */}
                  <ToggleGroupItem
                    value="GenerateTheme"
                    aria-label="テーマCSS生成"
                    className={cn(
                      // 選択されている場合に selectedStyle を適用
                      selectedTaskType === "GenerateTheme" && selectedStyle
                    )}
                 >
                    <PaletteIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                  {/* ▲ className を修正 ▲ */}
                </TooltipTrigger>
                <TooltipContent>テーマCSS生成</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* ▼ className を修正し、選択状態のスタイルを適用 ▼ */}
                  <ToggleGroupItem
                    value="GeneralConsultation"
                    aria-label="相談・質問"
                    className={cn(
                      // 選択されている場合に selectedStyle を適用
                      selectedTaskType === "GeneralConsultation" && selectedStyle
                    )}
                 >
                    <MessageCircleIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                  {/* ▲ className を修正 ▲ */}
                </TooltipTrigger>
                <TooltipContent>相談・質問</TooltipContent>
              </Tooltip>
            </ToggleGroup>
          </TooltipProvider>
        </div>

        <div className="flex items-start gap-2">
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
            aria-label="メッセージを送信"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }
);

ChatInputArea.displayName = "ChatInputArea";
