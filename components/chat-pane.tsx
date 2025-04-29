"use client";

import React from "react"; // React をインポート
import { useChat } from "@/hooks/use-chat"; // 作成したカスタムフックをインポート
import { ChatHeader } from "./chat-header"; // 作成したコンポーネントをインポート
import { ChatMessageList } from "./chat-message-list"; // 作成したコンポーネントをインポート
import { ChatInputArea } from "./chat-input-area"; // 作成したコンポーネントをインポート
import type { DocumentType } from "@/lib/types";
import { useDb } from "@/lib/db-context"; // isDbInitialized を取得するために必要

interface ChatPaneProps {
  currentDocument: DocumentType | null;
  onApplyToEditor: (content: string) => void;
}

export const ChatPane = React.memo(({ currentDocument, onApplyToEditor }: ChatPaneProps) => {
  const { isDbInitialized } = useDb(); // DB初期化状態を直接取得
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
    setViewportRef, // useChat から viewportRef を設定する関数を取得
  } = useChat({ currentDocument, onApplyToEditor }); // カスタムフックを使用

  return (
    <div className="flex h-full flex-col bg-background">
      <ChatHeader
        currentDocument={currentDocument}
        messages={messages}
        isLoading={isLoading}
        isHistoryLoading={isHistoryLoading}
        isDbInitialized={isDbInitialized} // isDbInitialized を渡す
        onClearChat={handleClearChat}
      />
      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        isHistoryLoading={isHistoryLoading}
        copiedStates={copiedStates}
        onCopyCode={handleCopyCode}
        onApplyCode={handleApplyCode}
        setViewportRef={setViewportRef} // viewportRef を設定する関数を渡す
      />
      <ChatInputArea
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        isHistoryLoading={isHistoryLoading}
        currentDocument={currentDocument}
        isDbInitialized={isDbInitialized} // isDbInitialized を渡す
      />
    </div>
  );
});

ChatPane.displayName = "ChatPane";
