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
  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isHistoryLoading,
    copiedStates,
    handleSendMessage,
    handleClearChat,
    handleCopyCode,
    handleApplyCode,
    setViewportRef,
    selectedTaskType, // ★ 追加
    setSelectedTaskType, // ★ 追加
  } = useChat({ currentDocument, onApplyToEditor, onApplyCustomCss });

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
      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        isHistoryLoading={isHistoryLoading}
        copiedStates={copiedStates}
        onCopyCode={handleCopyCode}
        onApplyCode={handleApplyCode}
        setViewportRef={setViewportRef}
      />
      {/* --- ▼ ChatInputArea に Props を渡す ▼ --- */}
      <ChatInputArea
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        isHistoryLoading={isHistoryLoading}
        currentDocument={currentDocument}
        isDbInitialized={isDbInitialized}
        selectedTaskType={selectedTaskType} // ★ 追加
        onTaskTypeChange={setSelectedTaskType} // ★ 追加
      />
      {/* --- ▲ ChatInputArea に Props を渡す ▲ --- */}
    </div>
  );
});

ChatPane.displayName = "ChatPane";
