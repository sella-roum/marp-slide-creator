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
  onApplyCustomCss: (css: string) => void; // ★ 追加
}

export const ChatPane = React.memo(({ currentDocument, onApplyToEditor, onApplyCustomCss }: ChatPaneProps) => { // ★ onApplyCustomCss を受け取る
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
  } = useChat({ currentDocument, onApplyToEditor, onApplyCustomCss }); // ★ onApplyCustomCss を渡す

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
      <ChatInputArea
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        isHistoryLoading={isHistoryLoading}
        currentDocument={currentDocument}
        isDbInitialized={isDbInitialized}
      />
    </div>
  );
});

ChatPane.displayName = "ChatPane";
