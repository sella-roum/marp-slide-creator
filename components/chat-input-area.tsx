// components/chat-input-area.tsx
"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendIcon, MessageCircleIcon, FileTextIcon, PaletteIcon } from "lucide-react"; // ★ アイコン修正
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DocumentType, GeminiTaskType } from "@/lib/types"; // ★ GeminiTaskType をインポート

interface ChatInputAreaProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  isHistoryLoading: boolean;
  currentDocument: DocumentType | null;
  isDbInitialized: boolean;
  selectedTaskType: GeminiTaskType; // ★ 追加
  onTaskTypeChange: (taskType: GeminiTaskType) => void; // ★ 追加
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
    selectedTaskType, // ★ 受け取る
    onTaskTypeChange, // ★ 受け取る
  }: ChatInputAreaProps) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSendMessage();
      }
    };

    const isDisabled = isLoading || isHistoryLoading || !currentDocument || !isDbInitialized;

    // ★ プレースホルダーを選択中のタスクタイプに応じて変更
    let placeholderText = "AIにメッセージを送信...";
    if (!isDbInitialized) {
      placeholderText = "データベース初期化中...";
    } else if (!currentDocument) {
      placeholderText = "ドキュメント読み込み中...";
    } else if (isHistoryLoading) {
      placeholderText = "履歴を読み込み中...";
    } else if (selectedTaskType === "GenerateSlideContent") { // ★ TaskType で判定
      placeholderText = "作成したいスライドの概要や指示を入力...";
    } else if (selectedTaskType === "GenerateTheme") { // ★ TaskType で判定
      placeholderText = "作成したいテーマの要望を入力 (例: 青系のクールなテーマ)...";
    } else { // GeneralConsultation
      placeholderText = "AIへの質問や相談を入力...";
    }

    return (
      <div className="border-t p-4">
        {/* --- ★ タスク選択UIを追加 --- */}
        <div className="mb-2 flex items-center justify-start space-x-1">
          <span className="text-xs text-muted-foreground mr-2">AIへの依頼:</span>
          <TooltipProvider delayDuration={100}>
            <ToggleGroup
              type="single"
              variant="outline"
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
                  {/* ★ value を GeminiTaskType に合わせる */}
                  <ToggleGroupItem value="GenerateSlideContent" aria-label="スライド作成">
                    <FileTextIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>スライド作成</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* ★ value を GeminiTaskType に合わせる */}
                  <ToggleGroupItem value="GenerateTheme" aria-label="テーマCSS生成">
                    <PaletteIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>テーマCSS生成</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* ★ value を GeminiTaskType に合わせる */}
                  <ToggleGroupItem value="GeneralConsultation" aria-label="相談・質問">
                    <MessageCircleIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>相談・質問</TooltipContent>
              </Tooltip>
            </ToggleGroup>
          </TooltipProvider>
        </div>
        {/* --- タスク選択UIここまで --- */}

        <div className="flex items-start gap-2">
          <Textarea
            id="chat-input"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={placeholderText} // ★ 動的に変更
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
