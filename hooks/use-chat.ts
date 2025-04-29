"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  DocumentType,
  GeminiRequestType,
  GeminiResponseType,
  ChatMessageType,
} from "@/lib/types";
import { addChatMessage, getChatMessages, clearChatMessages } from "@/lib/db";
import { useDb } from "@/lib/db-context";
import { v4 as uuidv4 } from "uuid"; // uuid をインポート
import { useErrorHandler } from "@/hooks/use-error-handler"; // ★ インポート

interface UseChatProps {
  currentDocument: DocumentType | null;
  onApplyToEditor: (content: string) => void;
}

export function useChat({ currentDocument, onApplyToEditor }: UseChatProps) {
  const { isDbInitialized } = useDb();
  const { handleError } = useErrorHandler(); // ★ エラーハンドラフックを使用
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const viewportRef = useRef<HTMLDivElement | null>(null); // ChatMessageList で設定される想定

  // ScrollArea の Viewport を取得するための Ref を設定する関数
  const setViewportRef = useCallback((element: HTMLDivElement | null) => {
    viewportRef.current = element;
  }, []);

  // メッセージ追加時に一番下にスクロール
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    setTimeout(() => {
      if (viewportRef.current) {
        viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior });
      }
    }, 100);
  }, []);

  // ドキュメント変更時にチャット履歴を読み込む
  useEffect(() => {
    const loadHistory = async () => {
      if (!isDbInitialized) {
        console.log("useChat: DB not initialized, skipping history load.");
        setIsHistoryLoading(false);
        setMessages([]);
        return;
      }

      if (currentDocument?.id) {
        setIsHistoryLoading(true);
        setMessages([]);
        console.log(`Loading chat history for document: ${currentDocument.id}`);
        try {
          const history = await getChatMessages(currentDocument.id);
          setMessages(history);
          scrollToBottom("auto");
        } catch (error) {
          handleError({ error, context: "チャット履歴の読み込み" }); // ★ 共通ハンドラを使用
        } finally {
          setIsHistoryLoading(false);
        }
      } else {
        setMessages([]);
        setIsHistoryLoading(false);
        console.log("No current document or document ID, clearing chat history.");
      }
    };
    loadHistory();
  }, [currentDocument?.id, scrollToBottom, isDbInitialized, handleError]); // ★ handleError を依存配列に追加

  // 新しいメッセージをDBに保存する関数
  const saveMessage = useCallback(
    async (message: Omit<ChatMessageType, "id">) => {
      if (!isDbInitialized || !currentDocument?.id) return;
      try {
        await addChatMessage({ ...message, documentId: currentDocument.id });
      } catch (error) {
        handleError({ error, context: "チャットメッセージの保存" }); // ★ 共通ハンドラを使用
      }
    },
    [currentDocument?.id, isDbInitialized, handleError] // ★ handleError を依存配列に追加
  );

  // メッセージ送信処理
  const handleSendMessage = useCallback(async () => {
    const prompt = inputValue.trim();
    if (!prompt || isLoading || !currentDocument?.id || !isDbInitialized) return;

    const newUserMessage: Omit<ChatMessageType, "id"> = {
      role: "user",
      content: prompt,
      timestamp: new Date(),
      documentId: currentDocument.id,
    };

    // UUID を使って仮のIDを付与
    const tempUserMessageId = uuidv4();
    setMessages((prev) => [...prev, { ...newUserMessage, id: tempUserMessageId }]);
    setInputValue("");
    setIsLoading(true);
    scrollToBottom();

    await saveMessage(newUserMessage); // DBにはIDなしで保存 (db.ts側でUUID付与)

    try {
      const requestBody: GeminiRequestType = {
        prompt: prompt,
        context: { currentMarkdown: currentDocument.content || "" },
      };

      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data: GeminiResponseType = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "AIからの応答取得に失敗しました。");
      }

      if (data.result) {
        const newAssistantMessage: Omit<ChatMessageType, "id"> = {
          role: "assistant",
          content: data.result.text,
          markdownCode: data.result.markdownCode,
          timestamp: new Date(),
          documentId: currentDocument.id,
        };
        // UUID を使って仮のIDを付与
        const tempAssistantMessageId = uuidv4();
        setMessages((prev) => [...prev, { ...newAssistantMessage, id: tempAssistantMessageId }]);
        await saveMessage(newAssistantMessage); // DBにはIDなしで保存
      } else {
        throw new Error("AIからの応答が空でした。");
      }
    } catch (error) {
      // console.error は handleError 内で行われる
      const errorContent = `エラー: ${error instanceof Error ? error.message : "AIとの通信中にエラーが発生しました。"}`;
      handleError({ error, context: "AI応答の取得", userMessage: errorContent }); // ★ userMessage を指定
      const errorMessage: Omit<ChatMessageType, "id"> = {
        role: "system",
        content: errorContent,
        timestamp: new Date(),
        documentId: currentDocument.id,
      };
      // UUID を使って仮のIDを付与
      const tempErrorMessageId = uuidv4();
      setMessages((prev) => [...prev, { ...errorMessage, id: tempErrorMessageId }]);
      await saveMessage(errorMessage); // DBにはIDなしで保存
    } finally {
      setIsLoading(false);
      document.getElementById("chat-input")?.focus();
      scrollToBottom();
    }
  }, [
    inputValue,
    isLoading,
    currentDocument,
    isDbInitialized,
    saveMessage,
    scrollToBottom,
    handleError, // ★ handleError を依存配列に追加
  ]);

  // チャット履歴クリア処理
  const handleClearChat = useCallback(async () => {
    if (!isDbInitialized || !currentDocument?.id) return;
    try {
      await clearChatMessages(currentDocument.id);
      setMessages([]);
      // toast({ title: "チャット履歴をクリアしました" }); // 成功時のトーストは任意
    } catch (error) {
      handleError({ error, context: "チャット履歴のクリア" }); // ★ 共通ハンドラを使用
    }
  }, [currentDocument?.id, isDbInitialized, handleError]); // ★ handleError を依存配列に追加

  // コードをクリップボードにコピー
  const handleCopyCode = useCallback(
    (code: string | null | undefined, messageId: string) => {
      if (!code) return;
      navigator.clipboard
        .writeText(code)
        .then(() => {
          setCopiedStates((prev) => ({ ...prev, [messageId]: true }));
          // toast({ title: "コードをコピーしました" }); // 成功時のトーストは任意
          setTimeout(() => {
            setCopiedStates((prev) => ({ ...prev, [messageId]: false }));
          }, 2000);
        })
        .catch((err) => {
          handleError({ error: err, context: "コードのコピー" }); // ★ 共通ハンドラを使用
        });
    },
    [handleError] // ★ handleError を依存配列に追加
  );

  // コードをエディタに適用
  const handleApplyCode = useCallback(
    (codeToApply: string | null | undefined) => {
      if (codeToApply) {
        onApplyToEditor(codeToApply);
        // toast({ title: "抽出されたコードをエディタに適用しました" }); // 成功時のトーストは任意
      } else {
        // エラーではなく、適用できるコードがない場合の警告
        console.warn("Attempted to apply code, but no markdown code was found in the message.");
      }
    },
    [onApplyToEditor]
  );

  return {
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
    setViewportRef, // viewportRef を設定するための関数を返す
  };
}
