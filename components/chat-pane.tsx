// components/chat-pane.tsx
"use client";

import React from "react";
import { useChat } from "@/hooks/use-chat";
import { ChatHeader } from "./chat-header";
import { ChatMessageList } from "./chat-message-list";
import { ChatInputArea } from "./chat-input-area";
import type { DocumentType } from "@/lib/types";
import { useDb } from "@/lib/db-context";

interface ChatPaneProps {
  currentDocument: DocumentType | null;
  onApplyToEditor: (content: string) => void;
  onApplyCustomCss: (css: string) => void;
}

export const ChatPane = React.memo(({ currentDocument, onApplyToEditor, onApplyCustomCss }: ChatPaneProps) => {
  const { isDbInitialized } = useDb();
  // --- ▼ useChat から受け取るハンドラを更新 ▼ ---
  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isHistoryLoading,
    copiedStates,
    handleSendMessage,
    handleClearChat,
    handleCopyMarkdown, // 変更
    handleCopyCss,      // 追加
    handleApplyMarkdown,// 変更
    handleApplyCss,     // 追加
    setViewportRef,
    selectedTaskType,
    setSelectedTaskType,
  } = useChat({ currentDocument, onApplyToEditor, onApplyCustomCss });
  // --- ▲ useChat から受け取るハンドラを更新 ▲ ---

  return (
    <div className="flex h-full flex-col bg-background">
      <ChatHeader
        currentDocument={currentDocument}
        messages={messages}
        isLoading={isLoading}
        isHistoryLoading={isHistoryLoading}
        isDbInitialized={isDbInitialized}
        onClearChat={handleClearChat}
      />
      {/* --- ▼ ChatMessageList に渡す Props を更新 ▼ --- */}
      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        isHistoryLoading={isHistoryLoading}
        copiedStates={copiedStates}
        onCopyMarkdown={handleCopyMarkdown} // 渡す
        onCopyCss={handleCopyCss}          // 渡す
        onApplyMarkdown={handleApplyMarkdown} // 渡す
        onApplyCss={handleApplyCss}         // 渡す
        setViewportRef={setViewportRef}
      />
      {/* --- ▲ ChatMessageList に渡す Props を更新 ▲ --- */}
      <ChatInputArea
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        isHistoryLoading={isHistoryLoading}
        currentDocument={currentDocument}
        isDbInitialized={isDbInitialized}
        selectedTaskType={selectedTaskType}
        onTaskTypeChange={setSelectedTaskType}
      />
    </div>
  );
});

ChatPane.displayName = "ChatPane";
