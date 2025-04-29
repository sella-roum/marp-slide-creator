"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type {
  DocumentType,
  GeminiRequestType,
  GeminiResponseType,
  ChatMessageType,
} from "@/lib/types";
import { addChatMessage, getChatMessages, clearChatMessages } from "@/lib/db";
import { useDb } from "@/lib/db-context";
import { v4 as uuidv4 } from "uuid"; // uuid をインポート

interface UseChatProps {
  currentDocument: DocumentType | null;
  onApplyToEditor: (content: string) => void;
}

export function useChat({ currentDocument, onApplyToEditor }: UseChatProps) {
  const { toast } = useToast();
  const { isDbInitialized } = useDb();
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
          console.error("Failed to load chat history:", error);
          toast({
            title: "エラー",
            description: "チャット履歴の読み込みに失敗しました。",
            variant: "destructive",
          });
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
  }, [currentDocument?.id, toast, scrollToBottom, isDbInitialized]);

  // 新しいメッセージをDBに保存する関数
  const saveMessage = useCallback(
    async (message: Omit<ChatMessageType, "id">) => {
      if (!isDbInitialized || !currentDocument?.id) return;
      try {
        await addChatMessage({ ...message, documentId: currentDocument.id });
      } catch (error) {
        console.error("Failed to save chat message:", error);
        toast({
          title: "エラー",
          description: "チャットメッセージの保存に失敗しました。",
          variant: "destructive",
        });
      }
    },
    [currentDocument?.id, toast, isDbInitialized]
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
      console.error("API Error:", error);
      const errorContent = `エラー: ${error instanceof Error ? error.message : "AIとの通信中にエラーが発生しました。"}`;
      toast({ title: "エラー", description: errorContent, variant: "destructive" });
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
    toast,
    saveMessage,
    scrollToBottom,
  ]);

  // チャット履歴クリア処理
  const handleClearChat = useCallback(async () => {
    if (!isDbInitialized || !currentDocument?.id) return;
    try {
      await clearChatMessages(currentDocument.id);
      setMessages([]);
      toast({ title: "チャット履歴をクリアしました" });
    } catch (error) {
      console.error("Failed to clear chat history:", error);
      toast({
        title: "エラー",
        description: "チャット履歴のクリアに失敗しました。",
        variant: "destructive",
      });
    }
  }, [currentDocument?.id, toast, isDbInitialized]);

  // コードをクリップボードにコピー
  const handleCopyCode = useCallback(
    (code: string | null | undefined, messageId: string) => {
      if (!code) return;
      navigator.clipboard
        .writeText(code)
        .then(() => {
          setCopiedStates((prev) => ({ ...prev, [messageId]: true }));
          toast({ title: "コードをコピーしました" });
          setTimeout(() => {
            setCopiedStates((prev) => ({ ...prev, [messageId]: false }));
          }, 2000);
        })
        .catch((err) => {
          console.error("コピー失敗:", err);
          toast({ title: "コピーに失敗しました", variant: "destructive" });
        });
    },
    [toast]
  );

  // コードをエディタに適用
  const handleApplyCode = useCallback(
    (codeToApply: string | null | undefined) => {
      if (codeToApply) {
        onApplyToEditor(codeToApply);
        toast({ title: "抽出されたコードをエディタに適用しました" });
      } else {
        toast({
          title: "適用失敗",
          description: "応答からMarpコードを抽出できませんでした。",
          variant: "destructive",
        });
      }
    },
    [onApplyToEditor, toast]
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
